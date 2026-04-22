import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseAuthCookieName } from "@/lib/utils/auth-cookies";

const PUBLIC_PATHS = ["/auth/callback", "/auth/verify", "/auth/forgot-password"];

const ADMIN_PATH_PREFIXES = ["/clients/new", "/settings"];

// Paths allowed while a session is in the "awaiting 2FA" state.
const PENDING_2FA_ALLOWED = ["/auth/verify", "/auth/callback", "/login", "/logout"];
// Paths allowed while a session is in the "recovery/reset-password" state.
const RECOVERY_ALLOWED = ["/auth/reset-password", "/auth/callback", "/login", "/logout"];

// Flow cookies created by server actions / callback route. Cleared on any
// forced re-auth (idle timeout, absolute timeout, explicit logout path).
const FLOW_COOKIES = [
  "pending_2fa",
  "pending_2fa_email",
  "pending_signup_email",
  "pending_recovery_email",
  "recovery_verified",
  "signup_pending_email",
  "last_active_at",
];

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT_SEC = 24 * 60 * 60; // 24 hours
const LAST_ACTIVE_MAX_AGE = 30 * 60; // 30 minutes — matches idle window

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
  if (ADMIN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (/^\/clients\/[^/]+\/edit(\/|$)/.test(pathname)) return true;
  return false;
}

function isAllowedWhenPending2fa(pathname: string): boolean {
  return PENDING_2FA_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAllowedWhenRecovering(pathname: string): boolean {
  return RECOVERY_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Deletes Supabase auth cookies from the browser via response headers.
// Iterates all request cookies and matches against the stable Supabase
// pattern (isSupabaseAuthCookieName) — does not depend on NEXT_PUBLIC_SUPABASE_URL
// being present/parseable at runtime.
function deleteAuthCookies(request: NextRequest, response: NextResponse): void {
  request.cookies
    .getAll()
    .filter((c) => isSupabaseAuthCookieName(c.name))
    .forEach((c) => response.cookies.delete(c.name));
}

function deleteFlowCookies(response: NextResponse): void {
  FLOW_COOKIES.forEach((name) => response.cookies.delete(name));
}

// Decide whether a thrown error is a transient platform issue (5xx, network,
// DNS, timeout) versus a genuine auth failure (expired refresh token, invalid
// JWT, 401/403). Fail-closed: the default for unknown throws is to treat them
// as an auth failure (clear cookies, force re-auth). Transient cases must
// match an explicit allowlist below — genuine JWT tampering or Supabase
// internal errors that surface as non-standard throws should NOT pass through
// with the user's existing cookies still attached.
function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    status?: number;
    code?: string;
    name?: string;
    message?: string;
    cause?: { code?: string };
  };

  // Clear auth-failure signals → NOT transient.
  if (e.status === 401 || e.status === 403) return false;
  const authKeywords = ["invalid_token", "refresh_token", "expired", "jwt"];
  const hay = `${e.code ?? ""} ${e.name ?? ""} ${e.message ?? ""}`.toLowerCase();
  if (authKeywords.some((kw) => hay.includes(kw))) return false;

  // 5xx, fetch/network, DNS → transient.
  if (typeof e.status === "number" && e.status >= 500) return true;
  if (e.name === "FetchError" || e.name === "AbortError" || e.name === "TypeError") return true;
  const networkCauses = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"];
  if (e.cause?.code && networkCauses.includes(e.cause.code)) return true;

  // Default: fail-closed. Unknown throws are treated as auth failures so
  // potentially tampered JWTs or unexpected error shapes do not silently
  // pass through with stale cookies intact.
  return false;
}

function decodeJwtIat(accessToken: string | undefined | null): number | null {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof payload?.iat === "number" ? payload.iat : null;
  } catch {
    return null;
  }
}

function makeSupabaseClient(request: NextRequest, responseRef: { current: NextResponse }) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          responseRef.current = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            responseRef.current.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}

