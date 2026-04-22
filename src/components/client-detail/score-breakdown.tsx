"use client";

import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import type { HealthTrendRow } from "@/lib/types/database";
import { formatRoas } from "@/lib/utils/formatting";
import { getHealthScoreColor } from "@/lib/utils/health-score";
import { cn } from "@/lib/utils";

interface ScoreBreakdownProps {
  trendData: HealthTrendRow[];
  roasTarget: number | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatPacingVariance(variance: number | null | undefined): string {
  if (variance == null) return "\u2014";
  const prefix = variance > 0 ? "+" : "";
  return `${prefix}${variance.toFixed(1)}%`;
}

function getPacingVarianceColor(variance: number | null | undefined): string {
  if (variance == null) return "text-muted-foreground";
  const abs = Math.abs(variance);
  if (abs <= 10) return "text-emerald-600 dark:text-emerald-400";
  if (abs <= 25) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function ScoreProgressBar({ score, label }: { score: number | null; label: string }) {
  const colors = getHealthScoreColor(score);
  const width = score != null ? Math.min(Math.max(score, 0), 100) : 0;

  const barColorMap: Record<string, string> = {
    "text-emerald-600": "bg-emerald-500",
    "text-amber-600": "bg-amber-500",
    "text-red-600": "bg-red-500",
    "text-gray-400": "bg-muted-foreground/40",
  };
  const barColor = barColorMap[colors.text] || "bg-muted-foreground/40";

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={score ?? 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} score: ${score != null ? Math.round(score) : "no data"}`}
    >
      <div
        className={`h-full rounded-full ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

type BarDatum = { date: string; score: number | null };

function InlineBarChart({ data, label }: { data: BarDatum[]; label: string }) {
  if (data.length === 0) return null;

  const firstIdx = 0;
  const midIdx = Math.floor((data.length - 1) / 2);
  const lastIdx = data.length - 1;
  const tickIndices = new Set([firstIdx, midIdx, lastIdx]);

  function barColor(score: number | null): string {
    if (score == null) return "bg-muted-foreground/20";
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  }

  const scoresWithData = data.filter((d) => d.score != null) as Array<{
    date: string;
    score: number;
  }>;
  const latestWithData = [...scoresWithData].reverse()[0];
  const minEntry =
    scoresWithData.length > 0
      ? scoresWithData.reduce((acc, d) => (d.score < acc.score ? d : acc))
      : null;
  const maxEntry =
    scoresWithData.length > 0
      ? scoresWithData.reduce((acc, d) => (d.score > acc.score ? d : acc))
      : null;

  const chartAriaLabel = latestWithData
    ? `${label} score trend over ${data.length} days. Latest: ${Math.round(
        latestWithData.score
      )} on ${latestWithData.date}.`
    : `${label} score trend over ${data.length} days. No data.`;

  const chartSrDesc =
    minEntry && maxEntry
      ? `${label} daily scores from ${data[0].date} to ${
          data[data.length - 1].date
        }. Minimum ${Math.round(minEntry.score)} on ${minEntry.date}, maximum ${Math.round(
          maxEntry.score
        )} on ${maxEntry.date}.`
      : `${label} daily scores from ${data[0].date} to ${data[data.length - 1].date}.`;

  return (
    <div className="mt-1 mb-2" role="img" aria-label={chartAriaLabel}>
      {/* Chart area: relative container for bars + gridlines */}
      <div className="relative h-24 flex items-end gap-px pl-6">
        {/* Gridlines at 40 and 70 */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/20"
          style={{ bottom: "70%" }}
        >
          <span className="absolute left-0 -top-2.5 text-[10px] text-muted-foreground select-none">
            70
          </span>
        </div>
        <div
          className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/20"
          style={{ bottom: "40%" }}
        >
          <span className="absolute left-0 -top-2.5 text-[10px] text-muted-foreground select-none">
            40
          </span>
        </div>

        {/* Bars */}
        {data.map((d, i) => {
          const heightPct = d.score != null ? Math.min(Math.max(d.score, 2), 100) : 4;
          return (
            <div
              key={i}
              className="flex-1 min-w-0"
              style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
            >
              <div
                className={cn("w-full rounded-sm", barColor(d.score))}
                style={{ height: `${heightPct}%` }}
                title={`${d.date}: ${d.score != null ? Math.round(d.score) : "no data"}`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis: 3 date ticks */}
      <div className="relative flex pl-6 mt-0.5">
        {data.map((d, i) => {
          if (!tickIndices.has(i)) return <div key={i} className="flex-1 min-w-0" />;
          const align =
            i === firstIdx
              ? "text-left"
              : i === lastIdx
              ? "text-right"
              : "text-center";
          return (
            <div key={i} className={cn("flex-1 min-w-0 text-[10px] text-muted-foreground", align)}>
              {d.date}
            </div>
          );
        })}
      </div>
      <span className="sr-only">{chartSrDesc}</span>
    </div>
  );
}

function ScoreStatusIcon({ score }: { score: number | null }) {
  if (score == null) return null;
  if (score < 40) {
    return (
      <AlertTriangle
        aria-hidden="true"
        className="h-3.5 w-3.5 text-red-500"
      />
    );
  }
  if (score < 70) {
    return (
      <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" />
    );
  }
  return (
    <CheckCircle2
      aria-hidden="true"
      className="h-3.5 w-3.5 text-emerald-500"
    />
  );
}

interface ScoreCardProps {
  title: string;
  weight: string;
  score: number | null;
  chartData: BarDatum[];
  annotations: Array<{ label: string; value: string; valueClass?: string }>;
  staggerClass: string;
}

function ScoreCard({
  title,
  weight,
  score,
  chartData,
  annotations,
  staggerClass,
}: ScoreCardProps) {
  const scoreColors = getHealthScoreColor(score);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200",
        staggerClass
      )}
    >
      {/* Progress bar at top — outside the inner padding */}
      <ScoreProgressBar score={score} label={title} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {weight}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-2xl font-bold tabular-nums ${scoreColors.text}`}
          >
            <ScoreStatusIcon score={score} />
            {score != null ? Math.round(score) : "\u2014"}
          </span>
        </div>

        {/* Inline bar chart */}
        <InlineBarChart data={chartData} label={title} />

        {/* Annotations */}
        <div className="mt-2 space-y-1 border-t pt-2">
          {annotations.map((a, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground">
              <span>{a.label}</span>
              <span className={`font-medium ${a.valueClass ?? "text-foreground"}`}>
                {a.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ trendData, roasTarget }: ScoreBreakdownProps) {
  const pacingData: BarDatum[] = trendData.map((row) => ({
    date: formatDate(row.date),
    score: row.spend_pacing_score != null ? Number(row.spend_pacing_score) : null,
  }));

  const cpaData: BarDatum[] = trendData.map((row) => ({
    date: formatDate(row.date),
    score: row.cpa_score != null ? Number(row.cpa_score) : null,
  }));

  const convQualityData: BarDatum[] = trendData.map((row) => ({
    date: formatDate(row.date),
    score: row.conv_quality_score != null ? Number(row.conv_quality_score) : null,
  }));

  // Latest values for annotation
  const latest = trendData[trendData.length - 1];
  const pacingVariance =
    latest?.pacing_variance != null ? Number(latest.pacing_variance) : null;

  const cards = [
    {
      title: "Spend Pacing",
      weight: "35%",
      score:
        latest?.spend_pacing_score != null
          ? Number(latest.spend_pacing_score)
          : null,
      chartData: pacingData,
      annotations: [
        {
          label: "Pacing Variance",
          value: formatPacingVariance(pacingVariance),
          valueClass: getPacingVarianceColor(pacingVariance),
        },
      ],
    },
    {
      title: "CPA",
      weight: "35%",
      score: latest?.cpa_score != null ? Number(latest.cpa_score) : null,
      chartData: cpaData,
      annotations: [
        {
          label: "Actual CPA",
          value:
            latest?.cpa != null
              ? `$${Number(latest.cpa).toFixed(2)}`
              : "\u2014",
        },
      ],
    },
    {
      title: "Conv. Quality (ROAS)",
      weight: "30%",
      score:
        latest?.conv_quality_score != null
          ? Number(latest.conv_quality_score)
          : null,
      chartData: convQualityData,
      annotations: [
        {
          label: "Actual ROAS",
          value:
            latest?.roas != null ? formatRoas(Number(latest.roas)) : "\u2014",
        },
        {
          label: "Target ROAS",
          value: roasTarget != null ? formatRoas(roasTarget) : "\u2014",
        },
      ],
    },
  ];

  const staggerClasses = ["stagger-1", "stagger-2", "stagger-3"];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Weighted total = 35% Pacing + 35% CPA + 30% ROAS. Alert if total &lt; 60 or any dimension &lt; 40.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card, index) => (
          <ScoreCard
            key={card.title}
            title={card.title}
            weight={card.weight}
            score={card.score}
            chartData={card.chartData}
            annotations={card.annotations}
            staggerClass={staggerClasses[index] ?? "stagger-1"}
          />
        ))}
      </div>
    </div>
  );
}
