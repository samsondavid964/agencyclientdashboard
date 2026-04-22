import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { formatCurrency, formatNumber, formatRoas } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";
import type { AggregatedPeriod } from "@/lib/queries/metrics";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PeriodComparisonProps {
  data: {
    last7: AggregatedPeriod;
    prev7: AggregatedPeriod;
    last28: AggregatedPeriod;
    prev28: AggregatedPeriod;
  };
  /** Optional YYYY-MM-DD. When provided, date-range labels are rendered under
   *  each column header. Falls back to "Current" / "Prior" when absent. */
  selectedDate?: string;
}

// ─── Metric config ────────────────────────────────────────────────────────────

type Sentiment = "higher-better" | "lower-better" | "informational";

type MetricConfig = {
  label: string;
  key: keyof AggregatedPeriod;
  format: (v: number | null) => string;
  sentiment: Sentiment;
};

const METRICS: MetricConfig[] = [
  { label: "Conv. Value",  key: "conversion_value", format: formatCurrency,                              sentiment: "higher-better"  },
  { label: "ROAS",         key: "roas",              format: formatRoas,                                 sentiment: "higher-better"  },
  { label: "CPA",          key: "cpa",               format: formatCurrency,                             sentiment: "lower-better"   },
  { label: "Conversions",  key: "conversions",       format: (v) => formatNumber(v, { decimals: 1 }),   sentiment: "higher-better"  },
  { label: "Spend",        key: "cost",              format: formatCurrency,                             sentiment: "informational"  },
  { label: "Clicks",       key: "clicks",            format: formatNumber,                               sentiment: "informational"  },
  { label: "Impressions",  key: "impressions",       format: (v) => formatNumber(v, { compact: true }), sentiment: "informational"  },
];

// ─── Delta helpers ────────────────────────────────────────────────────────────

