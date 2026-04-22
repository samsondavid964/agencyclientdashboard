import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";
import type { MetricsTableRow } from "@/lib/types/database";

// ── Period-over-period comparison ──────────────────────────────────────────

export type AggregatedPeriod = {
  cost: number | null;
  roas: number | null;
  cpa: number | null;
  conversions: number | null;
  conversion_value: number | null;
  clicks: number | null;
  impressions: number | null;
};

type PeriodComparisonResult = {
  last7: AggregatedPeriod;
  prev7: AggregatedPeriod;
  last28: AggregatedPeriod;
  prev28: AggregatedPeriod;
};

function offsetDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function aggregateRows(
  rows: Array<{
    cost: number | null;
    conversions: number | null;
    conversion_value: number | null;
    clicks: number | null;
    impressions: number | null;
  }>
): AggregatedPeriod {
  if (rows.length === 0) {
    return {
      cost: null,
      roas: null,
      cpa: null,
      conversions: null,
      conversion_value: null,
      clicks: null,
      impressions: null,
    };
  }

  let cost = 0;
  let conversions = 0;
  let conversion_value = 0;
  let clicks = 0;
  let impressions = 0;

  for (const r of rows) {
    cost += Number(r.cost) || 0;
    conversions += Number(r.conversions) || 0;
    conversion_value += Number(r.conversion_value) || 0;
    clicks += Number(r.clicks) || 0;
    impressions += Number(r.impressions) || 0;
  }

  return {
    cost: cost > 0 ? cost : null,
    conversions: conversions > 0 ? conversions : null,
    conversion_value: conversion_value > 0 ? conversion_value : null,
    clicks: clicks > 0 ? clicks : null,
    impressions: impressions > 0 ? impressions : null,
    roas: cost > 0 ? conversion_value / cost : null,
    cpa: conversions > 0 ? cost / conversions : null,
  };
}

export async function getMetricsPeriodComparison(
  clientId: string,
  date: string
): Promise<PeriodComparisonResult> {
  const supabase = await createClient();

  // Windows: last7 = [date-6 .. date], prev7 = [date-13 .. date-7]
  //          last28 = [date-27 .. date], prev28 = [date-55 .. date-28]
  const last7Start = offsetDate(date, -6);
  const prev7Start = offsetDate(date, -13);
  const prev7End = offsetDate(date, -7);
  const last28Start = offsetDate(date, -27);
  const prev28Start = offsetDate(date, -55);
  const prev28End = offsetDate(date, -28);

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, cost, conversions, conversion_value, clicks, impressions")
    .eq("client_id", clientId)
    .gte("date", prev28Start)
    .lte("date", date);

  if (error || !data) {
    const empty: AggregatedPeriod = {
      cost: null,
      roas: null,
      cpa: null,
      conversions: null,
      conversion_value: null,
      clicks: null,
      impressions: null,
    };
    return { last7: empty, prev7: empty, last28: empty, prev28: empty };
  }

  const last7Rows = data.filter((r) => r.date >= last7Start && r.date <= date);
  const prev7Rows = data.filter((r) => r.date >= prev7Start && r.date <= prev7End);
  const last28Rows = data.filter((r) => r.date >= last28Start && r.date <= date);
  const prev28Rows = data.filter((r) => r.date >= prev28Start && r.date <= prev28End);

  return {
    last7: aggregateRows(last7Rows),
    prev7: aggregateRows(prev7Rows),
    last28: aggregateRows(last28Rows),
    prev28: aggregateRows(prev28Rows),
  };
}

// ── Anomaly detection ──────────────────────────────────────────────────────

export type AnomalyResult = {
  metric: "cost" | "roas" | "cpa" | "conversions";
  metricLabel: string;
  todayValue: number;
  mean: number;
  stddev: number;
  zScore: number;
  direction: "high" | "low";
  isImprovement: boolean;
  formattedToday: string;
  formattedMean: string;
};

