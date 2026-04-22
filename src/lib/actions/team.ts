"use server";

import { requireAdmin } from "@/lib/utils/auth";
import { getUserActivity, type UserActivityEntry } from "@/lib/queries/team";

export async function fetchUserActivity(
  email: string,
  days: number
): Promise<UserActivityEntry[]> {
  await requireAdmin();
  return getUserActivity(email, days);
}
