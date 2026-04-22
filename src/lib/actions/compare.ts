"use server";

import { getCompareClients } from "@/lib/queries/compare";
import type { CompareClientRow } from "@/lib/queries/compare";
import { getAuthenticatedUser } from "@/lib/utils/auth";

/**
 * Server action: fetch comparison data for given client IDs and date.
 * No admin gate — all authenticated users can compare clients.
 */
export async function fetchComparisonData(
  clientIds: string[],
  date: string
): Promise<CompareClientRow[]> {
  // Ensure the user is authenticated (getAuthenticatedUser redirects if not)
  await getAuthenticatedUser();
  return getCompareClients(clientIds, date);
}
