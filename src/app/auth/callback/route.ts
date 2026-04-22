import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate`);
}
