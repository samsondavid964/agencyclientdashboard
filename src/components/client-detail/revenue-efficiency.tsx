"use client";

import { ProgressBar, SparkAreaChart } from "@tremor/react";
import {
  DollarSign,
  Target,
  TrendingDown,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Info,
} from "lucide-react";
import { formatCurrency, formatRoas } from "@/lib/utils/formatting";
import type { HealthTrendRow, MetricsTableRow } from "@/lib/types/database";

interface RevenueEfficiencyProps {
  mtdRevenue: { reported: number | null; all: number | null } | null;
  roasTarget: number | null;
  trendData: HealthTrendRow[];
  metricsData: MetricsTableRow[];
}

/** Returns the average of non-null values, or null if none. */
function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

/**
 * Returns a signed trend annotation like "↓ 12% over 7d" with a color class.
 * Baseline: mean of first half vs mean of second half (smoothed).
 * Filters out null/zero before averaging. Returns null if either window is empty.
 */
function computeSparkTrend(
  data: (number | null)[],
  lowerIsBetter: boolean
): { label: string; colorClass: string } | null {
  if (data.length < 2) return null;

  const mid = Math.floor(data.length / 2);
  // For short arrays (< 6) split in half; for longer use first-3 vs last-3
  let firstWindow: (number | null)[];
  let lastWindow: (number | null)[];
  if (data.length < 6) {
    firstWindow = data.slice(0, mid);
    lastWindow = data.slice(mid);
  } else {
    firstWindow = data.slice(0, 3);
    lastWindow = data.slice(-3);
  }

  const validFirst = firstWindow.filter(
    (v): v is number => v != null && v !== 0
  );
  const validLast = lastWindow.filter(
    (v): v is number => v != null && v !== 0
  );

  if (validFirst.length === 0 || validLast.length === 0) return null;

  const baselineMean =
    validFirst.reduce((s, v) => s + v, 0) / validFirst.length;
  const recentMean = validLast.reduce((s, v) => s + v, 0) / validLast.length;

  if (baselineMean === 0) return null;
  const pct = ((recentMean - baselineMean) / baselineMean) * 100;
  if (!isFinite(pct)) return null;

  const abs = Math.abs(pct).toFixed(0);
  const isGood = lowerIsBetter ? pct < 0 : pct > 0;
  const arrow = pct < 0 ? "Down" : "Up";
  return {
    label: `${arrow} ${abs}% over 7d`,
    colorClass: isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400",
  };
}

