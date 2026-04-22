import type { HealthTrendRow, MetricsTableRow } from "@/lib/types/database";
import type { BudgetForecast } from "@/lib/queries/forecasts";

export type ExecutiveSummaryInput = {
  todayScore: number | null;
  scoreDelta: number | null; // 7-day delta, null if insufficient history
  trendData: HealthTrendRow[]; // ordered ascending by date (oldest→newest)
  metricsData: MetricsTableRow[]; // ordered descending by date (newest→oldest)
  forecast: BudgetForecast;
  clientName: string;
};

export type SummaryTone = "healthy" | "warning" | "critical" | "unknown";

// --- Helpers ---

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return "$" + value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function scoreLabel(score: number): string {
  if (score >= 70) return "healthy";
  if (score >= 40) return "warning";
  return "critical";
}

// --- Sentence 1: health state + trend ---

function buildSentence1(
  todayScore: number | null,
  scoreDelta: number | null
): string {
  if (todayScore === null) {
    return "Health score unavailable for the selected date.";
  }

  const label = scoreLabel(todayScore);
  const score = Math.round(todayScore);
  let trendClause: string;

  if (scoreDelta === null) {
    trendClause = "not enough history yet.";
  } else {
    const absDelta = Math.round(Math.abs(scoreDelta));
    if (absDelta < 1) {
      trendClause = "holding steady over 7 days.";
    } else {
      const direction = scoreDelta > 0 ? "up" : "down";
      trendClause = `trending ${direction} ${absDelta} point${absDelta !== 1 ? "s" : ""} over 7 days.`;
    }
  }

  return `Health is ${score} (${label}), ${trendClause}`;
}

// --- Sentence 2: key concern ---

type DimensionKey = "spend_pacing_score" | "cpa_score" | "conv_quality_score";
const DIMENSION_LABELS: Record<DimensionKey, string> = {
  spend_pacing_score: "spend pacing",
  cpa_score: "CPA efficiency",
  conv_quality_score: "conversion quality (ROAS)",
};

function buildSentence2(
  trendData: HealthTrendRow[],
  metricsData: MetricsTableRow[]
): string {
  // Find the latest scored trend row
  const latestScored = [...trendData]
    .reverse()
    .find((row) => row.data_status === "scored");

  // Check for critical dimension (score < 40)
  if (latestScored) {
    const dimKeys: DimensionKey[] = [
      "spend_pacing_score",
      "cpa_score",
      "conv_quality_score",
    ];
    const candidates = dimKeys
      .map((key) => ({ key, score: latestScored[key] }))
      .filter((c): c is { key: DimensionKey; score: number } =>
        typeof c.score === "number" && c.score < 40
      );

    if (candidates.length > 0) {
      const worst = candidates.reduce((min, c) =>
        c.score < min.score ? c : min
      );
      return `Key concern: ${DIMENSION_LABELS[worst.key]} critical at ${Math.round(worst.score)}.`;
    }
  }

  // Check metric moves (CPA and ROAS) over last-3 vs prior-3 days
  const last3Cpa = metricsData.slice(0, 3).map((r) => r.cpa);
  const prior3Cpa = metricsData.slice(3, 6).map((r) => r.cpa);
  const last3Roas = metricsData.slice(0, 3).map((r) => r.roas);
  const prior3Roas = metricsData.slice(3, 6).map((r) => r.roas);

  const avgLastCpa = avg(last3Cpa);
  const avgPriorCpa = avg(prior3Cpa);
  const avgLastRoas = avg(last3Roas);
  const avgPriorRoas = avg(prior3Roas);

  let cpaPctChange = 0;
  let roasPctChange = 0;

  const cpaDeteriorated =
    avgLastCpa !== null &&
    avgPriorCpa !== null &&
    avgPriorCpa > 0 &&
    avgLastCpa >= avgPriorCpa * 1.15;

  if (cpaDeteriorated && avgLastCpa !== null && avgPriorCpa !== null) {
    cpaPctChange = (avgLastCpa - avgPriorCpa) / avgPriorCpa;
  }

  const roasDrop =
    avgLastRoas !== null &&
    avgPriorRoas !== null &&
    avgPriorRoas > 0 &&
    avgLastRoas <= avgPriorRoas * 0.85;

  if (roasDrop && avgLastRoas !== null && avgPriorRoas !== null) {
    roasPctChange = (avgPriorRoas - avgLastRoas) / avgPriorRoas;
  }

  // Pick the largest % change
  if (cpaDeteriorated && roasDrop && avgLastCpa !== null && avgPriorCpa !== null && avgLastRoas !== null && avgPriorRoas !== null) {
    if (cpaPctChange >= roasPctChange) {
      return `Key concern: CPA deteriorated from ${formatCurrency(Math.round(avgPriorCpa))} to ${formatCurrency(Math.round(avgLastCpa))} in the last 3 days.`;
    } else {
      return `Key concern: ROAS dropped from ${avgPriorRoas.toFixed(2)}x to ${avgLastRoas.toFixed(2)}x in the last 3 days.`;
    }
  }

  if (cpaDeteriorated && avgLastCpa !== null && avgPriorCpa !== null) {
    return `Key concern: CPA deteriorated from ${formatCurrency(Math.round(avgPriorCpa))} to ${formatCurrency(Math.round(avgLastCpa))} in the last 3 days.`;
  }

  if (roasDrop && avgLastRoas !== null && avgPriorRoas !== null) {
    return `Key concern: ROAS dropped from ${avgPriorRoas.toFixed(2)}x to ${avgLastRoas.toFixed(2)}x in the last 3 days.`;
  }

  return "No critical dimension flagged.";
}

