"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MousePointerClick, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ClientGrid } from "@/components/dashboard/client-grid";
import { BulkActionToolbar } from "@/components/dashboard/bulk-action-toolbar";
import type { HomepageClient } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/formatting";

interface DashboardClientShellProps {
  clients: HomepageClient[];
  mediaBuyers: string[];
  hasFilters: boolean;
  isAdmin: boolean;
  /** YYYY-MM-DD of the data being shown. */
  dataDate: string;
  /** Unfiltered total — pass from page.tsx when available for "X of Y" display. */
  totalClientCount?: number;
}

export function DashboardClientShell({
  clients,
  mediaBuyers,
  hasFilters,
  isAdmin,
  dataDate,
  totalClientCount,
}: DashboardClientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  }, []);

  const handleToggleId = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectionMode(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams();
    // Preserve date param
    const date = searchParams.get("date");
    if (date) params.set("date", date);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [router, pathname, searchParams]);

  const selectedClients = clients.filter((c) => selectedIds.includes(c.id));

  const { totalSpend, avgScore } = useMemo(() => {
    const withSpend = clients.filter((c) => c.today_spend != null);
    const spend = withSpend.reduce((sum, c) => sum + (c.today_spend ?? 0), 0);
    const withScore = clients.filter((c) => c.avg_7d_score != null);
    const avg =
      withScore.length > 0
        ? withScore.reduce((sum, c) => sum + (c.avg_7d_score ?? 0), 0) / withScore.length
        : null;
    return { totalSpend: withSpend.length > 0 ? spend : null, avgScore: avg };
  }, [clients]);

  const countLabel =
    totalClientCount != null && totalClientCount !== clients.length
      ? `${clients.length} of ${totalClientCount} clients`
      : `${clients.length} ${clients.length === 1 ? "client" : "clients"}`;

  const selectToggle = isAdmin ? (
    <Button
      variant={selectionMode ? "default" : "outline"}
      size="sm"
      onClick={handleToggleSelectionMode}
      className="h-9 shrink-0 gap-1.5 rounded-lg text-sm"
      aria-pressed={selectionMode}
      aria-label={selectionMode ? "Exit selection mode" : "Enter selection mode"}
    >
      {selectionMode ? (
        <>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Cancel
        </>
      ) : (
        <>
          <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
          Select
        </>
      )}
    </Button>
  ) : null;

  return (
    <>
      <FilterBar mediaBuyers={mediaBuyers} rightSlot={selectToggle} />

      {/* Fleet summary — contextual text row, no card chrome */}
      {clients.length > 0 && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {countLabel}
          {totalSpend != null && (
            <> · {formatCurrency(totalSpend, { compact: true })} today&apos;s spend</>
          )}
          {avgScore != null && (
            <> · Avg score {Math.round(avgScore)}</>
          )}
        </p>
      )}

      {/* Client grid */}
      <ClientGrid
        clients={clients}
        hasFilters={hasFilters}
        isAdmin={isAdmin}
        mediaBuyers={mediaBuyers}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleId={handleToggleId}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk action toolbar — appears when items selected */}
      {isAdmin && (
        <BulkActionToolbar
          selectedIds={selectedIds}
          selectedClients={selectedClients}
          mediaBuyers={mediaBuyers}
          dataDate={dataDate}
          onClearSelection={handleClearSelection}
        />
      )}
    </>
  );
}
