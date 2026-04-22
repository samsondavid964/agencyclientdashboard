import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Request-scoped cached read of the current authenticated user.
 *
 * Wrapping in `React.cache` deduplicates the Supabase `auth.getUser()`
 * round-trip across Server Components that run in the same request
 * (e.g. layout + page + nested async components).
 */
export const getAuthenticatedUser = cache(async (): Promise<User> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export function isAdmin(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

export const requireAdmin = cache(async (): Promise<User> => {
  const user = await getAuthenticatedUser();

  // Defense-in-depth: JWT `app_metadata.role` can be stale if the admin was
  // demoted mid-session. setUserRole globally signs demoted users out, but
  // that call can fail or race. Re-query live role from auth.users on every
  // privileged action so a stale JWT cannot exercise admin power.
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(user.id);
    if (error || !data?.user) {
      console.error("[requireAdmin] live role lookup failed", {
        user_id: user.id,
        error: error?.message,
      });
      redirect("/forbidden");
    }
    const liveRole =
      (data.user.app_metadata as { role?: string } | null)?.role ?? "member";
    if (liveRole !== "admin") {
      if (isAdmin(user)) {
        // JWT says admin but DB says otherwise — stale token. Log for audit.
        console.warn(
          "[requireAdmin] stale admin JWT rejected",
          JSON.stringify({ user_id: user.id, jwt_role: "admin", live_role: liveRole })
        );
      }
      redirect("/forbidden");
    }
  } catch (err) {
    // If the admin-client lookup itself throws (e.g. service-role key missing
    // in a misconfigured env), fail closed. `redirect()` throws a special
    // signal, so re-throw that but catch anything else → /forbidden.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[requireAdmin] live role lookup threw", err);
    redirect("/forbidden");
  }

  return user;
});
