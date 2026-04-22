import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signRecoveryToken } from "@/lib/utils/recovery-token";
import { rateLimitByIp } from "@/lib/utils/rate-limit";

// Only allow local path redirects. Rejects:
//   - protocol-relative URLs ("//evil.com/...")
//   - Windows-style path traversal ("/\\evil.com/...")
//   - absolute URLs ("https://evil.com/...")
//   - anything that doesn't start with "/"
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  try {
    // Resolve against a dummy origin; if the resulting origin doesn't match
    // the dummy, the input contained an authority component.
    const resolved = new URL(raw, "http://localhost");
    if (resolved.origin !== "http://localhost") return "/";
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return "/";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // H4: Rate-limit the callback endpoint itself. Without this, an attacker
  // with a stolen reset code (phishing of a reset email) could hit this
  // endpoint directly and mint `recovery_verified` with no throttle —
  // requestPasswordReset has its own limits but the callback did not.
  const rlOk = await rateLimitByIp("recovery_callback");
  if (!rlOk) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(
        "Too many attempts. Please try again later."
      )}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Special-case: if the magic link sends the user to /auth/reset-password,
      // they're in a recovery flow. We need to mint the `recovery_verified`
      // cookie here or the page will bounce them away and leave an authenticated
      // session that can reach any protected route. (Finding C1.)
      if (next === "/auth/reset-password") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const response = NextResponse.redirect(`${appUrl}/auth/reset-password`);
        if (user) {
          // H4: Set server-side pending_recovery marker too. A malicious
          // browser extension that deletes only the recovery_verified cookie
          // (keeping the auth-token cookie) would otherwise free the session
          // to roam protected routes. Middleware checks this row independently.
          try {
            const adminClient = createAdminClient();
            await adminClient.rpc("auth_pending_recovery_set", {
              p_user_id: user.id,
            });
          } catch {
            // Non-fatal — recovery_verified cookie is still the primary gate.
          }
          response.cookies.set("recovery_verified", signRecoveryToken(user.id), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 600,
          });
        }
        return response;
      }

      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${appUrl}/login?error=Could+not+authenticate`);
}