function forceReauthResponse(request: NextRequest, errorMessage: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${encodeURIComponent(errorMessage)}`;
  const response = NextResponse.redirect(url);
  deleteAuthCookies(request, response);
  deleteFlowCookies(response);
  return response;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // /login and /signup: redirect already-signed-in users to /, UNLESS the
  // session is awaiting 2FA — in that case route them to /auth/verify.
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    const pending2fa = request.cookies.get("pending_2fa")?.value;
    if (pending2fa) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verify";
      url.search = "?type=magiclink";
      return NextResponse.redirect(url);
    }

    try {
      const responseRef = { current: NextResponse.next({ request }) };
      const supabase = makeSupabaseClient(request, responseRef);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    } catch {
      // Session check failed — let them through to login
    }
    return NextResponse.next({ request });
  }

  // Other public paths pass through without Supabase interaction.
  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  const responseRef = { current: NextResponse.next({ request }) };

  try {
    const supabase = makeSupabaseClient(request, responseRef);

    // Refresh session — do not remove this
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Unauthenticated user on a protected route → redirect to login.
    // Clear auth cookies so stale cookies aren't resent on subsequent requests.
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      deleteAuthCookies(request, redirectResponse);
      deleteFlowCookies(redirectResponse);
      return redirectResponse;
    }

    // C1: server-side pending-2fa gate. Binds to user_id, independent of the
    // `pending_2fa` cookie TTL. Cookie is a UX cache; this is truth. If the
    // row has aged out, the pending window expired with no OTP — kill the
    // underlying session globally so the attacker can't resume.
    const PENDING_2FA_MAX_AGE_SEC = 600;
    let dbPendingAgeSec: number | null = null;
    try {
      const { data: ageData } = await supabase.rpc("auth_my_pending_2fa_age");
      if (typeof ageData === "number") dbPendingAgeSec = ageData;
    } catch {
      // If the RPC lookup fails, fall through to the cookie-only check below.
    }
    if (dbPendingAgeSec !== null && dbPendingAgeSec >= PENDING_2FA_MAX_AGE_SEC) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        await admin.auth.admin.signOut(user.id, "global");
        await admin.rpc("auth_pending_2fa_clear", { p_user_id: user.id });
      } catch {
        // Non-fatal — cookie + session cleanup below still logs the user out.
      }
      return forceReauthResponse(
        request,
        "Your session has expired. Please sign in again."
      );
    }
    if (dbPendingAgeSec !== null && !isAllowedWhenPending2fa(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verify";
      url.search = "?type=magiclink";
      return NextResponse.redirect(url);
    }

    // Gate 2FA sessions: if pending_2fa cookie is set, only allow verify/callback/login/logout.
    const pending2fa = request.cookies.get("pending_2fa")?.value;
    if (pending2fa && !isAllowedWhenPending2fa(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/verify";
      url.search = "?type=magiclink";
      return NextResponse.redirect(url);
    }

    // H4: server-side pending-recovery gate. Mirrors the pending_2fa pattern:
    // binds to user_id independent of the recovery_verified cookie TTL. Cookie
    // is a UX cache; this row is truth. If the row has aged out, the recovery
    // window expired with no password update — kill the session globally.
    const PENDING_RECOVERY_MAX_AGE_SEC = 600;
    let dbPendingRecoverySec: number | null = null;
    try {
      const { data: recAgeData } = await supabase.rpc(
        "auth_my_pending_recovery_age"
      );
      if (typeof recAgeData === "number") dbPendingRecoverySec = recAgeData;
    } catch {
      // If the RPC lookup fails, fall through to the cookie-only check below.
    }
    if (
      dbPendingRecoverySec !== null &&
      dbPendingRecoverySec >= PENDING_RECOVERY_MAX_AGE_SEC
    ) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        await admin.auth.admin.signOut(user.id, "global");
        await admin.rpc("auth_pending_recovery_clear", { p_user_id: user.id });
      } catch {
        // Non-fatal.
      }
      return forceReauthResponse(
        request,
        "Your session has expired. Please sign in again."
      );
    }
    if (
      dbPendingRecoverySec !== null &&
      !isAllowedWhenRecovering(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/reset-password";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Gate recovery sessions: if recovery_verified cookie is set, only allow
    // reset-password/callback/login/logout.
    const recoveryVerified = request.cookies.get("recovery_verified")?.value;
    if (recoveryVerified && !isAllowedWhenRecovering(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/reset-password";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Idle timeout: if last activity was more than IDLE_TIMEOUT_MS ago, force
    // re-auth. M8: this runs even during pending_2fa / recovery flows. The
    // flow-specific short-lived cookies (pending_2fa, recovery_verified) and
    // the DB-backed pending-2fa / pending-recovery age checks above handle
    // window-expiry for those flows, but the underlying session still needs
    // idle+absolute enforcement — otherwise a user parked on /auth/verify
    // could sit for hours and both idle and 24h absolute checks would never
    // fire.
    const lastActiveRaw = request.cookies.get("last_active_at")?.value;
    if (lastActiveRaw) {
      const lastActive = Number(lastActiveRaw);
      if (Number.isFinite(lastActive) && Date.now() - lastActive > IDLE_TIMEOUT_MS) {
        return forceReauthResponse(
          request,
          "Your session has expired. Please sign in again."
        );
      }
    }

    // Absolute timeout: decode access-token iat; if > 24h old, force re-auth.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const iat = decodeJwtIat(session?.access_token);
    if (iat && Math.floor(Date.now() / 1000) - iat > ABSOLUTE_TIMEOUT_SEC) {
      return forceReauthResponse(
        request,
        "Your session has expired. Please sign in again."
      );
    }

    // Role-gate admin routes (defense in depth alongside requireAdmin() per-action)
    if (isAdminPath(pathname)) {
      const role = (user.app_metadata as { role?: string } | null)?.role;
      if (role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/forbidden";
        return NextResponse.redirect(url);
      }
    }

    // Refresh the idle timer on every successful request. M7: sameSite "lax"
    // (not "strict") so top-level navigations from external sites (email,
    // Slack, Teams) carry the cookie — otherwise the first external entry
    // would arrive with last_active_at missing and silently reset the idle
    // clock on every bounce. "lax" still blocks cross-site form POSTs.
    responseRef.current.cookies.set("last_active_at", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: LAST_ACTIVE_MAX_AGE,
    });

    return responseRef.current;
  } catch (error) {
    // Distinguish auth failures (clear cookies, redirect) from transient
    // infra issues (pass through without clearing — stale cookies remain
    // valid once Supabase recovers).
    if (isTransientError(error)) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    deleteAuthCookies(request, redirectResponse);
    deleteFlowCookies(redirectResponse);
    return redirectResponse;
  }
}
