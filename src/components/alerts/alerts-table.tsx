"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Bell,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertsFilterBar } from "@/components/alerts/alerts-filter-bar";
import type {
  AlertStatusFilter,
  AlertSeverityFilter,
} from "@/components/alerts/alerts-filter-bar";
import { RespondDialog } from "@/components/alerts/respond-dialog";
import { getHealthZone } from "@/lib/utils/health-colors";
import { getHealthStroke } from "@/lib/utils/health-colors";
import { formatScore } from "@/lib/utils/formatting";
import type { AlertWithClient } from "@/lib/queries/alerts";

interface AlertsTableProps {
  alerts: AlertWithClient[];
  isAdmin: boolean;
  userEmail: string;
}

type SortKey = "date" | "weighted_total" | "client_name";

// ─── Score ring cell ──────────────────────────────────────────────────────────

function ScoreCell({ value }: { value: number | null }) {
  const ringColor = getHealthStroke(value);
  const zone = getHealthZone(value);
  const circumference = 2 * Math.PI * 8;
  const isNull = value == null;
  const score = value ?? 0;
  const progress = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - progress);

  const textColorClass =
    zone === "healthy"
      ? "text-emerald-600 dark:text-emerald-400"
      : zone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : zone === "critical"
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground";

  return (
    <div className="inline-flex items-center gap-1.5">
      <svg
        width="20"
        height="20"
        className="-rotate-90 flex-shrink-0"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={isNull ? "currentColor" : ringColor}
          strokeWidth="2"
          strokeDasharray={isNull ? "3 3" : circumference}
          strokeDashoffset={isNull ? 0 : dashOffset}
          strokeLinecap="round"
          className={isNull ? "text-muted-foreground/40" : undefined}
        />
      </svg>
      <span className={`text-xs font-semibold ${textColorClass}`}>
        {formatScore(value)}
      </span>
    </div>
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ alert }: { alert: AlertWithClient }) {
  const isCritical =
    (alert.weighted_total != null && alert.weighted_total < 60) ||
    (alert.spend_pacing_score != null && alert.spend_pacing_score < 40) ||
    (alert.cpa_score != null && alert.cpa_score < 40) ||
    (alert.conv_quality_score != null && alert.conv_quality_score < 40);

  if (isCritical) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 font-medium text-[10px]">
        Critical
      </Badge>
    );
  }

  const isWarning =
    (alert.weighted_total != null && alert.weighted_total < 70) ||
    (alert.spend_pacing_score != null && alert.spend_pacing_score < 70) ||
    (alert.cpa_score != null && alert.cpa_score < 70) ||
    (alert.conv_quality_score != null && alert.conv_quality_score < 70);

  if (isWarning) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 font-medium text-[10px]">
        Warning
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 font-medium text-[10px]">
      Healthy
    </Badge>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortIndicator({ field, sortKey, sortAsc }: { field: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  const isActive = sortKey === field;
  if (!isActive) return <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />;
  return sortAsc
    ? <ArrowUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />
    : <ArrowDown className="h-3 w-3 text-emerald-600" aria-hidden="true" />;
}

// ─── Severity scoring helper ─────────────────────────────────────────────────

function getSeverityRank(alert: AlertWithClient): number {
  const isCritical =
    (alert.weighted_total != null && alert.weighted_total < 60) ||
    (alert.spend_pacing_score != null && alert.spend_pacing_score < 40) ||
    (alert.cpa_score != null && alert.cpa_score < 40) ||
    (alert.conv_quality_score != null && alert.conv_quality_score < 40);
  if (isCritical) return 0;

  const isWarning =
    (alert.weighted_total != null && alert.weighted_total < 70) ||
    (alert.spend_pacing_score != null && alert.spend_pacing_score < 70) ||
    (alert.cpa_score != null && alert.cpa_score < 70) ||
    (alert.conv_quality_score != null && alert.conv_quality_score < 70);
  return isWarning ? 1 : 2;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertsTable({ alerts, isAdmin, userEmail }: AlertsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>("all");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const filtered = useMemo(() => {
    let result = [...alerts];

    if (statusFilter === "unresolved") result = result.filter((a) => a.response_notes === null);
    if (statusFilter === "resolved") result = result.filter((a) => a.response_notes !== null);

    if (severityFilter !== "all") {
      result = result.filter((a) => {
        const rank = getSeverityRank(a);
        if (severityFilter === "critical") return rank === 0;
        if (severityFilter === "warning") return rank === 1;
        if (severityFilter === "healthy") return rank === 2;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.client_name.toLowerCase().includes(q) ||
          (a.store_name ?? "").toLowerCase().includes(q) ||
          (a.triggered_reasons ?? []).some((r) => r.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortKey === "date") {
        return sortAsc
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      }
      if (sortKey === "client_name") {
        return sortAsc
          ? a.client_name.localeCompare(b.client_name)
          : b.client_name.localeCompare(a.client_name);
      }
      // weighted_total
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    return result;
  }, [alerts, statusFilter, severityFilter, search, sortKey, sortAsc]);

  return (
    <div className="space-y-4">
      <AlertsFilterBar
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        severity={severityFilter}
        onSeverityChange={setSeverityFilter}
        resultCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts found"
          description={
            search || statusFilter !== "all" || severityFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "No health score alerts have been triggered yet."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead
                  className="bg-muted/60 text-xs font-medium"
                  aria-sort={sortKey === "date" ? (sortAsc ? "ascending" : "descending") : "none"}
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort("date")}
                    aria-label={`Sort by date${sortKey === "date" ? `, currently ${sortAsc ? "ascending" : "descending"}` : ""}`}
                  >
                    Date
                    <SortIndicator field="date" sortKey={sortKey} sortAsc={sortAsc} />
                  </button>
                </TableHead>
                <TableHead
                  className="bg-muted/60 text-xs font-medium"
                  aria-sort={sortKey === "client_name" ? (sortAsc ? "ascending" : "descending") : "none"}
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort("client_name")}
                    aria-label={`Sort by client${sortKey === "client_name" ? `, currently ${sortAsc ? "ascending" : "descending"}` : ""}`}
                  >
                    Client
                    <SortIndicator field="client_name" sortKey={sortKey} sortAsc={sortAsc} />
                  </button>
                </TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">Severity</TableHead>
                <TableHead
                  className="bg-muted/60 text-xs font-medium"
                  aria-sort={sortKey === "weighted_total" ? (sortAsc ? "ascending" : "descending") : "none"}
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort("weighted_total")}
                    aria-label={`Sort by overall score${sortKey === "weighted_total" ? `, currently ${sortAsc ? "ascending" : "descending"}` : ""}`}
                  >
                    Overall
                    <SortIndicator field="weighted_total" sortKey={sortKey} sortAsc={sortAsc} />
                  </button>
                </TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">Pacing</TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">CPA</TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">Conv Quality</TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">Reasons</TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">Status / Action</TableHead>
                <TableHead className="bg-muted/60 text-xs font-medium">Responded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((alert) => {
                const isUnresolved = alert.response_notes === null;
                const isCritical =
                  (alert.weighted_total != null && alert.weighted_total < 60) ||
                  (alert.spend_pacing_score != null && alert.spend_pacing_score < 40) ||
                  (alert.cpa_score != null && alert.cpa_score < 40) ||
                  (alert.conv_quality_score != null && alert.conv_quality_score < 40);

                const reasons: string[] = alert.triggered_reasons ?? [];
                const visibleReasons = reasons.slice(0, 2);
                const hiddenCount = reasons.length - 2;

                const clientLink = `/clients/${alert.client_id}?date=${alert.date}#alerts`;

                return (
                  <TableRow
                    key={alert.id}
                    className={
                      isUnresolved && isCritical
                        ? "bg-red-50/40 border-l-4 border-l-red-500 dark:bg-red-950/10 hover:bg-red-50/60"
                        : isUnresolved
                          ? "bg-amber-50/50 border-l-4 border-l-amber-500 dark:bg-amber-950/10 hover:bg-amber-50/70"
                          : "hover:bg-muted/40 transition-colors"
                    }
                  >
                    {/* Date — deep-links to client detail #alerts section */}
                    <TableCell className="font-medium whitespace-nowrap text-sm">
                      <Link
                        href={clientLink}
                        className="inline-flex items-center gap-1.5 hover:underline hover:text-primary"
                        aria-label={`View alert for ${alert.client_name} on ${format(parseISO(alert.date), "MMM dd, yyyy")}`}
                      >
                        {format(parseISO(alert.date), "MMM dd, yyyy")}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </TableCell>

                    {/* Client */}
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      <Link
                        href={clientLink}
                        className="hover:underline hover:text-primary"
                      >
                        {alert.store_name ?? alert.client_name}
                      </Link>
                    </TableCell>

                    {/* Severity badge */}
                    <TableCell>
                      <SeverityBadge alert={alert} />
                    </TableCell>

                    {/* Scores */}
                    <TableCell>
                      <ScoreCell value={alert.weighted_total} />
                    </TableCell>
                    <TableCell>
                      <ScoreCell value={alert.spend_pacing_score} />
                    </TableCell>
                    <TableCell>
                      <ScoreCell value={alert.cpa_score} />
                    </TableCell>
                    <TableCell>
                      <ScoreCell value={alert.conv_quality_score} />
                    </TableCell>

                    {/* Triggered reasons */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {visibleReasons.map((reason, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] font-normal whitespace-nowrap"
                          >
                            {reason}
                          </Badge>
                        ))}
                        {hiddenCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            +{hiddenCount} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Status / Action */}
                    <TableCell>
                      {alert.response_notes ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-xs text-muted-foreground max-w-[180px] truncate" title={alert.response_notes}>
                            {alert.response_notes}
                          </span>
                        </div>
                      ) : isAdmin || (userEmail && userEmail === alert.mb_assigned) ? (
                        <RespondDialog
                          alertId={alert.id}
                          alertDate={format(parseISO(alert.date), "MMM dd, yyyy")}
                          clientName={alert.store_name ?? alert.client_name}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle
                            className="h-3.5 w-3.5 text-amber-500 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-xs text-muted-foreground italic">
                            Pending response
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* Responded by — shows who responded and when (resolved only) */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {alert.responded_by ? (
                        <span title={alert.responded_by}>
                          {alert.responded_by.length > 24
                            ? alert.responded_by.slice(0, 22) + "…"
                            : alert.responded_by}
                        </span>
                      ) : (
                        <span aria-label="Not yet responded">&mdash;</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
