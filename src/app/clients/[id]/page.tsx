import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { format, subDays } from "date-fns";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import { getClientById, getClientHistoryDays } from "@/lib/queries/clients";
import { INSUFFICIENT_HISTORY_DAYS } from "@/lib/utils/health-score";
import { getMTDRevenue } from "@/lib/queries/metrics";
import {
  getClientHealthTrend,
  getClientMetricsTable,
  getMetricsForAnomalyDetection,
  getBudgetForecast,
} from "@/lib/queries/cached";
import { TopBar } from "@/components/client-detail/top-bar";
import { SectionTabs } from "@/components/client-detail/section-tabs";
import { HealthScoreHero } from "@/components/client-detail/health-score-hero";
import { ScoreBreakdown } from "@/components/client-detail/score-breakdown";
import { RevenueEfficiency } from "@/components/client-detail/revenue-efficiency";
import { ExecutiveSummary } from "@/components/client-detail/executive-summary";
import { EditClientDialog } from "@/components/client-detail/edit-client-dialog";
import { StatusChangeDropdown } from "@/components/client-detail/status-change-dropdown";
import { DeleteClientDialog } from "@/components/client-detail/delete-client-dialog";
import { AnimateIn } from "@/components/ui/animate-in";
import { AnomalyFlags } from "@/components/client-detail/anomaly-flags";
import { BudgetForecastPanel } from "@/components/client-detail/budget-forecast";
import { CampaignsSection } from "@/components/client-detail/sections/campaigns-section";
import { MetricsSection } from "@/components/client-detail/sections/metrics-section";
import { HistorySection } from "@/components/client-detail/sections/history-section";
import { WorkspaceSection } from "@/components/client-detail/sections/workspace-section";
import {
  CampaignsSkeleton,
  MetricsSkeleton,
  HistorySkeleton,
  WorkspaceSkeleton,
} from "@/components/client-detail/sections/section-skeletons";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; range?: string; start?: string }>;
};

const METRICS_RANGE_OPTIONS = [7, 14, 28, 30, 90];
const DEFAULT_METRICS_DAYS = 14;
const MIN_METRICS_DAYS = 1;
const MAX_METRICS_DAYS = 365;

