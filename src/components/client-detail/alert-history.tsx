"use client";

import { useState, useMemo, useTransition } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Bell, AlertCircle, CheckCircle2, ChevronDown, ExternalLink, Filter, ArrowUp, ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HealthRing } from "@/components/client-detail/health-ring";
import { LogActionForm } from "@/components/forms/log-action-form";
import { bulkResolveAlerts } from "@/lib/actions/alerts";
import { getHealthScoreColor } from "@/lib/utils/health-score";
import { cn } from "@/lib/utils";
import type { AlertLog } from "@/lib/types/database";

interface AlertHistoryProps {
  alerts: AlertLog[];
  isAdmin: boolean;
  userEmail: string;
  clientMbAssigned: string | null;
}

type SortKey = "date" | "weighted_total" | "severity" | "days_unresolved";
type ShowFilter = "all" | "unresolved" | "resolved";

const TODAY = new Date();

function pipColor(value: number | null) {
  const { zone } = getHealthScoreColor(value);
  if (zone === "healthy") return "bg-emerald-500";
  if (zone === "warning") return "bg-amber-500";
  if (zone === "critical") return "bg-red-500";
  return "bg-gray-300";
}

function DimensionPips({ pacing, cpa, conv }: { pacing: number | null; cpa: number | null; conv: number | null }) {
  const dims = [{ label: "Pacing", value: pacing }, { label: "CPA", value: cpa }, { label: "Conv Quality", value: conv }];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1" aria-label="View dimension scores">
          {dims.map(({ label, value }) => (
            <span key={label} className={cn("h-2.5 w-2.5 rounded-full inline-block", pipColor(value))} aria-hidden="true" />
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Dimensions</p>
        <div className="space-y-2">
          {dims.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <HealthRing score={value} size="sm" animate={false} />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function sortVal(alert: AlertLog, key: SortKey): number {
  if (key === "date") return new Date(alert.date).getTime();
  if (key === "weighted_total") return alert.weighted_total ?? 0;
  if (key === "severity") return 100 - (alert.weighted_total ?? 0);
  return alert.response_notes !== null ? -1 : differenceInDays(TODAY, parseISO(alert.date));
}

export function AlertHistory({ alerts, isAdmin, userEmail, clientMbAssigned }: AlertHistoryProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilter, setShowFilter] = useState<ShowFilter>("all");
  const [reasonFilters, setReasonFilters] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canLogAction = isAdmin || (!!userEmail && userEmail === clientMbAssigned);
  const unresolvedCount = alerts.filter((a) => a.response_notes === null).length;

  const allReasons = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach((a) => (a.triggered_reasons ?? []).forEach((r) => set.add(r)));
    return Array.from(set).sort();
  }, [alerts]);

  const filtered = useMemo(() => alerts.filter((a) => {
    if (showFilter === "unresolved" && a.response_notes !== null) return false;
    if (showFilter === "resolved" && a.response_notes === null) return false;
    if (reasonFilters.size > 0 && !(a.triggered_reasons ?? []).some((r) => reasonFilters.has(r))) return false;
    if (fromDate && a.date < fromDate) return false;
    if (toDate && a.date > toDate) return false;
    return true;
  }), [alerts, showFilter, reasonFilters, fromDate, toDate]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = sortVal(a, sortKey), bv = sortVal(b, sortKey);
      if (sortKey === "days_unresolved") {
        if (av === -1 && bv !== -1) return 1;
        if (bv === -1 && av !== -1) return -1;
      }
      return sortAsc ? av - bv : bv - av;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const visibleUnresolvedIds = useMemo(
    () => sorted.filter((a) => a.response_notes === null).map((a) => a.id),
    [sorted]
  );
  const allChecked = visibleUnresolvedIds.length > 0 && visibleUnresolvedIds.every((id) => selected.has(id));
  const someChecked = visibleUnresolvedIds.some((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        visibleUnresolvedIds.forEach((id) => next.delete(id));
      } else {
        visibleUnresolvedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkResolve() {
    setBulkError("");
    if (!bulkNotes.trim()) { setBulkError("Please enter response notes."); return; }
    startTransition(async () => {
      const result = await bulkResolveAlerts(Array.from(selected), bulkNotes);
      if (result.success) {
        toast.success(result.message);
        setSelected(new Set()); setBulkOpen(false); setBulkNotes("");
      } else {
        setBulkError(result.message);
        toast.error(result.message);
      }
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm" id="alerts">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Alert History</h2>
            <p className="text-sm text-muted-foreground">No alerts have been triggered for this client.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm" id="alerts">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Alert History</h2>
            <p className="text-sm text-muted-foreground">
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""} total
              {unresolvedCount > 0 && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  {unresolvedCount} unresolved
                </span>
              )}
            </p>
          </div>
        </div>
        {canLogAction && selected.size > 0 && (
          <Button size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resolve {selected.size} selected
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
        <Select value={showFilter} onValueChange={(v) => setShowFilter(v as ShowFilter)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All alerts</SelectItem>
            <SelectItem value="unresolved" className="text-xs">Unresolved only</SelectItem>
            <SelectItem value="resolved" className="text-xs">Resolved only</SelectItem>
          </SelectContent>
        </Select>

        {allReasons.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3 w-3" />
                Reasons
                {reasonFilters.size > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-medium leading-none">
                    {reasonFilters.size}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs">Filter by reason</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allReasons.map((r) => (
                <DropdownMenuCheckboxItem
                  key={r}
                  checked={reasonFilters.has(r)}
                  onCheckedChange={() =>
                    setReasonFilters((p) => {
                      const n = new Set(p);
                      if (n.has(r)) n.delete(r);
                      else n.add(r);
                      return n;
                    })
                  }
                  className="text-xs"
                >
                  {r}
                </DropdownMenuCheckboxItem>
              ))}
              {reasonFilters.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <button className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground text-left" onClick={() => setReasonFilters(new Set())}>Clear filters</button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex items-center gap-1.5">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-36 text-xs" aria-label="From date" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-36 text-xs" aria-label="To date" />
          {(fromDate || toDate) && <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date" className="text-xs">Sort: Date</SelectItem>
              <SelectItem value="weighted_total" className="text-xs">Sort: Overall score</SelectItem>
              <SelectItem value="severity" className="text-xs">Sort: Severity</SelectItem>
              <SelectItem value="days_unresolved" className="text-xs">Sort: Days unresolved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSortAsc((v) => !v)} aria-label={sortAsc ? "Sort descending" : "Sort ascending"}>
            {sortAsc ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto px-6 pb-6">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-muted/60 hover:bg-muted/60 h-9">
              {canLogAction && (
                <TableHead className="bg-muted/60 w-8 pr-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                    onChange={toggleAll}
                    aria-label="Select all unresolved"
                  />
                </TableHead>
              )}
              <TableHead className="bg-muted/60 text-xs font-medium">Date</TableHead>
              <TableHead className="bg-muted/60 text-xs font-medium">Overall</TableHead>
              <TableHead className="bg-muted/60 text-xs font-medium">Dimensions</TableHead>
              <TableHead className="bg-muted/60 text-xs font-medium">Reasons</TableHead>
              <TableHead className="bg-muted/60 text-xs font-medium">Action Taken</TableHead>
              <TableHead className="bg-muted/60 text-xs font-medium">Logged By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canLogAction ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                  No alerts match the current filters.
                </TableCell>
              </TableRow>
            ) : sorted.map((alert) => {
              const isUnresolved = alert.response_notes === null;
              const reasons: string[] = alert.triggered_reasons ?? [];
              const visibleReasons = reasons.slice(0, 2);
              const hiddenReasons = reasons.slice(2);

              return (
                <TableRow
                  key={alert.id}
                  className={cn(
                    "transition-colors duration-150",
                    isUnresolved
                      ? "bg-amber-50/60 border-l-4 border-l-amber-500 dark:bg-amber-950/20 hover:bg-amber-50/80"
                      : "border-l-4 border-l-emerald-400/50 hover:bg-muted/40"
                  )}
                >
                  {canLogAction && (
                    <TableCell className="pr-0">
                      {isUnresolved && (
                        <input type="checkbox" className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer" checked={selected.has(alert.id)} onChange={() => toggleRow(alert.id)} aria-label={`Select alert ${alert.date}`} />
                      )}
                    </TableCell>
                  )}

                  <TableCell className="font-medium whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1.5">
                      {isUnresolved
                        ? <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" aria-label="Unresolved" />
                        : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" aria-label="Resolved" />
                      }
                      <Link href={`/clients/${alert.client_id}?date=${alert.date}&tab=metrics`} className="hover:underline hover:text-primary flex items-center gap-1">
                        {format(parseISO(alert.date), "MMM dd, yyyy")}
                        <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" aria-hidden="true" />
                      </Link>
                      {!isUnresolved && (
                        <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <HealthRing score={alert.weighted_total} size="sm" animate={false} />
                  </TableCell>

                  <TableCell>
                    <DimensionPips pacing={alert.spend_pacing_score} cpa={alert.cpa_score} conv={alert.conv_quality_score} />
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {visibleReasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-normal whitespace-nowrap">{reason}</Badge>
                      ))}
                      {hiddenReasons.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button>
                              <Badge variant="secondary" className="text-xs font-normal cursor-pointer gap-0.5">
                                +{hiddenReasons.length} more <ChevronDown className="h-3 w-3" aria-hidden="true" />
                              </Badge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3" align="start">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">All reasons</p>
                            <div className="flex flex-wrap gap-1">
                              {reasons.map((r, i) => <Badge key={i} variant="outline" className="text-xs font-normal">{r}</Badge>)}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[220px]">
                    {alert.response_notes ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-start gap-1 text-left group w-full">
                            <span className="text-sm line-clamp-2 group-hover:text-foreground transition-colors">{alert.response_notes}</span>
                            <ChevronDown className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Action Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{alert.response_notes}</p>
                        </PopoverContent>
                      </Popover>
                    ) : canLogAction && isUnresolved ? (
                      <div className="min-h-[44px] flex items-center">
                        <LogActionForm alertId={alert.id} alertDate={format(parseISO(alert.date), "MMM dd, yyyy")} />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No action logged</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {alert.responded_by || "\u2014"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bulk resolve dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve {selected.size} Alert{selected.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Enter a shared response note applied to all selected unresolved alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="bulk-notes">Response Notes</Label>
            <Textarea id="bulk-notes" value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} placeholder="Describe the action taken to address these alerts..." className="min-h-[120px]" />
            {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="button" onClick={handleBulkResolve} disabled={isPending}>
              {isPending ? "Resolving…" : `Resolve ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
