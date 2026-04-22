"use client";

import { useCallback, useState, useTransition } from "react";
import { Download, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkReassignMB } from "@/lib/actions/clients";
import type { HomepageClient } from "@/lib/types/database";
import { formatMBDisplay } from "@/lib/utils/display-name";

interface BulkActionToolbarProps {
  selectedIds: string[];
  selectedClients: HomepageClient[];
  mediaBuyers: string[];
  /** YYYY-MM-DD of the data being viewed (not the current wall-clock date). */
  dataDate: string;
  onClearSelection: () => void;
}

function buildCsv(clients: HomepageClient[]): string {
  const headers = [
    "Client Name",
    "Store Name",
    "MB Assigned",
    "Cost",
    "ROAS",
    "CPA",
    "Conversions",
  ];

  const rows = clients.map((c) => {
    const roas = c.roas;
    const cpa = c.cpa;
    const conversions = c.conversions;

    return [
      c.client_name,
      c.store_name ?? "",
      c.mb_assigned ?? "",
      c.today_spend != null ? c.today_spend.toFixed(2) : "",
      roas != null ? roas.toFixed(2) : "",
      cpa != null ? cpa.toFixed(2) : "",
      conversions != null ? conversions.toString() : "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BulkActionToolbar({
  selectedIds,
  selectedClients,
  mediaBuyers,
  dataDate,
  onClearSelection,
}: BulkActionToolbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMB, setSelectedMB] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const visible = selectedIds.length > 0;

  const handleExport = useCallback(() => {
    const csv = buildCsv(selectedClients);
    // Filename must reflect the data's date (usually yesterday), not today.
    downloadCsv(csv, `adlab-clients-${dataDate}.csv`);
    toast.success(`Exported ${selectedClients.length} clients to CSV`);
  }, [selectedClients, dataDate]);

  const handleReassignOpen = useCallback(() => {
    setSelectedMB("");
    setDialogOpen(true);
  }, []);

  const handleReassignConfirm = useCallback(() => {
    if (!selectedMB) return;
    startTransition(async () => {
      const result = await bulkReassignMB(selectedIds, selectedMB);
      if (result.success) {
        toast.success(result.message ?? "Clients reassigned.");
        setDialogOpen(false);
        onClearSelection();
      } else {
        toast.error(result.message ?? "Failed to reassign clients.");
      }
    });
  }, [selectedMB, selectedIds, onClearSelection]);

  return (
    <>
      {/* Floating toolbar */}
      <div
        className={[
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
          "flex items-center gap-3 rounded-2xl border bg-card/95 px-5 py-3 shadow-xl backdrop-blur-sm",
          "transition-all duration-300",
          visible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-6 opacity-0 pointer-events-none",
        ].join(" ")}
        role="toolbar"
        aria-label="Bulk actions"
      >
        <span className="text-sm font-semibold text-foreground">
          {selectedIds.length}{" "}
          {selectedIds.length === 1 ? "client" : "clients"} selected
        </span>

        <div className="h-4 w-px bg-border" aria-hidden="true" />

        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="gap-1.5 h-8"
          disabled={selectedIds.length === 0}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export CSV
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReassignOpen}
          className="gap-1.5 h-8"
          disabled={selectedIds.length === 0}
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Reassign MB
        </Button>

        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Clear selection"
          className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Reassign dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Media Buyer</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Reassign{" "}
            <span className="font-medium text-foreground">
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "client" : "clients"}
            </span>{" "}
            to a new media buyer.
          </p>

          <Select value={selectedMB} onValueChange={setSelectedMB}>
            <SelectTrigger className="w-full" aria-label="Select media buyer">
              <SelectValue placeholder="Select media buyer…" />
            </SelectTrigger>
            <SelectContent>
              {mediaBuyers.map((mb) => (
                <SelectItem key={mb} value={mb}>
                  {formatMBDisplay(mb)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReassignConfirm}
              disabled={!selectedMB || isPending}
            >
              {isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