function daysBetween(startDate: string, endDate: string): number | null {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) {
    return { title: "Client not found" };
  }
  const displayName = client.store_name || client.client_name;
  return {
    title: displayName,
    description: `Health score and campaign performance for ${displayName}.`,
  };
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const {
    date: dateParam,
    range: rangeParam,
    start: startParam,
  } = await searchParams;

  const user = await getAuthenticatedUser();
  const userIsAdmin = isAdmin(user);

  // Default to yesterday
  const selectedDate =
    dateParam || format(subDays(new Date(), 1), "yyyy-MM-dd");

  // Resolve the active range. A custom range (via `start`) overrides `range`.
  let rangeDays: number | null = null;
  let customStart: string | null = null;
  let metricsDays: number = DEFAULT_METRICS_DAYS;

  if (startParam) {
    const span = daysBetween(startParam, selectedDate);
    if (span !== null && span >= MIN_METRICS_DAYS && span <= MAX_METRICS_DAYS) {
      customStart = startParam;
      metricsDays = span;
    }
  }

  if (!customStart) {
    const parsedRange = rangeParam ? Number(rangeParam) : DEFAULT_METRICS_DAYS;
    const resolvedRange = METRICS_RANGE_OPTIONS.includes(parsedRange)
      ? parsedRange
      : DEFAULT_METRICS_DAYS;
    rangeDays = resolvedRange;
    metricsDays = resolvedRange;
  }

  const [
    client,
    healthTrend,
    metricsTable,
    mtdRevenue,
    historyDays,
    anomalies,
    forecast,
  ] = await Promise.all([
    getClientById(id),
    getClientHealthTrend(id, selectedDate, 30),
    getClientMetricsTable(id, selectedDate, metricsDays),
    getMTDRevenue(id, selectedDate),
    getClientHistoryDays(id, selectedDate),
    getMetricsForAnomalyDetection(id, selectedDate, 30),
    getBudgetForecast(id, selectedDate),
  ]);

  const hasSufficientHistory = historyDays >= INSUFFICIENT_HISTORY_DAYS;

  if (!client) {
    notFound();
  }

  const userEmail = user.email ?? null;
  const canWriteWorkspace =
    userIsAdmin ||
    (userEmail !== null &&
      client.mb_assigned !== null &&
      userEmail === client.mb_assigned);

  // Derive today's score from the latest entry in health trend
  const todayEntry = healthTrend.find((r) => r.date === selectedDate);
  const todayScore = todayEntry?.weighted_total
    ? Number(todayEntry.weighted_total)
    : null;

  // Score 7 days ago for delta
  const sevenDaysAgo = format(subDays(new Date(selectedDate), 7), "yyyy-MM-dd");
  const prevEntry = healthTrend.find((r) => r.date === sevenDaysAgo);
  const prevScore = prevEntry?.weighted_total
    ? Number(prevEntry.weighted_total)
    : null;
  const scoreDelta =
    hasSufficientHistory && todayScore != null && prevScore != null
      ? todayScore - prevScore
      : null;

  return (
    <div className="space-y-6">
      <TopBar
        client={client}
        isAdmin={userIsAdmin}
        selectedDate={selectedDate}
        rangeDays={rangeDays}
        customStart={customStart}
      >
        <EditClientDialog client={client} />
        <StatusChangeDropdown
          clientId={client.id}
          currentStatus={client.client_status}
        />
        <DeleteClientDialog
          clientId={client.id}
          clientName={client.client_name}
        />
      </TopBar>

      <SectionTabs
        overview={
          <>
            <AnimateIn>
              <ExecutiveSummary
                todayScore={todayScore}
                scoreDelta={scoreDelta}
                trendData={healthTrend}
                metricsData={metricsTable}
                forecast={forecast}
                clientName={client.store_name || client.client_name}
              />
            </AnimateIn>

            <AnimateIn delay={50}>
              <RevenueEfficiency
                mtdRevenue={mtdRevenue}
                roasTarget={client.roas_target}
                trendData={healthTrend}
                metricsData={metricsTable}
              />
            </AnimateIn>

            <AnimateIn delay={100}>
              <div className="flex flex-col gap-6">
                <HealthScoreHero
                  todayScore={todayScore}
                  scoreDelta={scoreDelta}
                  trendData={healthTrend}
                  hasSufficientHistory={hasSufficientHistory}
                />
                <ScoreBreakdown
                  trendData={healthTrend}
                  roasTarget={client.roas_target}
                />
              </div>
            </AnimateIn>

            <AnomalyFlags anomalies={anomalies} date={selectedDate} />

            <BudgetForecastPanel
              forecast={forecast}
              dailySpend={metricsTable.map((r) => ({
                date: r.date,
                cost: r.cost,
              }))}
            />
          </>
        }
        campaigns={
          <Suspense fallback={<CampaignsSkeleton />}>
            <CampaignsSection clientId={id} date={selectedDate} />
          </Suspense>
        }
        metrics={
          <Suspense fallback={<MetricsSkeleton />}>
            <MetricsSection
              clientId={id}
              date={selectedDate}
              metricsDays={metricsDays}
            />
          </Suspense>
        }
        history={
          <Suspense fallback={<HistorySkeleton />}>
            <HistorySection
              clientId={id}
              isAdmin={userIsAdmin}
              userEmail={user.email || ""}
              clientMbAssigned={client.mb_assigned}
            />
          </Suspense>
        }
        workspace={
          <Suspense fallback={<WorkspaceSkeleton />}>
            <WorkspaceSection
              clientId={client.id}
              canWrite={canWriteWorkspace}
              currentUserEmail={user.email || ""}
              isAdmin={userIsAdmin}
            />
          </Suspense>
        }
      />
    </div>
  );
}
