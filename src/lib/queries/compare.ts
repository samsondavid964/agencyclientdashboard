import { createClient } from "@/lib/supabase/server";

export type SelectorClient = {
  id: string;
  client_name: string;
  store_name: string | null;
  logo_url: string | null;
};

export type CompareClientRow = {
  id: string;
  client_name: string;
  store_name: string | null;
  logo_url: string | null;
  mb_assigned: string | null;
  monthly_budget: number | null;
  roas_target: number | null;
  weighted_total: number | null;
  spend_pacing_score: number | null;
  cpa_score: number | null;
  conv_quality_score: number | null;
  cost: number | null;
  roas: number | null;
  cpa: number | null;
  conversions: number | null;
  conversion_value: number | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  mtd_cost: number | null;
};

/**
 * Returns all active clients with the minimal fields needed for the selector dropdown.
 */
export async function getAllClientsForSelector(): Promise<SelectorClient[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id, client_name, store_name, logo_url")
    .eq("client_status", "active")
    .order("client_name");

  if (error) {
    console.error("getAllClientsForSelector error:", error);
    return [];
  }

  return (data ?? []) as SelectorClient[];
}

/**
 * Fetches client config + health scores + daily metrics for the given client IDs and date.
 * Tables are fetched in parallel and merged in JS to avoid a complex SQL join.
 */
export async function getCompareClients(
  clientIds: string[],
  date: string
): Promise<CompareClientRow[]> {
  if (clientIds.length === 0) return [];

  const supabase = await createClient();

  // Fetch all three tables in parallel
  const [clientsRes, scoresRes, metricsRes] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, client_name, store_name, logo_url, mb_assigned, monthly_budget, roas_target"
      )
      .in("id", clientIds),
    supabase
      .from("daily_health_scores")
      .select(
        "client_id, weighted_total, spend_pacing_score, cpa_score, conv_quality_score"
      )
      .in("client_id", clientIds)
      .eq("date", date),
    supabase
      .from("daily_metrics")
      .select(
        "client_id, cost, roas, cpa, conversions, conversion_value, clicks, impressions, ctr, mtd_cost"
      )
      .in("client_id", clientIds)
      .eq("date", date),
  ]);

  if (clientsRes.error) {
    console.error("getCompareClients clients error:", clientsRes.error);
    return [];
  }

  // Build lookup maps for scores and metrics
  const scoresMap = new Map(
    (scoresRes.data ?? []).map((s) => [s.client_id, s])
  );
  const metricsMap = new Map(
    (metricsRes.data ?? []).map((m) => [m.client_id, m])
  );

  // Preserve the order the caller requested
  const clientsById = new Map(
    (clientsRes.data ?? []).map((c) => [c.id, c])
  );

  return clientIds
    .filter((id) => clientsById.has(id))
    .map((id) => {
      const c = clientsById.get(id)!;
      const s = scoresMap.get(id);
      const m = metricsMap.get(id);

      return {
        id: c.id,
        client_name: c.client_name,
        store_name: c.store_name ?? null,
        logo_url: c.logo_url ?? null,
        mb_assigned: c.mb_assigned ?? null,
        monthly_budget: c.monthly_budget ?? null,
        roas_target: c.roas_target ?? null,
        weighted_total: s?.weighted_total ?? null,
        spend_pacing_score: s?.spend_pacing_score ?? null,
        cpa_score: s?.cpa_score ?? null,
        conv_quality_score: s?.conv_quality_score ?? null,
        cost: m?.cost ?? null,
        roas: m?.roas ?? null,
        cpa: m?.cpa ?? null,
        conversions: m?.conversions ?? null,
        conversion_value: m?.conversion_value ?? null,
        clicks: m?.clicks ?? null,
        impressions: m?.impressions ?? null,
        ctr: m?.ctr ?? null,
        mtd_cost: m?.mtd_cost ?? null,
      };
    });
}
