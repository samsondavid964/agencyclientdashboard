import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

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
  if (!isAdmin(user)) {
    redirect("/forbidden");
  }
  return user;
});
