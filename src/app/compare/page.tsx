import type { Metadata } from "next";
import { format, subDays } from "date-fns";
import { getAuthenticatedUser } from "@/lib/utils/auth";
import { getAllClientsForSelector, getCompareClients } from "@/lib/queries/compare";
import { ComparePageClient } from "@/components/compare/compare-page-client";

export const metadata: Metadata = { title: "Compare Clients — Ad Lab" };

interface PageProps {
  searchParams: Promise<{ ids?: string; date?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  // Require authentication (redirects to /login if not authenticated)
  await getAuthenticatedUser();

  const params = await searchParams;

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const date = params.date ?? yesterday;

  // Parse client IDs from query string
  const rawIds = params.ids ?? "";
  const initialIds = rawIds
    ? rawIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  // Fetch data in parallel
  const [allClients, initialData] = await Promise.all([
    getAllClientsForSelector(),
    initialIds.length >= 2 ? getCompareClients(initialIds, date) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Compare Clients
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side health scores and performance metrics for up to 5 clients
          &middot; {new Date(date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      <ComparePageClient
        allClients={allClients}
        initialIds={initialIds}
        initialData={initialData}
        date={date}
      />
    </div>
  );
}
