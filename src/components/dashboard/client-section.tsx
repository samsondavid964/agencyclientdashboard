import { AnimateIn } from "@/components/ui/animate-in";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ClientGrid } from "@/components/dashboard/client-grid";
import {
  getHomepageClients,
  getDistinctMediaBuyers,
} from "@/lib/queries/clients";
import type { HomepageClient } from "@/lib/types/database";

interface ClientSectionProps {
  date: string;
  status: string;
  mb?: string;
  search?: string;
  sort: string;
  health: string;
  isAdmin: boolean;
  hasFilters: boolean;
}

export async function ClientSection({
  date,
  status,
  mb,
  search,
  sort,
  health,
  isAdmin,
  hasFilters,
}: ClientSectionProps) {
  // getHomepageClients is deduplicated via React.cache() — same-request call
  // from SummarySection returns the cached result without a second DB round-trip
  const [allClients, mediaBuyers] = await Promise.all([
    getHomepageClients({
      date,
      status: status === "all" ? undefined : status,
      mb,
      search,
    }),
    getDistinctMediaBuyers(),
  ]);

  let filteredClients: HomepageClient[] = allClients;
  if (health === "critical") {
    filteredClients = allClients.filter(
      (c) => c.avg_7d_score != null && c.avg_7d_score < 40,
    );
  } else if (health === "warning") {
    filteredClients = allClients.filter(
      (c) =>
        c.avg_7d_score != null &&
        c.avg_7d_score >= 40 &&
        c.avg_7d_score < 70,
    );
  } else if (health === "healthy") {
    filteredClients = allClients.filter(
      (c) => c.avg_7d_score != null && c.avg_7d_score >= 70,
    );
  }

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sort) {
      case "score-asc":
        return (a.avg_7d_score ?? -1) - (b.avg_7d_score ?? -1);
      case "score-desc":
        return (b.avg_7d_score ?? -1) - (a.avg_7d_score ?? -1);
      case "spend-desc":
        return (b.today_spend ?? 0) - (a.today_spend ?? 0);
      case "name-asc":
        return (a.store_name || a.client_name).localeCompare(
          b.store_name || b.client_name,
        );
      default:
        return (a.avg_7d_score ?? -1) - (b.avg_7d_score ?? -1);
    }
  });

  return (
    <AnimateIn delay={100}>
      <FilterBar mediaBuyers={mediaBuyers} />
      <div className="mt-6">
        <ClientGrid
          clients={sortedClients}
          hasFilters={hasFilters}
          isAdmin={isAdmin}
        />
      </div>
    </AnimateIn>
  );
}
