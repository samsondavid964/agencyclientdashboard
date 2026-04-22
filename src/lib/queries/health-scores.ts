import { createClient } from "@/lib/supabase/server";
import type { HealthTrendRow } from "@/lib/types/database";

export async function getClientHealthTrend(
  clientId: string,
  date: string,
  days: number = 30
): Promise<HealthTrendRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_health_trend", {
    p_client_id: clientId,
    p_date: date,
    p_days: days,
  });

  if (error) {
    console.error("Error fetching health trend:", error);
    // Fallback: direct query if RPC not available
    return getClientHealthTrendFallback(clientId, date, days);
  }

  return (data as HealthTrendRow[]) ?? [];
}

async function getClientHealthTrendFallback(
  clientId: string,
  date: string,
  days: number
): Promise<HealthTrendRow[]> {
  const supabase = await createClient();

  // Calculate start date
  const endDate = new Date(date);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startStr = startDate.toISOString().split("T")[0];

  const { data: scores } = await supabase
    .from("daily_health_scores")
    .select(
      "date, weighted_total, spend_pacing_score, cpa_score, conv_quality_score, data_status"
    )
    .eq("client_id", clientId)
    .gte("date", startStr)
    .lte("date", date)
    .order("date", { ascending: true });

  if (!scores || scores.length === 0) return [];

  // Fetch matching metrics for annotations
  const { data: metrics } = await supabase
    .from("daily_metrics")
    .select("date, pacing_variance, cpa, roas, aov")
    .eq("client_id", clientId)
    .gte("date", startStr)
    .lte("date", date);

  const metricsMap = new Map(
    (metrics ?? []).map((m) => [m.date, m])
  );

  return scores.map((s) => {
    const m = metricsMap.get(s.date);
    return {
      date: s.date,
      weighted_total: s.weighted_total,
      spend_pacing_score: s.spend_pacing_score,
      cpa_score: s.cpa_score,
      conv_quality_score: s.conv_quality_score,
      pacing_variance: m?.pacing_variance ?? null,
      cpa: m?.cpa ?? null,
      roas: m?.roas ?? null,
      aov: m?.aov ?? null,
      data_status:
        (s as { data_status?: "scored" | "no_data" | "inactive" | null })
          .data_status ?? null,
    };
  });
}
