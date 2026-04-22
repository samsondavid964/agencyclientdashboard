import { getClientMetricsTable, getMetricsPeriodComparison } from "@/lib/queries/cached";
import { MetricsTable } from "@/components/client-detail/metrics-table";
import { PeriodComparison } from "@/components/client-detail/period-comparison";
import { AnimateIn } from "@/components/ui/animate-in";

interface MetricsSectionProps {
  clientId: string;
  date: string;
  metricsDays: number;
}

export async function MetricsSection({
  clientId,
  date,
  metricsDays,
}: MetricsSectionProps) {
  const [metricsTable, periodComparison] = await Promise.all([
    getClientMetricsTable(clientId, date, metricsDays),
    getMetricsPeriodComparison(clientId, date),
  ]);

  return (
    <>
      <AnimateIn>
        <MetricsTable data={metricsTable} days={metricsDays} />
      </AnimateIn>
      <AnimateIn delay={75}>
        <PeriodComparison data={periodComparison} selectedDate={date} />
      </AnimateIn>
    </>
  );
}
