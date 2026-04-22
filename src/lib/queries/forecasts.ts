import { createClient } from "@/lib/supabase/server";
import { getDaysInMonth, getDate } from "date-fns";

export type BudgetForecastOk = {
  status: "ok";
  monthly_budget: number;
  mtd_cost: number;
  days_elapsed: number;
  days_in_month: number;
  days_remaining: number;
  daily_run_rate: number;
  projected_month_end: number;
  budget_variance: number;
  pacing_status: "on_track" | "over_pacing" | "under_pacing";
  pct_budget_consumed: number;
  pct_month_elapsed: number;
};

export type BudgetForecastNoBudget = {
  status: "no_budget";
};

export type BudgetForecast = BudgetForecastOk | BudgetForecastNoBudget;

export async function getBudgetForecast(
  clientId: string,
  date: string
): Promise<BudgetForecast> {
  const supabase = await createClient();

  const [clientRes, metricsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("monthly_budget")
      .eq("id", clientId)
      .single(),
    supabase
      .from("daily_metrics")
      .select("mtd_cost")
      .eq("client_id", clientId)
      .eq("date", date)
      .single(),
  ]);

  const monthly_budget = clientRes.data?.monthly_budget
    ? Number(clientRes.data.monthly_budget)
    : null;

  if (!monthly_budget) {
    return { status: "no_budget" };
  }

  // Treat missing mtd_cost as 0 so pacing can still render when a budget exists.
  const mtd_cost = metricsRes.data?.mtd_cost
    ? Number(metricsRes.data.mtd_cost)
    : 0;

  const d = new Date(date + "T00:00:00");
  const days_elapsed = getDate(d);
  const days_in_month = getDaysInMonth(d);
  const days_remaining = days_in_month - days_elapsed;
  const daily_run_rate = mtd_cost / days_elapsed;
  const projected_month_end = daily_run_rate * days_in_month;
  const budget_variance = projected_month_end - monthly_budget;
  const ratio = projected_month_end / monthly_budget;
  const pacing_status: BudgetForecastOk["pacing_status"] =
    ratio > 1.15
      ? "over_pacing"
      : ratio < 0.85
        ? "under_pacing"
        : "on_track";

  return {
    status: "ok",
    monthly_budget,
    mtd_cost,
    days_elapsed,
    days_in_month,
    days_remaining,
    daily_run_rate,
    projected_month_end,
    budget_variance,
    pacing_status,
    pct_budget_consumed: (mtd_cost / monthly_budget) * 100,
    pct_month_elapsed: (days_elapsed / days_in_month) * 100,
  };
}
