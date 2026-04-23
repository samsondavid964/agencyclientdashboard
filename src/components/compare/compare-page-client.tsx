"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitCompare } from "lucide-react";
import { ClientSelector } from "./client-selector";
import { ComparisonTable } from "./comparison-table";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchComparisonData } from "@/lib/actions/compare";
import type { SelectorClient, CompareClientRow } from "@/lib/queries/compare";
import { Skeleton } from "@/components/ui/skeleton";

interface ComparePageClientProps {
  allClients: SelectorClient[];
  initialIds: string[];
  initialData: CompareClientRow[];
  date: string;
}

export function ComparePageClient({
  allClients,
  initialIds,
  initialData,
  date,
}: ComparePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialIds);
  const [data, setData] = React.useState<CompareClientRow[]>(initialData);
  const [loading, setLoading] = React.useState(false);

  async function handleSelectionChange(ids: string[]) {
    setSelectedIds(ids);

    // Update URL (preserves date param if present)
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length > 0) {
      params.set("ids", ids.join(","));
    } else {
      params.delete("ids");
    }
    router.replace(`/compare?${params.toString()}`, { scroll: false });

    if (ids.length < 2) {
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchComparisonData(ids, date);
      setData(result);
    } catch (err) {
      console.error("fetchComparisonData error:", err);
    } finally {
      setLoading(false);
    }
  }

  const showTable = selectedIds.length >= 2;

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Select Clients
        </h2>
        <ClientSelector
          allClients={allClients}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          max={5}
        />
      </div>

      {/* Table or empty state */}
      {loading ? (
        <ComparisonTableSkeleton />
      ) : showTable ? (
        <ComparisonTable clients={data} />
      ) : (
        <EmptyState
          icon={GitCompare}
          title="Select 2–5 clients to compare"
          description="Choose clients from the selector above to compare their health scores and performance metrics side by side."
          className="py-16"
        />
      )}
    </div>
  );
}

function ComparisonTableSkeleton() {
  return (
    <div
      className="rounded-xl border bg-card overflow-hidden"
      aria-busy="true"
      aria-label="Loading comparison"
    >
      <div className="bg-muted/40 px-4 py-3">
        <Skeleton variant="line" className="w-48" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton variant="bar" />
          </div>
        ))}
      </div>
    </div>
  );
}
