import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Client, HomepageClient, HomepageSummary } from "@/lib/types/database";
import { INSUFFICIENT_HISTORY_DAYS } from "@/lib/utils/health-score";

// Shape returned by getHomepageInsights / get_homepage_insights RPC
export interface HomepageInsightsPerformer {
  id: string;
  client_name: string;
  store_name: string | null;
  avg_7d_score: number;
}

export interface HomepageInsightsDrop {
  id: string;
  client_name: string;
  store_name: string | null;
  avg_7d_score: number;
  score_delta: number;
}

export interface HomepageInsights {
  total_spend_today: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  top_performer: HomepageInsightsPerformer | null;
  needs_attention: HomepageInsightsPerformer | null;
  biggest_droppers: HomepageInsightsDrop[];
}

/**
 * Fetches a single client by ID.
 */
export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getClientById error:", error);
    return null;
  }

  return data as Client | null;
}

interface HomepageClientParams {
  date: string; // YYYY-MM-DD
  status?: string;
  mb?: string;
  search?: string;
}

/**
 * Inner implementation with individual primitive args so React.cache() can
 * deduplicate identical calls (e.g. SummarySection + ClientSection) within
 * a single request. cache() uses === per arg — objects would never match.
 */
const _fetchHomepageClients = cache(async (
  date: string,
  status: string | null,
  mb: string | null,
  search: string | null,
): Promise<HomepageClient[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_homepage_clients", {
    p_date: date,
    p_status: status,
    p_mb: mb,
    p_search: search,
  });

  if (error) {
    console.error("get_homepage_clients error:", error);
    throw new Error(`Failed to load clients: ${error.message}`);
  }

  return (data as HomepageClient[]) ?? [];
});

/**
 * Fetches all clients with their 7-day avg score, previous 7-day avg,
 * yesterday's spend/MTD, and history_days via the get_homepage_clients() RPC.
 * Deduplicated within a request via React.cache().
 */
export async function getHomepageClients(
  params: HomepageClientParams
): Promise<HomepageClient[]> {
  return _fetchHomepageClients(
    params.date,
    params.status || null,
    params.mb || null,
    params.search || null,
  );
}

/**
 * Counts distinct daily_metrics dates for a single client up to endDate
 * via the get_client_history_days() RPC.
 */
export const getClientHistoryDays = cache(async (
  clientId: string,
  endDate: string,
): Promise<number> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_history_days", {
    p_client_id: clientId,
    p_date: endDate,
  });

  if (error) {
    console.error("get_client_history_days error:", error);
    return 0;
  }

  return (data as number) ?? 0;
});

/**
 * Returns the count of alerts for a given date.
 */
export async function getAlertCountForDate(date: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("alert_log")
    .select("*", { count: "exact", head: true })
    .eq("date", date);

  if (error) {
    console.error("getAlertCountForDate error:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Returns distinct media buyer values for the filter dropdown.
 */
export async function getDistinctMediaBuyers(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("mb_assigned")
    .not("mb_assigned", "is", null)
    .order("mb_assigned");

  if (error) {
    console.error("getDistinctMediaBuyers error:", error);
    return [];
  }

  // Deduplicate
  const unique = [...new Set((data ?? []).map((r) => r.mb_assigned as string))];
  return unique.filter(Boolean);
}

/**
 * Fleet-wide summary for the top banner. Always computed against the
 * UNFILTERED fleet for a given date so the KPIs reflect the full book of
 * business, regardless of whatever status/mb/search filters the user has
 * applied to the grid below. Wrapped in React.cache() so it dedupes with
 * other identical calls within the same request.
 */
export const getFleetSummary = cache(
  async (date: string): Promise<HomepageSummary> => {
    const clients = await _fetchHomepageClients(date, null, null, null);
    const alertsToday = await getAlertCountForDate(date);
    return deriveSummaryFromClients(clients, alertsToday);
  },
);

/**
 * Unfiltered fetch of all clients for a given date. Used by page.tsx to fetch
 * the full fleet once, then apply status/mb/search filtering in TypeScript so
 * fleet-wide insights and the filtered grid share a single Supabase call.
 */
export function getAllClientsForDate(date: string): Promise<HomepageClient[]> {
  return _fetchHomepageClients(date, null, null, null);
}

/**
 * Fleet-wide insights (distribution, top/bottom performer, biggest droppers).
 * Attempts the get_homepage_insights RPC first; falls back to TypeScript
 * computation from the cached fleet fetch so no extra Supabase round-trip occurs
 * if the RPC is not yet deployed.
 */
export async function getHomepageInsights(
  date: string,
  allClients: HomepageClient[],
): Promise<HomepageInsights> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_homepage_insights", {
    p_date: date,
  });

  if (!error && data) {
    return data as HomepageInsights;
  }

  // Fallback: compute from the already-fetched allClients array
  return computeInsightsFallback(allClients);
}

