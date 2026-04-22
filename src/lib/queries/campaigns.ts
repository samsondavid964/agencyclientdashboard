import { createClient } from "@/lib/supabase/server";
import type { CampaignMetric } from "@/lib/types/database";

// ── Campaign trend (multi-day) ─────────────────────────────────────────────

export type CampaignTrendRow = {
  date: string;
  campaign_id: string;
  campaign_name: string;
  cost: number | null;
  roas: number | null;
  conversions: number | null;
  cpa: number | null;
  clicks: number | null;
};

export async function getCampaignTrend(
  clientId: string,
  date: string,
  days: number = 30
): Promise<CampaignTrendRow[]> {
  const supabase = await createClient();

  const startDate = new Date(date + "T00:00:00");
  startDate.setDate(startDate.getDate() - (days - 1));
  const startStr = startDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_campaign_metrics")
    .select("date, campaign_id, campaign_name, cost, roas, conversions, cpa, clicks")
    .eq("client_id", clientId)
    .gte("date", startStr)
    .lte("date", date)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching campaign trend:", error);
    return [];
  }

  return (data as CampaignTrendRow[]) ?? [];
}

// ── Single-day campaign metrics ────────────────────────────────────────────

export async function getCampaignMetrics(
  clientId: string,
  date: string
): Promise<CampaignMetric[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_campaign_metrics")
    .select("*")
    .eq("client_id", clientId)
    .eq("date", date)
    .order("cost", { ascending: false });

  if (error) {
    console.error("Error fetching campaign metrics:", error);
    return [];
  }

  const rows = (data as CampaignMetric[]) ?? [];

  // Self-heal NULL campaign_type by looking up the most recent non-null value
  // per campaign_id (campaign_type is a stable property of a campaign).
  const missingIds = Array.from(
    new Set(rows.filter((r) => r.campaign_type == null).map((r) => r.campaign_id))
  );

  if (missingIds.length > 0) {
    const { data: fallback } = await supabase
      .from("daily_campaign_metrics")
      .select("campaign_id, campaign_type, date")
      .eq("client_id", clientId)
      .in("campaign_id", missingIds)
      .not("campaign_type", "is", null)
      .order("date", { ascending: false });

    const typeByCampaign = new Map<string, string>();
    for (const row of (fallback ?? []) as Array<{
      campaign_id: string;
      campaign_type: string | null;
    }>) {
      if (row.campaign_type && !typeByCampaign.has(row.campaign_id)) {
        typeByCampaign.set(row.campaign_id, row.campaign_type);
      }
    }

    for (const r of rows) {
      if (r.campaign_type == null) {
        const resolved = typeByCampaign.get(r.campaign_id);
        if (resolved) r.campaign_type = resolved;
      }
    }
  }

  return rows;
}
