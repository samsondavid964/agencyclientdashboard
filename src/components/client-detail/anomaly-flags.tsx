import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AnomalyResult } from "@/lib/queries/metrics";

interface AnomalyFlagsProps {
  anomalies: AnomalyResult[];
  date: string;
}

export function AnomalyFlags({ anomalies, date }: AnomalyFlagsProps) {
  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              No anomalies detected
            </h2>
            <p className="text-sm text-muted-foreground">
              {displayDate} — all monitored metrics are within 2 standard deviations of the 30-day baseline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Anomaly Detection
          </h2>
          <p className="text-sm text-muted-foreground">
            {anomalies.length} metric{anomalies.length > 1 ? "s" : ""} flagged for {displayDate} — values outside 2 standard deviations from the 30-day baseline.
          </p>
          <div className="mt-3 space-y-2">
            {anomalies.map((a) => (
              <div
                key={a.metric}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/60 px-3 py-2 dark:bg-amber-950/30"
                title={`z-score: ${a.zScore > 0 ? "+" : ""}${a.zScore.toFixed(2)}`}
              >
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100 min-w-[100px]">
                  {a.metricLabel}
                </span>
                <span className="text-sm tabular-nums text-amber-800 dark:text-amber-200 font-bold">
                  {a.formattedToday}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  vs avg {a.formattedMean}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.isImprovement
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  }`}
                >
                  {a.isImprovement
                    ? `Improvement \u00b7 ${a.direction === "high" ? "above" : "below"} normal`
                    : `Concern \u00b7 ${a.direction === "high" ? "above" : "below"} normal`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
