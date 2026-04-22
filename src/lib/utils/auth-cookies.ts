// Safe for Edge runtime — no Node built-ins. Imported by middleware.

// All sb-*-auth-token cookies Supabase sets follow the same prefix pattern
// but the project ref can change (env edit, CI preview, etc). Rather than
// derive it from NEXT_PUBLIC_SUPABASE_URL (which silently fails if the env
// var is missing or malformed), we match any cookie whose name matches the
// stable Supabase pattern. The middle segment is "anything non-empty" — the
// trailing `-auth-token(\.\d+)?$` anchor disambiguates, so a greedy `.+` is
// safe even if a future project ref contains dots (preview branches, custom
// domains).
const SB_AUTH_COOKIE_RE = /^sb-.+-auth-token(\.\d+)?$/;

export function isSupabaseAuthCookieName(name: string): boolean {
  return SB_AUTH_COOKIE_RE.test(name);
}