function computeDeltaPct(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

type DeltaInfo = {
  pct: number;
  colorClass: string;
  Icon: typeof TrendingUp;
};

function buildDeltaInfo(
  current: number | null,
  prior: number | null,
  sentiment: Sentiment,
): DeltaInfo | null {
  const pct = computeDeltaPct(current, prior);
  if (pct == null) return null;

  const isNear = Math.abs(pct) < 0.5;
  if (isNear) {
    return { pct, colorClass: "text-muted-foreground", Icon: Minus };
  }

  const isUp = pct > 0;

  if (sentiment === "informational") {
    return { pct, colorClass: "text-muted-foreground", Icon: isUp ? TrendingUp : TrendingDown };
  }

  const isImprovement = sentiment === "lower-better" ? !isUp : isUp;
  const colorClass = isImprovement
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return { pct, colorClass, Icon: isUp ? TrendingUp : TrendingDown };
}

// ─── Mini bar-pair ────────────────────────────────────────────────────────────

function MiniBarPair({
  current,
  prior,
}: {
  current: number | null;
  prior: number | null;
}) {
  if (current == null && prior == null) return <span className="w-14 block" />;
  const max = Math.max(current ?? 0, prior ?? 0);
  if (max === 0) return <span className="w-14 block" />;
  const curW = Math.round(((current ?? 0) / max) * 100);
  const priW = Math.round(((prior ?? 0) / max) * 100);

  return (
    <span className="flex flex-col gap-0.5 w-14 shrink-0" aria-hidden="true">
      <span className="h-1.5 rounded-sm bg-blue-500/70" style={{ width: `${curW}%` }} />
      <span className="h-1.5 rounded-sm bg-slate-300 dark:bg-slate-600" style={{ width: `${priW}%` }} />
    </span>
  );
}

// ─── Date range label helpers ─────────────────────────────────────────────────

function fmtRange(start: Date, end: Date): string {
  const startFmt = format(start, "MMM d");
  const endFmt   = format(end,   "MMM d");
  return `${startFmt}–${endFmt}`;
}

type DateLabels = {
  cur7: string;   pri7: string;
  cur28: string;  pri28: string;
};

function buildDateLabels(selectedDate?: string): DateLabels {
  if (!selectedDate) {
    return { cur7: "Current", pri7: "Prior", cur28: "Current", pri28: "Prior" };
  }
  try {
    const anchor = parseISO(selectedDate);
    return {
      cur7:  fmtRange(subDays(anchor, 6),  anchor),
      pri7:  fmtRange(subDays(anchor, 13), subDays(anchor, 7)),
      cur28: fmtRange(subDays(anchor, 27), anchor),
      pri28: fmtRange(subDays(anchor, 55), subDays(anchor, 28)),
    };
  } catch {
    return { cur7: "Current", pri7: "Prior", cur28: "Current", pri28: "Prior" };
  }
}

// ─── Insight sentence ─────────────────────────────────────────────────────────

function InsightSentence({
  last28,
  prev28,
}: {
  last28: AggregatedPeriod;
  prev28: AggregatedPeriod;
}) {
  const revPct  = computeDeltaPct(last28.conversion_value, prev28.conversion_value);
  const cpaPct  = computeDeltaPct(last28.cpa,              prev28.cpa);

  if (revPct == null && cpaPct == null) return null;

  const parts: string[] = [];

  if (revPct != null) {
    const dir = revPct >= 0 ? "up" : "down";
    parts.push(`Revenue is ${dir} ${Math.abs(revPct).toFixed(1)}% MoM`);
  }

  if (cpaPct != null) {
    // CPA: lower is better
    const improved = cpaPct < 0;
    const action   = improved ? "improved" : "worsened";
    parts.push(`CPA ${action} by ${Math.abs(cpaPct).toFixed(1)}%`);
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground px-6 pb-3 -mt-1">
      {parts.join(" · ")}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PeriodComparison({ data, selectedDate }: PeriodComparisonProps) {
  const labels = buildDateLabels(selectedDate);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Period-over-Period Comparison
          </h2>
          <p className="text-sm text-muted-foreground">
            Week-over-week and month-over-month performance
          </p>
        </div>
      </div>

      {/* MoM insight sentence */}
      <InsightSentence last28={data.last28} prev28={data.prev28} />

      {/* Consolidated table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {/* Metric label col */}
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground w-[120px]">
                Metric
              </th>
              {/* Mini bar col */}
              <th className="py-2.5 px-2 w-[60px]" aria-hidden="true" />

              {/* WoW group */}
              <th
                colSpan={3}
                className="py-2 px-4 text-center text-xs font-semibold text-foreground border-l"
              >
                Week-over-week
              </th>

              {/* MoM group */}
              <th
                colSpan={3}
                className="py-2 px-4 text-center text-xs font-semibold text-foreground border-l"
              >
                Month-over-month
              </th>
            </tr>

            {/* Sub-header: date labels */}
            <tr className="border-b bg-muted/10">
              <th className="py-1 px-4" />
              <th className="py-1 px-2" aria-hidden="true" />

              {/* WoW sub-headers */}
              <th className="py-1 px-3 text-right text-[11px] font-medium text-muted-foreground border-l">
                <span className="block leading-tight">{labels.cur7}</span>
              </th>
              <th className="py-1 px-3 text-right text-[11px] font-medium text-muted-foreground">
                <span className="block leading-tight">{labels.pri7}</span>
              </th>
              <th className="py-1 px-3 text-right text-[11px] font-medium text-muted-foreground">
                Δ
              </th>

              {/* MoM sub-headers */}
              <th className="py-1 px-3 text-right text-[11px] font-medium text-muted-foreground border-l">
                <span className="block leading-tight">{labels.cur28}</span>
              </th>
              <th className="py-1 px-3 text-right text-[11px] font-medium text-muted-foreground">
                <span className="block leading-tight">{labels.pri28}</span>
              </th>
              <th className="py-1 px-3 text-right text-[11px] font-medium text-muted-foreground">
                Δ
              </th>
            </tr>
          </thead>

          <tbody>
            {METRICS.map((m) => {
              const cur7  = data.last7[m.key]  as number | null;
              const pri7  = data.prev7[m.key]  as number | null;
              const cur28 = data.last28[m.key] as number | null;
              const pri28 = data.prev28[m.key] as number | null;

              const d7  = buildDeltaInfo(cur7,  pri7,  m.sentiment);
              const d28 = buildDeltaInfo(cur28, pri28, m.sentiment);

              return (
                <tr
                  key={m.key}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Metric label */}
                  <td className="py-2.5 px-4 font-medium text-foreground text-xs">
                    {m.label}
                  </td>

                  {/* Mini bar-pair (uses WoW values for the visual) */}
                  <td className="py-2.5 px-2">
                    <MiniBarPair current={cur7} prior={pri7} />
                  </td>

                  {/* WoW: current */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs border-l">
                    {m.format(cur7)}
                  </td>
                  {/* WoW: prior */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs text-muted-foreground">
                    {m.format(pri7)}
                  </td>
                  {/* WoW: delta */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                    <DeltaCell delta={d7} />
                  </td>

                  {/* MoM: current */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs border-l">
                    {m.format(cur28)}
                  </td>
                  {/* MoM: prior */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs text-muted-foreground">
                    {m.format(pri28)}
                  </td>
                  {/* MoM: delta */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                    <DeltaCell delta={d28} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t bg-muted/20">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-4 rounded-sm bg-blue-500/70 inline-block" />
          Current period
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-4 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" />
          Prior period
        </span>
      </div>
    </div>
  );
}

// ─── DeltaCell helper ─────────────────────────────────────────────────────────

function DeltaCell({ delta }: { delta: DeltaInfo | null }) {
  if (delta == null) {
    return <span className="text-muted-foreground">{"\u2014"}</span>;
  }
  const { pct, colorClass, Icon } = delta;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", colorClass)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