export async function getMetricsForAnomalyDetection(
  clientId: string,
  date: string,
  lookbackDays: number = 30
): Promise<AnomalyResult[]> {
  const supabase = await createClient();

  const anchorDate = date;
  const startDate = format(subDays(new Date(date + "T00:00:00"), lookbackDays), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, cost, roas, cpa, conversions")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lte("date", anchorDate)
    .order("date", { ascending: true });

  if (error || !data || data.length === 0) return [];

  const todayRow = data.find((r) => r.date === anchorDate);
  const baseline = data.filter((r) => r.date !== anchorDate);

  if (!todayRow || baseline.length < 7) return [];

  type MetricKey = "cost" | "roas" | "cpa" | "conversions";

  const metricConfig: Array<{
    key: MetricKey;
    label: string;
    lowerIsBetter: boolean;
    format: (v: number) => string;
  }> = [
    {
      key: "cost",
      label: "Daily Spend",
      lowerIsBetter: false,
      format: (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      key: "roas",
      label: "ROAS",
      lowerIsBetter: false,
      format: (v) => v.toFixed(2) + "x",
    },
    {
      key: "cpa",
      label: "CPA",
      lowerIsBetter: true,
      format: (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      key: "conversions",
      label: "Conversions",
      lowerIsBetter: false,
      format: (v) => Math.round(v).toLocaleString("en-US"),
    },
  ];

  const results: AnomalyResult[] = [];

  for (const cfg of metricConfig) {
    const baselineValues = baseline
      .map((r) => (r[cfg.key] != null ? Number(r[cfg.key]) : null))
      .filter((v): v is number => v != null);

    if (baselineValues.length < 7) continue;

    const todayRaw = todayRow[cfg.key];
    if (todayRaw == null) continue;
    const todayValue = Number(todayRaw);

    const mean = baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length;
    const variance =
      baselineValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
      baselineValues.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) continue;

    const zScore = (todayValue - mean) / stddev;

    if (Math.abs(zScore) <= 2.0) continue;

    const direction: "high" | "low" = zScore > 0 ? "high" : "low";
    const isImprovement = cfg.lowerIsBetter ? direction === "low" : direction === "high";

    results.push({
      metric: cfg.key,
      metricLabel: cfg.label,
      todayValue,
      mean,
      stddev,
      zScore,
      direction,
      isImprovement,
      formattedToday: cfg.format(todayValue),
      formattedMean: cfg.format(mean),
    });
  }

  return results;
}

export async function getClientMetricsTable(
  clientId: string,
  date: string,
  days: number = 14
): Promise<MetricsTableRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_metrics_table", {
    p_client_id: clientId,
    p_date: date,
    p_days: days,
  });

  if (error) {
    console.error("Error fetching metrics table:", error);
    return getClientMetricsTableFallback(clientId, date, days);
  }

  return (data as MetricsTableRow[]) ?? [];
}

async function getClientMetricsTableFallback(
  clientId: string,
  date: string,
  days: number
): Promise<MetricsTableRow[]> {
  const supabase = await createClient();

  const endDate = new Date(date);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startStr = startDate.toISOString().split("T")[0];

  const { data: metrics } = await supabase
    .from("daily_metrics")
    .select(
      "date, cost, impressions, clicks, ctr, cpc, conversions, conversion_value, roas, cpa, aov, mtd_cost, pacing_variance, search_impression_share, search_budget_lost_is"
    )
    .eq("client_id", clientId)
    .gte("date", startStr)
    .lte("date", date)
    .order("date", { ascending: false });

  if (!metrics || metrics.length === 0) return [];

  const { data: scores } = await supabase
    .from("daily_health_scores")
    .select(
      "date, weighted_total, spend_pacing_score, cpa_score, conv_quality_score, data_status"
    )
    .eq("client_id", clientId)
    .gte("date", startStr)
    .lte("date", date);

  const scoresMap = new Map(
    (scores ?? []).map((s) => [s.date, s])
  );

  return metrics.map((m) => {
    const s = scoresMap.get(m.date);
    return {
      date: m.date,
      cost: m.cost,
      impressions: m.impressions,
      clicks: m.clicks,
      ctr: m.ctr,
      cpc: m.cpc,
      conversions: m.conversions,
      conversion_value: m.conversion_value,
      roas: m.roas,
      cpa: m.cpa,
      aov: m.aov,
      mtd_cost: m.mtd_cost,
      pacing_variance: m.pacing_variance,
      search_impression_share: m.search_impression_share,
      search_budget_lost_is: m.search_budget_lost_is,
      weighted_total: s?.weighted_total ?? null,
      spend_pacing_score: s?.spend_pacing_score ?? null,
      cpa_score: s?.cpa_score ?? null,
      conv_quality_score: s?.conv_quality_score ?? null,
      data_status: (s?.data_status as MetricsTableRow["data_status"]) ?? null,
    };
  });
}

export async function getMTDRevenue(
  clientId: string,
  date: string
): Promise<{ reported: number | null; all: number | null } | null> {
  const supabase = await createClient();

  // Get first day of month
  const d = new Date(date);
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("conversion_value, all_conversion_value")
    .eq("client_id", clientId)
    .gte("date", monthStart)
    .lte("date", date);

  if (error || !data || data.length === 0) return null;

  const reportedTotal = data.reduce(
    (sum, row) => sum + (Number(row.conversion_value) || 0),
    0
  );
  const allTotal = data.reduce(
    (sum, row) => sum + (Number(row.all_conversion_value) || 0),
    0
  );

  return {
    reported: reportedTotal > 0 ? reportedTotal : null,
    all: allTotal > 0 ? allTotal : null,
  };
}
