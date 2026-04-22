import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/auth/verify", "/auth/forgot-password", "/auth/reset-password"];

const ADMIN_PATH_PREFIXES = ["/clients/new", "/settings"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
  if (ADMIN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (/^\/clients\/[^/]+\/edit(\/|$)/.test(pathname)) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public paths always pass through — no Supabase interaction needed.
  // This prevents redirect loops when credentials are invalid/missing.
  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session — do not remove this
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Unauthenticated user on a protected route → redirect to login
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
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

    return supabaseResponse;
  } catch {
    // If Supabase client fails (bad credentials, network), redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}