/** Pure TypeScript fallback — mirrors the SQL logic in migration 029. */
function computeInsightsFallback(clients: HomepageClient[]): HomepageInsights {
  const active = clients.filter((c) => c.client_status === "active");

  const totalSpendToday = active.reduce(
    (sum, c) => sum + (c.today_spend ?? 0),
    0,
  );

  const scored = clients.filter((c) => c.avg_7d_score != null);
  const activeScored = active.filter((c) => c.avg_7d_score != null);

  const healthyCount = activeScored.filter((c) => (c.avg_7d_score ?? 0) >= 70).length;
  const warningCount = activeScored.filter(
    (c) => (c.avg_7d_score ?? 0) >= 60 && (c.avg_7d_score ?? 0) < 70,
  ).length;
  const criticalCount = activeScored.filter((c) => (c.avg_7d_score ?? 0) < 60).length;

  const sortedDesc = [...scored].sort(
    (a, b) => (b.avg_7d_score ?? 0) - (a.avg_7d_score ?? 0),
  );
  const top = sortedDesc[0] ?? null;
  const topPerformer: HomepageInsightsPerformer | null = top
    ? { id: top.id, client_name: top.client_name, store_name: top.store_name ?? null, avg_7d_score: top.avg_7d_score! }
    : null;

  const bottom = sortedDesc[sortedDesc.length - 1] ?? null;
  // Only surface needs_attention when it's a different client from topPerformer
  // AND the score is genuinely below 70 — prevents a single-client fleet from
  // listing the same client as both best and worst.
  const needsAttention: HomepageInsightsPerformer | null =
    bottom && top && bottom.id !== top.id && (bottom.avg_7d_score ?? 0) < 70
      ? { id: bottom.id, client_name: bottom.client_name, store_name: bottom.store_name ?? null, avg_7d_score: bottom.avg_7d_score! }
      : null;

  const SIGNIFICANT_DROP = 5;
  const biggestDroppers: HomepageInsightsDrop[] = clients
    .filter((c) => c.avg_7d_score != null && c.prev_7d_score != null)
    .map((c) => ({
      id: c.id,
      client_name: c.client_name,
      store_name: c.store_name ?? null,
      avg_7d_score: c.avg_7d_score!,
      score_delta: (c.avg_7d_score ?? 0) - (c.prev_7d_score ?? 0),
    }))
    .filter((c) => c.score_delta <= -SIGNIFICANT_DROP)
    .sort((a, b) => a.score_delta - b.score_delta)
    .slice(0, 3);

  return {
    total_spend_today: totalSpendToday,
    healthy_count: healthyCount,
    warning_count: warningCount,
    critical_count: criticalCount,
    top_performer: topPerformer,
    needs_attention: needsAttention,
    biggest_droppers: biggestDroppers,
  };
}

/**
 * Pure function: derives summary card data from the homepage clients array.
 * No DB call needed — computed from the already-fetched data.
 */
export function deriveSummaryFromClients(
  clients: HomepageClient[],
  alertsToday: number
): HomepageSummary {
  const activeClients = clients.filter(
    (c) => c.client_status === "active"
  );

  const scoresArray = activeClients
    .map((c) => c.avg_7d_score)
    .filter((s): s is number => s != null);

  const avgHealthScore =
    scoresArray.length > 0
      ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length
      : null;

  // Compute delta: current avg vs previous avg for clients that have both
  // AND sufficient history — otherwise the delta is noise from sparse data.
  const withBoth = activeClients.filter(
    (c) =>
      c.avg_7d_score != null &&
      c.prev_7d_score != null &&
      c.history_days >= INSUFFICIENT_HISTORY_DAYS,
  );
  let avgHealthScoreDelta: number | null = null;
  if (withBoth.length > 0) {
    const currentAvg =
      withBoth.reduce((a, c) => a + (c.avg_7d_score ?? 0), 0) /
      withBoth.length;
    const prevAvg =
      withBoth.reduce((a, c) => a + (c.prev_7d_score ?? 0), 0) /
      withBoth.length;
    avgHealthScoreDelta = currentAvg - prevAvg;
  }

  const clientsBelow70 = activeClients.filter(
    (c) => c.avg_7d_score != null && c.avg_7d_score < 70
  ).length;

  return {
    totalActive: activeClients.length,
    activeClients: activeClients.length,
    avgHealthScore,
    avgHealthScoreDelta,
    belowSeventy: clientsBelow70,
    clientsBelow70,
    alertsToday,
  };
}
