"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  HelpCircle,
} from "lucide-react";
import type { HomepageSummary } from "@/lib/types/database";
import { formatScore, formatCurrency } from "@/lib/utils/formatting";
import { getHealthScoreColor } from "@/lib/utils/health-score";
import { cn } from "@/lib/utils";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  AnimatedNumber — smooth count-up on mount / value change           */
/* ------------------------------------------------------------------ */

function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  // Start from the real value so SSR and initial hydration match — no zero flash
  const isFirstRender = useRef(true);
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    // Skip animation on mount — display already matches the SSR-rendered value
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      prevValue.current = value;
      return;
    }
    const start = prevValue.current;
    const end = value;
    if (start === end) return;

    let frame: number;
    const startTime = performance.now();
    const duration = 600;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    prevValue.current = end;
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="tabular-nums">{format(display)}</span>;
}

/* ------------------------------------------------------------------ */
/*  KpiCard — single card following the new design system              */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaSuffix?: string;
  deltaInvert?: boolean;
  insufficientHistory?: boolean;
  footer: React.ReactNode;
  valueClassName?: string;
}

function KpiCard({
  title,
  value,
  delta,
  deltaSuffix,
  deltaInvert,
  insufficientHistory,
  footer,
  valueClassName,
}: KpiCardProps) {
  return (
    <div className="group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Head */}
      <div className="flex items-center justify-between px-4 pt-3.5">
        <p className="font-sans text-[13px] font-medium text-muted-foreground">
          {title}
        </p>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-2.5">
        {/* Value + Delta */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-display text-[26px] font-medium tracking-tight tabular-nums",
              valueClassName ?? "text-foreground"
            )}
          >
            {value}
          </span>
          {insufficientHistory ? (
            <Badge
              variant="warning"
              className="h-[22px] rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-wide"
            >
              Insufficient history
            </Badge>
          ) : (
            delta !== undefined && (
              <DeltaBadge value={delta} invert={deltaInvert} suffix={deltaSuffix} />
            )
          )}
        </div>

        {/* Divider + Footer */}
        <div className="border-t pt-2">
          <p className="font-sans text-[11.5px] text-muted-foreground">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SummaryCards — four top-level KPI cards                            */
/* ------------------------------------------------------------------ */

interface SummaryCardsProps {
  summary: HomepageSummary;
  totalSpendToday?: number;
  totalMTD?: number;
}

export function SummaryCards({ summary, totalSpendToday = 0 }: SummaryCardsProps) {
  const scoreColor = getHealthScoreColor(summary.avgHealthScore);
  // Insufficient history: deriveSummaryFromClients already returns null delta
  // when no client has >=14 days. Use that as the signal.
  const healthInsufficientHistory =
    summary.avgHealthScore != null && summary.avgHealthScoreDelta == null;
  // Health score is already a 0-100 percentage; compounding a percent-of-percent
  // is nonsense. Surface the delta in points instead.
  const healthDeltaPts =
    summary.avgHealthScoreDelta != null
      ? Math.round(summary.avgHealthScoreDelta)
      : null;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Active Clients */}
      <KpiCard
        title="Active Clients"
        value={
          <AnimatedNumber
            value={summary.activeClients}
            format={(n) => String(n)}
          />
        }
        footer="Accounts generating spend"
      />

      {/* Avg Health Score — no count-up; the 0-100 value doesn't benefit from it */}
      <KpiCard
        title="Avg Health Score"
        value={
          summary.avgHealthScore == null ? "\u2014" : formatScore(summary.avgHealthScore)
        }
        valueClassName={scoreColor.text}
        delta={healthDeltaPts}
        deltaSuffix=" pts"
        insufficientHistory={healthInsufficientHistory}
        footer={
          <>
            {summary.clientsBelow70}{" "}
            <span className="font-medium text-foreground">
              need attention
            </span>{" "}
            (score &lt; 70)
          </>
        }
      />

      {/* Total Spend Today */}
      <KpiCard
        title="Total Spend Today"
        value={
          <AnimatedNumber
            value={totalSpendToday}
            format={(n) => formatCurrency(n, { compact: true })}
          />
        }
        footer="Fleet-wide ad spend today"
      />

      {/* Active Alerts */}
      <KpiCard
        title="Active Alerts"
        value={
          <AnimatedNumber
            value={summary.alertsToday}
            format={(n) => String(n)}
          />
        }
        valueClassName={
          summary.alertsToday > 0
            ? "text-red-600 dark:text-red-400"
            : undefined
        }
        footer={
          summary.alertsToday > 0
            ? "Clients requiring review"
            : "No alerts triggered today"
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InsightsRow — second row of aggregate insights                     */
/* ------------------------------------------------------------------ */

export interface InsightsRowProps {
  healthDistribution: { healthy: number; warning: number; critical: number };
  topPerformer: {
    id: string;
    client_name: string;
    store_name: string | null;
    avg_7d_score: number | null;
  } | null;
  needsAttention: {
    id: string;
    client_name: string;
    store_name: string | null;
    avg_7d_score: number | null;
  } | null;
  biggestDroppers?: {
    id: string;
    client_name: string;
    store_name: string | null;
    avg_7d_score: number | null;
    scoreDelta: number;
  }[];
}

export function InsightsRow({
  healthDistribution,
  topPerformer,
  needsAttention,
  biggestDroppers,
}: InsightsRowProps) {
  const total =
    healthDistribution.healthy +
    healthDistribution.warning +
    healthDistribution.critical;
  const healthyPct = total > 0 ? (healthDistribution.healthy / total) * 100 : 0;
  const warningPct = total > 0 ? (healthDistribution.warning / total) * 100 : 0;
  const criticalPct =
    total > 0 ? (healthDistribution.critical / total) * 100 : 0;

  const segments = [
    { pct: healthyPct, color: "bg-emerald-500", href: "/?health=healthy", label: "Healthy", count: healthDistribution.healthy },
    { pct: warningPct, color: "bg-amber-400", href: "/?health=warning", label: "Warning", count: healthDistribution.warning },
    { pct: criticalPct, color: "bg-rose-500", href: "/?health=critical", label: "Critical", count: healthDistribution.critical },
  ];

  const hasDroppers = biggestDroppers && biggestDroppers.length > 0;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {/* ---- Health Distribution ------------------------------------ */}
      <div className="rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between px-4 pt-3.5">
          <div className="flex items-center gap-1.5">
            <p className="font-sans text-[13px] font-medium text-muted-foreground">
              Health Distribution
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="sr-only">Score thresholds</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-2">
                <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[11px]">
                  <span className="text-rose-600 dark:text-rose-400 font-medium">Critical</span>
                  <span className="text-muted-foreground">&lt; 60</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500 self-center" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Warning</span>
                  <span className="text-muted-foreground">60–69</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 self-center" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Healthy</span>
                  <span className="text-muted-foreground">70+</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 self-center" />
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-4 pb-4 pt-2.5">
          {total > 0 ? (
            <div
              className="flex h-6 w-full overflow-hidden rounded-full bg-muted"
              role="group"
              aria-label="Health distribution bar"
            >
              {segments.map((seg, i) =>
                seg.pct > 0 ? (
                  <Link
                    key={i}
                    href={seg.href}
                    aria-label={`${seg.count} ${seg.label} clients`}
                    className={cn(
                      "h-full hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      seg.color
                    )}
                    style={{ width: `${seg.pct}%` }}
                  />
                ) : null
              )}
            </div>
          ) : (
            <div className="h-6 w-full rounded-full bg-muted" />
          )}
          <div className="border-t pt-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <Link
                href="/?health=healthy"
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">
                  {healthDistribution.healthy}
                </span>
                <span className="text-muted-foreground">Healthy</span>
              </Link>
              <Link
                href="/?health=warning"
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-medium text-foreground">
                  {healthDistribution.warning}
                </span>
                <span className="text-muted-foreground">Warning</span>
              </Link>
              <Link
                href="/?health=critical"
                className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                <span className="font-medium text-foreground">
                  {healthDistribution.critical}
                </span>
                <span className="text-muted-foreground">Critical</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Biggest Score Drops / Portfolio Extremes --------------- */}
      <div className="rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between px-4 pt-3.5">
          <p className="font-sans text-[13px] font-medium text-muted-foreground">
            {hasDroppers ? "Biggest Score Drops" : "Portfolio Extremes"}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-4 pb-4 pt-2.5">
          {!hasDroppers && (
            <p className="text-[11.5px] text-muted-foreground">
              No significant score drops in the past 7 days
            </p>
          )}

          {hasDroppers ? (
            biggestDroppers!.slice(0, 3).map((client) => {
              const severe = Math.abs(client.scoreDelta) >= 20;
              return (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <ArrowDownRight
                        className={cn(
                          "shrink-0 text-rose-500",
                          severe ? "h-4 w-4 stroke-2" : "h-3 w-3"
                        )}
                      />
                      <Link
                        href={`/clients/${client.id}`}
                        className="truncate text-sm font-medium text-foreground hover:underline"
                      >
                        {client.store_name || client.client_name}
                      </Link>
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px]",
                        severe
                          ? "font-semibold text-rose-700 dark:text-rose-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {client.scoreDelta > 0 ? "+" : ""}
                      {Math.round(client.scoreDelta)} pts vs. prev 7d
                    </p>
                  </div>
                  <span
                    className={cn(
                      "ml-2 shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      severe
                        ? "bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                    )}
                  >
                    {formatScore(client.avg_7d_score)}
                  </span>
                </div>
              );
            })
          ) : (
            <>
              {topPerformer ? (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Top Performer
                      </span>
                    </div>
                    <Link
                      href={`/clients/${topPerformer.id}`}
                      className="mt-0.5 block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {topPerformer.store_name || topPerformer.client_name}
                    </Link>
                  </div>
                  <span className="ml-2 shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    {formatScore(topPerformer.avg_7d_score)}
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11.5px] text-muted-foreground">
                  No data yet
                </div>
              )}

              {needsAttention &&
              needsAttention.avg_7d_score != null &&
              needsAttention.avg_7d_score < 70 ? (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                        Needs Attention
                      </span>
                    </div>
                    <Link
                      href={`/clients/${needsAttention.id}`}
                      className="mt-0.5 block truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {needsAttention.store_name || needsAttention.client_name}
                    </Link>
                  </div>
                  <span className="ml-2 shrink-0 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                    {formatScore(needsAttention.avg_7d_score)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    All clients healthy
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
