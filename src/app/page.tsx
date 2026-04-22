import type { Metadata } from "next";
import { format, subDays } from "date-fns";
import { LayoutGrid } from "lucide-react";
import { SummaryCards, InsightsRow } from "@/components/dashboard/summary-cards";
import { DashboardClientShell } from "@/components/dashboard/dashboard-client-shell";
import {
  getAllClientsForDate,
  getHomepageInsights,
  getDistinctMediaBuyers,
  getAlertCountForDate,
  deriveSummaryFromClients,
} from "@/lib/queries/clients";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import { formatScore } from "@/lib/utils/formatting";
import { EmptyState } from "@/components/ui/empty-state";
import type { HomepageClient } from "@/lib/types/database";

// Data changes once per day after workflow 2 runs (~06:00 UTC).
// 5-minute revalidation keeps the page fresh without hammering Supabase.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Fleet-wide health scores and performance across all clients.",
};

interface PageProps {
  searchParams: Promise<{
    date?: string;
    status?: string;
    mb?: string;
    search?: string;
    sort?: string;
    health?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();
  const admin = isAdmin(user);

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const date = params.date ?? yesterday;
  const status = params.status ?? "active";
  const sort = params.sort ?? "score-asc";
  const healthFilter = params.health ?? "all";

  // Single unfiltered fetch — fleet summary, insights, and filtered grid all
  // derive from this one dataset to avoid duplicate Supabase round-trips.
  const [allClients, alertsToday, mediaBuyers] = await Promise.all([
    getAllClientsForDate(date),
    getAlertCountForDate(date),
    getDistinctMediaBuyers(),
  ]);

  // Short-circuit: no clients in the system at all
  if (allClients.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={LayoutGrid}
          title="No clients yet"
          description="Add your first client to start tracking fleet health scores."
          className="mt-16"
        />
      </div>
    );
  }

  // Fleet summary — computed from unfiltered dataset so KPIs reflect the full
  // book of business regardless of grid filters.
  const summary = deriveSummaryFromClients(allClients, alertsToday);

  // Insights: RPC with TypeScript fallback (see getHomepageInsights in clients.ts)
  const insights = await getHomepageInsights(date, allClients);

  // Apply status/mb/search filters in TypeScript (health + sort filters follow below)
  let filteredClients: HomepageClient[] = allClients;
  if (status !== "all") {
    filteredClients = filteredClients.filter((c) => c.client_status === status);
  }
  if (params.mb) {
    filteredClients = filteredClients.filter((c) => c.mb_assigned === params.mb);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    filteredClients = filteredClients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        (c.store_name ?? "").toLowerCase().includes(q),
    );
  }

  // Health range filter — thresholds aligned with alert-firing boundary (<60 = critical)
  if (healthFilter === "critical") {
    filteredClients = filteredClients.filter(
      (c) => c.avg_7d_score != null && c.avg_7d_score < 60,
    );
  } else if (healthFilter === "warning") {
    filteredClients = filteredClients.filter(
      (c) =>
        c.avg_7d_score != null &&
        c.avg_7d_score >= 60 &&
        c.avg_7d_score < 70,
    );
  } else if (healthFilter === "healthy") {
    filteredClients = filteredClients.filter(
      (c) => c.avg_7d_score != null && c.avg_7d_score >= 70,
    );
  }

  // Sort
  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sort) {
      case "score-asc":
        return (a.avg_7d_score ?? -1) - (b.avg_7d_score ?? -1);
      case "score-desc":
        return (b.avg_7d_score ?? -1) - (a.avg_7d_score ?? -1);
      case "spend-desc":
        return (b.today_spend ?? 0) - (a.today_spend ?? 0);
      case "name-asc":
        return a.client_name.localeCompare(b.client_name);
      default:
        return (a.avg_7d_score ?? -1) - (b.avg_7d_score ?? -1);
    }
  });

  const noDataCount = allClients.filter(
    (c) => c.client_status === "active" && c.data_status === "no_data",
  ).length;
  const activeClientCount = allClients.filter(
    (c) => c.client_status === "active",
  ).length;

  // Shape InsightsRow props from insights RPC result
  const healthDistribution = {
    healthy: insights.healthy_count,
    warning: insights.warning_count,
    critical: insights.critical_count,
  };
  const topPerformer = insights.top_performer
    ? {
        id: insights.top_performer.id,
        client_name: insights.top_performer.client_name,
        store_name: insights.top_performer.store_name,
        avg_7d_score: insights.top_performer.avg_7d_score,
      }
    : null;
  const needsAttention = insights.needs_attention
    ? {
        id: insights.needs_attention.id,
        client_name: insights.needs_attention.client_name,
        store_name: insights.needs_attention.store_name,
        avg_7d_score: insights.needs_attention.avg_7d_score,
      }
    : null;
  const biggestDroppers = insights.biggest_droppers.map((d) => ({
    id: d.id,
    client_name: d.client_name,
    store_name: d.store_name,
    avg_7d_score: d.avg_7d_score,
    scoreDelta: d.score_delta,
  }));

  // Format date for display — avoids timezone shift from new Date(dateString)
  const [y, mo, day] = date.split("-").map(Number);
  const dateObj = new Date(y, mo - 1, day);
  const displayDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header — date subheading only; "Dashboard" title comes from the header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {displayDate} &middot; Performance as of {date}
        </p>
        {/* Fleet briefing: each metric gets a weighted numeric */}
        <p className="mt-1 text-sm">
          <span className="font-medium text-foreground">{summary.activeClients}</span>
          <span className="text-muted-foreground"> active client{summary.activeClients !== 1 ? "s" : ""}</span>
          {" "}&middot;{" "}
          <span className="font-medium text-foreground">{summary.alertsToday}</span>
          <span className="text-muted-foreground"> alert{summary.alertsToday !== 1 ? "s" : ""}</span>
          {" "}&middot;{" "}
          <span className="text-muted-foreground">Avg score </span>
          <span className="font-medium text-foreground">{formatScore(summary.avgHealthScore)}</span>
        </p>
        {noDataCount > 0 && (
          <p
            className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            role="status"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            {noDataCount} of {activeClientCount} active clients have no data for {date} — ingestion may have failed
          </p>
        )}
      </div>

      {/* Summary KPI cards */}
      <SummaryCards summary={summary} totalSpendToday={insights.total_spend_today} />

      {/* Insights row */}
      <InsightsRow
        healthDistribution={healthDistribution}
        topPerformer={topPerformer}
        needsAttention={needsAttention}
        biggestDroppers={biggestDroppers}
      />

      {/* Filters + grid (client shell owns selection state) */}
      <DashboardClientShell
        clients={sortedClients}
        mediaBuyers={mediaBuyers}
        hasFilters={!!(params.status || params.mb || params.search || params.health)}
        isAdmin={admin}
        dataDate={date}
        totalClientCount={allClients.length}
      />
    </div>
  );
}
