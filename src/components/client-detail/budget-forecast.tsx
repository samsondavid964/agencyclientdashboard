import { SparkAreaChart } from "@tremor/react";
import type { BudgetForecast } from "@/lib/queries/forecasts";
import { formatCurrency } from "@/lib/utils/formatting";

interface DailySpendPoint {
  date: string;
  cost: number | null;
}

interface BudgetForecastPanelProps {
  forecast: BudgetForecast | null;
  dailySpend?: DailySpendPoint[];
}

function ProgressBar({
  pct,
  colorClass,
}: {
  pct: number;
  colorClass: string;
}) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function BudgetForecastPanel({
  forecast,
  dailySpend,
}: BudgetForecastPanelProps) {
  if (!forecast) return null;

  if (forecast.status === "no_budget") {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Budget Burn Forecast
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No monthly budget configured for this client. Add one in client
          settings to see budget pacing.
        </p>
      </div>
    );
  }

  const statusConfig = {
    on_track: {
      label: "On Track",
      badgeClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      barClass: "bg-emerald-500",
    },
    over_pacing: {
      label: "Over Pacing",
      badgeClass:
        "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
      barClass: "bg-red-500",
    },
    under_pacing: {
      label: "Under Pacing",
      badgeClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      barClass: "bg-amber-500",
    },
  };

  const cfg = statusConfig[forecast.pacing_status];

  // Prepare sparkline data (ascending by date, coerce null -> 0).
  const sparkData = (dailySpend ?? [])
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((r) => ({
      date: r.date,
      Spend: r.cost == null ? 0 : Number(r.cost),
    }));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Budget Burn Forecast
          </h2>
          <p className="text-sm text-muted-foreground">
            {forecast.days_elapsed}d elapsed &middot; {forecast.days_remaining}d remaining
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* MTD Spend vs Budget */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>MTD Spend</span>
          <span>
            {formatCurrency(forecast.mtd_cost)} /{" "}
            {formatCurrency(forecast.monthly_budget)} budget
          </span>
        </div>
        <ProgressBar
          pct={forecast.pct_budget_consumed}
          colorClass={cfg.barClass}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{forecast.pct_budget_consumed.toFixed(1)}% consumed</span>
          <span>{forecast.pct_month_elapsed.toFixed(1)}% of month elapsed</span>
        </div>
      </div>

      {/* Daily spend sparkline (last 14 days) */}
      {sparkData.length > 1 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Daily Spend (last {sparkData.length} days)
          </p>
          <SparkAreaChart
            data={sparkData}
            index="date"
            categories={["Spend"]}
            colors={["blue"]}
            className="h-16 w-full"
          />
        </div>
      )}

      {/* Projection grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p
            className="text-xs text-muted-foreground"
            title="MTD spend ÷ days elapsed so far"
          >
            Daily Run Rate (MTD avg)
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(forecast.daily_run_rate)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            MTD spend &divide; {forecast.days_elapsed} days
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Projected Month-End</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(forecast.projected_month_end)}
          </p>
        </div>

        <div
          className={`rounded-lg p-3 ${
            forecast.pacing_status === "on_track"
              ? "bg-muted/50"
              : forecast.pacing_status === "over_pacing"
                ? "bg-red-50 dark:bg-red-950/20"
                : "bg-amber-50 dark:bg-amber-950/20"
          }`}
        >
          <p className="text-xs text-muted-foreground">Variance</p>
          <p
            className={`mt-1 text-base font-semibold tabular-nums ${
              forecast.pacing_status === "on_track"
                ? "text-foreground"
                : forecast.pacing_status === "over_pacing"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {forecast.budget_variance > 0 ? "+" : ""}
            {formatCurrency(forecast.budget_variance)}
          </p>
        </div>
      </div>

      {forecast.pacing_status === "over_pacing" && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
          At current run rate, spend will exceed budget by{" "}
          {formatCurrency(Math.abs(forecast.budget_variance))} this month.
        </p>
      )}
      {forecast.pacing_status === "under_pacing" && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
          At current run rate, spend will fall{" "}
          {formatCurrency(Math.abs(forecast.budget_variance))} short of budget this month.
        </p>
      )}
      {(forecast.pacing_status === "over_pacing" ||
        forecast.pacing_status === "under_pacing") && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Pacing projections assume linear daily spend; seasonality and
          day-of-week effects are not factored in.
        </p>
      )}
    </div>
  );
}
