"use client";

import { useRef, useEffect, useId } from "react";
import { AreaChart, type CustomTooltipProps } from "@tremor/react";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { getHealthScoreColor } from "@/lib/utils/health-score";
import type { HealthTrendRow } from "@/lib/types/database";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { LiquidCard, CardContent } from "@/components/ui/liquid-glass-card";
import { cn } from "@/lib/utils";

interface HealthScoreHeroProps {
  todayScore: number | null;
  scoreDelta: number | null;
  trendData: HealthTrendRow[];
  hasSufficientHistory?: boolean;
}

// --- Half-circle gauge (adapted from FinancialScoreHalfCircle) ---

const EASING_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

function getGradientStops(score: number | null): string[] {
  if (score === null) {
    return ["#9ca3af", "#4b5563"];
  }
  if (score >= 70) {
    return ["#a7f3d0", "#34d399", "#059669"];
  }
  if (score >= 40) {
    return ["#fde68a", "#f59e0b", "#b45309"];
  }
  return ["#fecaca", "#f87171", "#b91c1c"];
}

function HealthScoreGauge({ score }: { score: number | null }) {
  const strokeRef = useRef<SVGCircleElement>(null);
  const gradId = useId();
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const halfCirc = circumference / 2;

  const targetOffset =
    score !== null ? -(score / 100) * halfCirc : -halfCirc / 2;

  const colorStops = getGradientStops(score);

  useEffect(() => {
    const el = strokeRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      el.style.strokeDashoffset = String(targetOffset);
      return;
    }

    el.animate(
      [
        { strokeDashoffset: "0", offset: 0 },
        { strokeDashoffset: "0", offset: 400 / 1400 },
        { strokeDashoffset: String(targetOffset) },
      ],
      {
        duration: 1400,
        easing: EASING_IN_OUT,
        fill: "forwards",
      }
    );
  }, [score, targetOffset]);

  return (
    <div className="relative w-full">
      <svg
        className="block mx-auto w-auto max-w-full h-[88px]"
        viewBox="0 0 100 50"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            {colorStops.map((stop, i) => (
              <stop
                key={i}
                offset={`${(100 / (colorStops.length - 1)) * i}%`}
                stopColor={stop}
              />
            ))}
          </linearGradient>
        </defs>
        <g fill="none" strokeWidth="10" transform="translate(50,50.5)">
          <circle
            r={radius}
            className="stroke-muted/25 dark:stroke-muted/20"
          />
          <circle
            ref={strokeRef}
            r={radius}
            stroke={`url(#${gradId})`}
            strokeDasharray={`${halfCirc} ${halfCirc}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
        </g>
      </svg>

      <div className="mt-1 w-full text-center">
        <div className="text-3xl font-semibold tabular-nums leading-none font-display">
          {score !== null ? Math.round(score) : "—"}
        </div>
      </div>
    </div>
  );
}

// --- Strength badge ---

function StrengthBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const colors = getHealthScoreColor(score);

  const badgeClass =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        badgeClass
      )}
    >
      {colors.label}
    </span>
  );
}

// --- Tooltip for trend chart ---

const customTooltip = ({ payload, active, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;

  if (value == null) {
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">No data ingested</p>
      </div>
    );
  }

  if (typeof value !== "number") return null;
  const colors = getHealthScoreColor(value);

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${colors.text}`}>{value.toFixed(0)}</p>
      <p className={`text-xs font-medium ${colors.text}`}>{colors.label}</p>
    </div>
  );
};

// --- Interpretation line helper ---

function InterpretationLine({ latest }: { latest: HealthTrendRow | undefined }) {
  if (!latest) return null;

  const spend = latest.spend_pacing_score;
  const cpa = latest.cpa_score;
  const conv = latest.conv_quality_score;
  const weighted = latest.weighted_total;

  // Find weakest critical dimension (< 40)
  const critical: { label: string; score: number } | null = (() => {
    const candidates: { label: string; score: number | null }[] = [
      { label: "Spend pacing critical", score: spend },
      { label: "CPA dragging score down", score: cpa },
      { label: "Conversion quality critical", score: conv },
    ];
    const belowForty = candidates.filter(
      (c): c is { label: string; score: number } =>
        c.score != null && c.score < 40
    );
    if (belowForty.length === 0) return null;
    return belowForty.reduce((min, c) => (c.score < min.score ? c : min));
  })();

  if (critical) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <AlertTriangle className="h-3 w-3 text-red-500" aria-hidden="true" />
        {critical.label} ({Math.round(critical.score)})
      </span>
    );
  }

  // No critical dimension, but overall in warning zone
  if (weighted != null && weighted < 60) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <TrendingDown className="h-3 w-3 text-amber-500" aria-hidden="true" />
        Weighted score in warning zone
      </span>
    );
  }

  return null;
}

// --- Main component ---

export function HealthScoreHero({
  todayScore,
  scoreDelta,
  trendData,
  hasSufficientHistory = true,
}: HealthScoreHeroProps) {
  const chartColor =
    todayScore != null
      ? todayScore >= 70
        ? "emerald"
        : todayScore >= 40
          ? "amber"
          : "red"
      : "gray";

  const chartData = trendData.map((row) => ({
    date: new Date(row.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    "Health Score":
      row.weighted_total != null ? Number(row.weighted_total) : null,
  }));

  const latestRow = trendData.length > 0 ? trendData[trendData.length - 1] : undefined;

  return (
    <LiquidCard className="gap-0 py-0">
      <CardContent className="p-6">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Left: compact gauge KPI */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex w-full items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Health Score
              </h2>
              <StrengthBadge score={todayScore} />
            </div>

            <HealthScoreGauge score={todayScore} />

            {scoreDelta != null ? (
              <span className="inline-flex items-center gap-1.5">
                <DeltaBadge value={scoreDelta} suffix="" />
                <span className="text-[11px] text-muted-foreground">
                  vs 7 days ago
                </span>
              </span>
            ) : null}

            <InterpretationLine latest={latestRow} />
          </div>

          {/* Right: 30-day trend chart (the hero) */}
          <div className="min-h-[240px]">
            <div className="mb-2 flex items-center gap-2">
              <p className="font-display text-sm font-medium text-muted-foreground">
                30-Day Trend
              </p>
              {!hasSufficientHistory && (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  Insufficient history
                </span>
              )}
            </div>
            {chartData.length > 0 ? (
              <div className="relative">
                {/* Wrapper paddings mirror Tremor's plot-area insets (yAxisWidth=40, x-axis ~24px) so percentage-height bands align with the chart grid. */}
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{ paddingLeft: 40, paddingBottom: 24, paddingTop: 2 }}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    <div
                      className="absolute inset-x-0 top-0 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]"
                      style={{ height: "30%" }}
                    />
                    <div
                      className="absolute inset-x-0 bg-amber-500/[0.04] dark:bg-amber-500/[0.06]"
                      style={{ top: "30%", height: "30%" }}
                    />
                    <div
                      className="absolute inset-x-0 bg-red-500/[0.04] dark:bg-red-500/[0.06]"
                      style={{ top: "60%", height: "40%" }}
                    />
                  </div>
                </div>
                <div className="relative z-10">
                  <AreaChart
                    data={chartData}
                    index="date"
                    categories={["Health Score"]}
                    colors={[chartColor]}
                    showGradient={true}
                    curveType="monotone"
                    minValue={0}
                    maxValue={100}
                    showLegend={false}
                    showYAxis={true}
                    showXAxis={true}
                    yAxisWidth={40}
                    customTooltip={customTooltip}
                    className="h-64"
                    connectNulls={false}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  No health score data available
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </LiquidCard>
  );
}
