// The client detail page is dynamically rendered because Supabase auth reads
// cookies on every request, so `unstable_cache` cannot wrap these queries —
// accessing cookies inside a cache scope throws at runtime. Until we move to
// Next 16 Cache Components (or a cookie-free admin client path), just
// re-export the raw query functions so call sites don't need to change.
export { getClientHealthTrend } from "./health-scores";
export {
  getClientMetricsTable,
  getMetricsPeriodComparison,
  getMetricsForAnomalyDetection,
} from "./metrics";
export { getCampaignMetrics, getCampaignTrend } from "./campaigns";
export { getBudgetForecast } from "./forecasts";
