"use server";

import { getCompareClients } from "@/lib/queries/compare";
import type { CompareClientRow } from "@/lib/queries/compare";
import { getAuthenticatedUser } from "@/lib/utils/auth";
import { filterAccessibleClientIds } from "@/lib/utils/client-access";

/**
 * Server action: fetch comparison data for given client IDs and date.
 * No admin gate — all authenticated users can compare clients, but non-admins
 * can only see clients they own. Requested-but-unowned clients are silently
 * dropped (logged for audit) so the UI just shows fewer tiles.
 */
export async function fetchComparisonData(
  clientIds: string[],
  date: string
): Promise<CompareClientRow[]> {
  // Ensure the user is authenticated (getAuthenticatedUser redirects if not)
  const user = await getAuthenticatedUser();

  const accessible = await filterAccessibleClientIds(user, clientIds);

  if (accessible.length !== clientIds.length) {
    const removed = clientIds.length - accessible.length;
    console.warn(
      `[compare] access filter removed ${removed} clients`,
      { userId: user.id, requested: clientIds, allowed: accessible }
    );
  }

  if (accessible.length === 0) return [];

  return getCompareClients(accessible, date);
}
