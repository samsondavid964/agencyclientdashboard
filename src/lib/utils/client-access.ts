import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/auth";

/**
 * App-layer authorization check: does this user have write access to this client?
 * Admins: yes. Others: must match one of the ownership columns on clients.
 *
 * This is defense-in-depth on top of RLS. An RLS regression alone must not be
 * enough to allow arbitrary client-id mutations via FormData.
 */
export async function hasClientAccess(user: User, clientId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("mb_user_id, csm_user_id, am_user_id, mb_assigned, csm_assigned, account_manager")
    .eq("id", clientId)
    .maybeSingle();
  if (error || !data) return false;
  const email = user.email?.toLowerCase() ?? null;
  return (
    data.mb_user_id === user.id ||
    data.csm_user_id === user.id ||
    data.am_user_id === user.id ||
    (email !== null && (
      data.mb_assigned?.toLowerCase() === email ||
      data.csm_assigned?.toLowerCase() === email ||
      data.account_manager?.toLowerCase() === email
    ))
  );
}

export async function filterAccessibleClientIds(user: User, clientIds: string[]): Promise<string[]> {
  if (isAdmin(user)) return clientIds;
  if (clientIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, mb_user_id, csm_user_id, am_user_id, mb_assigned, csm_assigned, account_manager")
    .in("id", clientIds);
  if (error || !data) return [];
  const email = user.email?.toLowerCase() ?? null;
  return data
    .filter((c) =>
      c.mb_user_id === user.id ||
      c.csm_user_id === user.id ||
      c.am_user_id === user.id ||
      (email !== null && (
        c.mb_assigned?.toLowerCase() === email ||
        c.csm_assigned?.toLowerCase() === email ||
        c.account_manager?.toLowerCase() === email
      ))
    )
    .map((c) => c.id);
}