export function RevenueEfficiency({
  mtdRevenue,
  roasTarget,
  trendData,
  metricsData,
}: RevenueEfficiencyProps) {
  // Get latest ROAS for comparison
  const latest = trendData[trendData.length - 1];
  const currentRoas = latest?.roas != null ? Number(latest.roas) : null;

  // Raw roasProgress (can exceed 100 for overperformance)
  let roasProgress = 0;
  let roasProgressCapped = 0;
  let roasColor: "emerald" | "amber" | "red" = "emerald";
  if (currentRoas != null && roasTarget != null && roasTarget > 0) {
    roasProgress = (currentRoas / roasTarget) * 100;
    roasProgressCapped = Math.min(roasProgress, 100);
    if (roasProgress >= 100) roasColor = "emerald";
    else if (roasProgress >= 60) roasColor = "amber";
    else roasColor = "red";
  }

  // Last 7 days for sparklines
  const last7 = trendData.slice(-7);
  const cpaRawValues = last7.map((r) =>
    r.cpa != null ? Number(r.cpa) : null
  );
  const aovRawValues = last7.map((r) =>
    r.aov != null ? Number(r.aov) : null
  );

  // 7-day averages for hero numbers
  const cpaAvg = avg(cpaRawValues);
  const aovAvg = avg(aovRawValues);

  const cpaSparkData = last7.map((r) => ({
    date: r.date,
    CPA: r.cpa != null ? Number(r.cpa) : 0,
  }));
  const aovSparkData = last7.map((r) => ({
    date: r.date,
    AOV: r.aov != null ? Number(r.aov) : 0,
  }));

  const cpaTrend = computeSparkTrend(cpaRawValues, true);
  const aovTrend = computeSparkTrend(aovRawValues, false);

  // Last 7 days from metrics table for conversions + cost per sale
  const last7Metrics = metricsData.slice(0, 7);
  const sumCost = last7Metrics.reduce(
    (s, r) => s + (r.cost != null ? Number(r.cost) : 0),
    0
  );
  const sumConversions = last7Metrics.reduce(
    (s, r) => s + (r.conversions != null ? Number(r.conversions) : 0),
    0
  );
  const costPerSale = sumConversions > 0 ? sumCost / sumConversions : null;
  const totalConversions = sumConversions > 0 ? sumConversions : null;

  const conversionsRawValues = last7Metrics.map((r) =>
    r.conversions != null ? Number(r.conversions) : null
  );
  const costPerSaleRawValues = last7Metrics.map((r) => {
    const c = r.cost != null ? Number(r.cost) : null;
    const n = r.conversions != null ? Number(r.conversions) : null;
    return c != null && n != null && n > 0 ? c / n : null;
  });

  const conversionsSparkData = last7Metrics
    .slice()
    .reverse()
    .map((r) => ({
      date: r.date,
      Conversions: r.conversions != null ? Number(r.conversions) : 0,
    }));
  const costPerSaleSparkData = last7Metrics
    .slice()
    .reverse()
    .map((r) => {
      const c = r.cost != null ? Number(r.cost) : null;
      const n = r.conversions != null ? Number(r.conversions) : null;
      return {
        date: r.date,
        "Cost/Sale": c != null && n != null && n > 0 ? c / n : 0,
      };
    });

  const conversionsTrend = computeSparkTrend(
    conversionsRawValues.slice().reverse(),
    false
  );
  const costPerSaleTrend = computeSparkTrend(
    costPerSaleRawValues.slice().reverse(),
    true
  );

  const showRevenueTooltip =
    mtdRevenue?.all != null && mtdRevenue.all !== mtdRevenue.reported;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* MTD Revenue */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              MTD Revenue
              {showRevenueTooltip && (
                <span
                  title={`Reported: ${mtdRevenue?.reported != null ? formatCurrency(mtdRevenue.reported, { compact: true }) : "—"} • Including all tracked conversions (view-through, cross-device): ${mtdRevenue?.all != null ? formatCurrency(mtdRevenue.all, { compact: true }) : "—"}`}
                  className="inline-flex"
                >
                  <Info
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
              )}
            </p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-foreground">
            {mtdRevenue?.reported != null
              ? formatCurrency(mtdRevenue.reported, { compact: true })
              : "\u2014"}
          </p>
        </div>
      </div>

      {/* ROAS vs Target */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                roasColor === "emerald"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : roasColor === "amber"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              <Target className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">ROAS vs Target</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-2xl font-bold tabular-nums text-foreground">
              {currentRoas != null ? formatRoas(currentRoas) : "\u2014"}
            </p>
            <span className="text-sm text-muted-foreground">
              / {roasTarget != null ? formatRoas(roasTarget) : "\u2014"}
            </span>
          </div>
          {roasTarget != null && currentRoas != null && (
            <>
              {roasProgress > 100 && (
                <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  +{Math.round(roasProgress - 100)}% over target
                </span>
              )}
              <ProgressBar
                value={roasProgressCapped}
                color={roasColor}
                className="mt-3"
              />
            </>
          )}
        </div>
      </div>

      {/* CPA 7-day Trend */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">CPA (7-Day)</p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-foreground">
            {cpaAvg != null ? formatCurrency(cpaAvg) : "\u2014"}
          </p>
          {cpaSparkData.length > 1 && (
            <SparkAreaChart
              data={cpaSparkData}
              index="date"
              categories={["CPA"]}
              colors={["amber"]}
              className="mt-3 h-14"
            />
          )}
          {cpaTrend && (
            <p className={`mt-1 text-xs font-medium ${cpaTrend.colorClass}`}>
              {cpaTrend.label}
            </p>
          )}
        </div>
      </div>

      {/* AOV 7-day Trend */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">AOV (7-Day)</p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-foreground">
            {aovAvg != null ? formatCurrency(aovAvg) : "\u2014"}
          </p>
          {aovSparkData.length > 1 && (
            <SparkAreaChart
              data={aovSparkData}
              index="date"
              categories={["AOV"]}
              colors={["violet"]}
              className="mt-3 h-14"
            />
          )}
          {aovTrend && (
            <p className={`mt-1 text-xs font-medium ${aovTrend.colorClass}`}>
              {aovTrend.label}
            </p>
          )}
        </div>
      </div>

      {/* Conversions 7-day */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">Conversions (7-Day)</p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-foreground">
            {totalConversions != null
              ? Math.round(totalConversions).toLocaleString("en-US")
              : "\u2014"}
          </p>
          {conversionsSparkData.length > 1 && (
            <SparkAreaChart
              data={conversionsSparkData}
              index="date"
              categories={["Conversions"]}
              colors={["sky"]}
              className="mt-3 h-14"
            />
          )}
          {conversionsTrend && (
            <p className={`mt-1 text-xs font-medium ${conversionsTrend.colorClass}`}>
              {conversionsTrend.label}
            </p>
          )}
        </div>
      </div>

      {/* Cost per Sale 7-day */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">Cost per Sale (7-Day)</p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-foreground">
            {costPerSale != null ? formatCurrency(costPerSale) : "\u2014"}
          </p>
          {costPerSaleSparkData.length > 1 && (
            <SparkAreaChart
              data={costPerSaleSparkData}
              index="date"
              categories={["Cost/Sale"]}
              colors={["rose"]}
              className="mt-3 h-14"
            />
          )}
          {costPerSaleTrend && (
            <p className={`mt-1 text-xs font-medium ${costPerSaleTrend.colorClass}`}>
              {costPerSaleTrend.label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