// --- Sentence 3: budget / revenue pacing ---

function buildSentence3(forecast: BudgetForecast): string {
  if (forecast.status === "no_budget") {
    return "No monthly budget set.";
  }

  const pct = Math.round(forecast.pct_budget_consumed);
  const { pacing_status, budget_variance, days_remaining } = forecast;

  if (pacing_status === "on_track") {
    return `Revenue on track at ${pct}% of monthly budget.`;
  }

  if (pacing_status === "over_pacing") {
    const variance = Math.abs(budget_variance);
    return `Pacing hot — projected to exceed budget by ${formatCurrency(variance)} (${pct}% of budget used with ${days_remaining} day${days_remaining !== 1 ? "s" : ""} left).`;
  }

  // under_pacing
  return `Under-pacing — only ${pct}% of budget used with ${days_remaining} day${days_remaining !== 1 ? "s" : ""} remaining.`;
}

// --- getSummaryTone ---

export function getSummaryTone(input: ExecutiveSummaryInput): SummaryTone {
  const { todayScore, trendData, forecast } = input;

  if (todayScore === null) return "unknown";

  // Critical conditions
  if (todayScore < 40) return "critical";

  if (
    forecast.status === "ok" &&
    forecast.pacing_status === "over_pacing" &&
    forecast.monthly_budget > 0 &&
    forecast.budget_variance / forecast.monthly_budget > 0.2
  ) {
    return "critical";
  }

  // Warning conditions
  if (todayScore < 70) return "warning";

  // Check for any critical dimension in latest scored row
  const latestScored = [...trendData]
    .reverse()
    .find((row) => row.data_status === "scored");

  if (latestScored) {
    const dimKeys: DimensionKey[] = [
      "spend_pacing_score",
      "cpa_score",
      "conv_quality_score",
    ];
    const hasCriticalDim = dimKeys.some(
      (key) => typeof latestScored[key] === "number" && (latestScored[key] as number) < 40
    );
    if (hasCriticalDim) return "warning";
  }

  if (
    forecast.status === "ok" &&
    (forecast.pacing_status === "over_pacing" ||
      forecast.pacing_status === "under_pacing")
  ) {
    return "warning";
  }

  return "healthy";
}

// --- generateExecutiveSummary ---

export function generateExecutiveSummary(
  input: ExecutiveSummaryInput
): { sentences: string[] } {
  const { todayScore, scoreDelta, trendData, metricsData, forecast } = input;

  const s1 = buildSentence1(todayScore, scoreDelta);
  const s2 = buildSentence2(trendData, metricsData);
  const s3 = buildSentence3(forecast);

  return { sentences: [s1, s2, s3] };
}
