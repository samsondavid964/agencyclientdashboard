import Link from "next/link";
import { format, subDays } from "date-fns";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AnimateIn } from "@/components/ui/animate-in";
import {
  getHomepageClients,
  getAlertCountForDate,
  getFleetSummary,
} from "@/lib/queries/clients";
import { formatScore } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

interface SummarySectionProps {
  date: string;
  isAdmin: boolean;
}

export async function SummarySection({
  date,
}: SummarySectionProps) {
  const [fleetClients, alertsToday] = await Promise.all([
    getHomepageClients({ date }),
    getAlertCountForDate(date),
  ]);

  const summary = await getFleetSummary(date);
  summary.alertsToday = alertsToday;

  const totalSpendToday = fleetClients.reduce(
    (acc, c) => acc + (c.today_spend ?? 0),
    0,
  );
  const totalMTD = fleetClients.reduce((acc, c) => acc + (c.mtd_cost ?? 0), 0);

  const healthDistribution = {
    healthy: fleetClients.filter(
      (c) => c.avg_7d_score != null && c.avg_7d_score >= 70,
    ).length,
    warning: fleetClients.filter(
      (c) =>
        c.avg_7d_score != null &&
        c.avg_7d_score >= 40 &&
        c.avg_7d_score < 70,
    ).length,
    critical: fleetClients.filter(
      (c) => c.avg_7d_score != null && c.avg_7d_score < 40,
    ).length,
  };

  const totalTracked =
    healthDistribution.healthy +
    healthDistribution.warning +
    healthDistribution.critical;

  const avgScore = summary.avgHealthScore ?? 0;
  const fleetStatus: "critical" | "warning" | "healthy" =
    summary.alertsToday > 0 || avgScore < 40
      ? "critical"
      : summary.clientsBelow70 > 0 || avgScore < 70
        ? "warning"
        : "healthy";

  const fleetTitle =
    fleetStatus === "critical"
      ? "Fleet is in the red"
      : fleetStatus === "warning"
        ? "Fleet is holding steady"
        : "Fleet is performing well";

  const dateObj = (() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const isToday =
    date === yesterday || date === format(new Date(), "yyyy-MM-dd");
  const kickerDate = dateObj
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
  const kickerPrefix = isToday ? "TODAY" : "REPORT";

  const healthyPct =
    totalTracked > 0 ? (healthDistribution.healthy / totalTracked) * 100 : 0;
  const warningPct =
    totalTracked > 0 ? (healthDistribution.warning / totalTracked) * 100 : 0;
  const criticalPct =
    totalTracked > 0 ? (healthDistribution.critical / totalTracked) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Fleet Status Banner */}
      <div
        className={cn(
          "rounded-2xl border p-5 lg:p-6 transition-colors duration-300",
          fleetStatus === "critical"
            ? "border-red-200 bg-gradient-to-r from-red-50/80 to-card dark:border-red-900/50 dark:from-red-950/30 dark:to-card"
            : fleetStatus === "warning"
              ? "border-amber-200 bg-gradient-to-r from-amber-50/60 to-card dark:border-amber-900/50 dark:from-amber-950/20 dark:to-card"
              : "border-purple-200/50 bg-gradient-to-r from-purple-50/80 to-card dark:border-purple-900/30 dark:from-purple-950/20 dark:to-card",
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {kickerPrefix} &middot; {kickerDate}
            </p>
            <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">
              {fleetTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {summary.activeClients}
              </span>{" "}
              active client{summary.activeClients !== 1 ? "s" : ""} &middot;
              Avg health{" "}
              <span className="font-semibold text-foreground">
                {formatScore(summary.avgHealthScore)}
              </span>
            </p>
          </div>
          {summary.alertsToday > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {summary.alertsToday} alert
              {summary.alertsToday !== 1 ? "s" : ""} today
            </span>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <SummaryCards
        summary={summary}
        totalSpendToday={totalSpendToday}
        totalMTD={totalMTD}
      />

      {/* Health Distribution Card */}
      <AnimateIn>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Health distribution
            </h2>
            <span className="text-xs text-muted-foreground">
              {totalTracked} client{totalTracked !== 1 ? "s" : ""} tracked
            </span>
          </div>

          {totalTracked > 0 ? (
            <div
              className="flex h-[18px] w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Health distribution: ${healthDistribution.healthy} healthy, ${healthDistribution.warning} warning, ${healthDistribution.critical} critical`}
            >
              {healthyPct > 0 && (
                <Link href="/?health=healthy" className="contents">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${healthyPct}%` }}
                  />
                </Link>
              )}
              {warningPct > 0 && (
                <Link href="/?health=warning" className="contents">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${warningPct}%` }}
                  />
                </Link>
              )}
              {criticalPct > 0 && (
                <Link href="/?health=critical" className="contents">
                  <div
                    className="h-full bg-red-500 transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${criticalPct}%` }}
                  />
                </Link>
              )}
            </div>
          ) : (
            <div className="h-[18px] w-full rounded-full bg-muted" />
          )}

          <div className="mt-3 flex justify-between text-xs">
            <Link
              href="/?health=healthy"
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">
                {healthDistribution.healthy}
              </span>
              <span className="text-muted-foreground">Healthy</span>
              <span className="text-muted-foreground/60">70+</span>
            </Link>
            <Link
              href="/?health=warning"
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="font-medium text-foreground">
                {healthDistribution.warning}
              </span>
              <span className="text-muted-foreground">Warning</span>
              <span className="text-muted-foreground/60">40-69</span>
            </Link>
            <Link
              href="/?health=critical"
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="font-medium text-foreground">
                {healthDistribution.critical}
              </span>
              <span className="text-muted-foreground">Critical</span>
              <span className="text-muted-foreground/60">&lt;40</span>
            </Link>
          </div>
        </div>
      </AnimateIn>
    </div>
  );
}
