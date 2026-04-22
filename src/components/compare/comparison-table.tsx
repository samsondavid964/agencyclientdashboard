"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatNumber,
  formatRoas,
  formatScore,
} from "@/lib/utils/formatting";
import type { CompareClientRow } from "@/lib/queries/compare";

interface ComparisonTableProps {
  clients: CompareClientRow[];
}

/** Returns Tailwind text-color class based on health score value */
function scoreColor(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/** Returns Tailwind bg-color class for score badge */
function scoreBg(score: number | null): string {
  if (score == null) return "";
  if (score >= 80) return "bg-emerald-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function ScoreCell({ score }: { score: number | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums",
        scoreColor(score),
        scoreBg(score)
      )}
    >
      {formatScore(score)}
    </span>
  );
}

/** MTD spend as a % of monthly budget */
function mtdPercent(mtd: number | null, budget: number | null): string {
  if (mtd == null || budget == null || budget === 0) return "—";
  return `${((mtd / budget) * 100).toFixed(1)}%`;
}

type RowDef = {
  label: string;
  render: (c: CompareClientRow) => React.ReactNode;
};

const ROWS: RowDef[] = [
  {
    label: "Health Score",
    render: (c) => <ScoreCell score={c.weighted_total} />,
  },
  {
    label: "Spend Pacing",
    render: (c) => <ScoreCell score={c.spend_pacing_score} />,
  },
  {
    label: "CPA Score",
    render: (c) => <ScoreCell score={c.cpa_score} />,
  },
  {
    label: "Conv Quality",
    render: (c) => <ScoreCell score={c.conv_quality_score} />,
  },
  {
    label: "Daily Cost",
    render: (c) => (
      <span className="tabular-nums">{formatCurrency(c.cost)}</span>
    ),
  },
  {
    label: "ROAS vs Target",
    render: (c) => {
      const val = c.roas;
      const target = c.roas_target;
      const formatted = formatRoas(val);
      if (val == null) return <span className="text-muted-foreground">{formatted}</span>;
      const isAbove = target != null ? val >= target : null;
      return (
        <span
          className={cn(
            "tabular-nums font-medium",
            isAbove === true
              ? "text-emerald-600 dark:text-emerald-400"
              : isAbove === false
              ? "text-red-600 dark:text-red-400"
              : ""
          )}
        >
          {formatted}
          {target != null && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              / {formatRoas(target)}
            </span>
          )}
        </span>
      );
    },
  },
  {
    label: "CPA",
    render: (c) => (
      <span className="tabular-nums">{formatCurrency(c.cpa)}</span>
    ),
  },
  {
    label: "Conversions",
    render: (c) => (
      <span className="tabular-nums">
        {formatNumber(c.conversions, { decimals: 1 })}
      </span>
    ),
  },
  {
    label: "Conv Value",
    render: (c) => (
      <span className="tabular-nums">{formatCurrency(c.conversion_value)}</span>
    ),
  },
  {
    label: "CTR",
    render: (c) => {
      if (c.ctr == null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="tabular-nums">
          {(c.ctr * 100).toFixed(2)}%
        </span>
      );
    },
  },
  {
    label: "Monthly Budget",
    render: (c) => (
      <span className="tabular-nums">{formatCurrency(c.monthly_budget)}</span>
    ),
  },
  {
    label: "MTD Spend %",
    render: (c) => {
      const pct = mtdPercent(c.mtd_cost, c.monthly_budget);
      const raw =
        c.mtd_cost != null && c.monthly_budget != null && c.monthly_budget > 0
          ? (c.mtd_cost / c.monthly_budget) * 100
          : null;
      return (
        <span
          className={cn(
            "tabular-nums",
            raw != null && raw > 100
              ? "text-red-600 dark:text-red-400"
              : raw != null && raw >= 80
              ? "text-emerald-600 dark:text-emerald-400"
              : ""
          )}
        >
          {pct}
        </span>
      );
    },
  },
];

export function ComparisonTable({ clients }: ComparisonTableProps) {
  if (clients.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card">
      {/* Horizontal scroll wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Client comparison table">
          <thead>
            <tr className="border-b bg-muted/40">
              {/* Sticky metric-label column header */}
              <th
                scope="col"
                className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Metric
              </th>
              {clients.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className="min-w-[160px] px-4 py-3 text-left"
                >
                  <Link
                    href={`/clients/${c.id}`}
                    className="group inline-block"
                  >
                    <span className="font-semibold text-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary">
                      {c.client_name}
                    </span>
                    {c.store_name && c.store_name !== c.client_name && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.store_name}
                      </span>
                    )}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, rowIdx) => (
              <tr
                key={row.label}
                className={cn(
                  "border-b last:border-0 transition-colors hover:bg-muted/30",
                  rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
              >
                {/* Sticky metric label */}
                <td
                  className={cn(
                    "sticky left-0 z-10 px-4 py-3 text-xs font-medium text-muted-foreground",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                  )}
                >
                  {row.label}
                </td>
                {clients.map((c) => (
                  <td key={c.id} className="px-4 py-3">
                    {row.render(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
