"use client";

import { useState, useMemo, Fragment } from "react";
import {
  getCampaignTypeLabel,
  getCampaignStatusColor,
} from "@/lib/utils/campaign-types";
import {
  formatCurrency,
  formatNumber,
  formatRoas,
  formatPercent,
  formatPercentRaw,
} from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { cn } from "@/lib/utils";
import type { CampaignMetric } from "@/lib/types/database";

interface CampaignBreakdownProps {
  campaigns: CampaignMetric[];
}

interface TypeAggregate {
  label: string;
  color: string;
  percentage: number;
  cost: number;
  conversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
}

type SortKey =
  | "campaign_name"
  | "campaign_type"
  | "campaign_status"
  | "cost"
  | "clicks"
  | "conversions"
  | "conversion_value"
  | "roas"
  | "cpa"
  | "impressions"
  | "ctr"
  | "cpc"
  | "search_impression_share";

type OptionalColumnKey = "impressions" | "ctr" | "cpc" | "search_impression_share";

type CampaignStatus = "ENABLED" | "PAUSED" | "REMOVED";

const DONUT_COLORS = [
  "#059669", // emerald
  "#2563eb", // blue
  "#d97706", // amber
  "#7c3aed", // violet
  "#dc2626", // red
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#65a30d", // lime
];

function humanizeStatus(status: string): string {
  const map: Record<string, string> = {
    ENABLED: "Enabled",
    PAUSED: "Paused",
    REMOVED: "Removed",
  };
  return map[status] ?? (status.charAt(0) + status.slice(1).toLowerCase());
}

function SpendDonut({ aggregates }: { aggregates: TypeAggregate[] }) {
  const total = aggregates.reduce((sum, a) => sum + a.cost, 0);
  if (total === 0) return null;

  let cumPct = 0;
  const segments = aggregates.map((a) => {
    const start = cumPct;
    cumPct += a.percentage;
    return { ...a, start };
  });

  const gradient = `conic-gradient(${segments
    .map((s) => `${s.color} ${s.start}% ${s.start + s.percentage}%`)
    .join(", ")})`;

  return (
    <div
      className="h-20 w-20 rounded-full flex-shrink-0"
      role="img"
      aria-label={`Spend by type: ${aggregates.map((a) => `${a.label} ${a.percentage.toFixed(0)}%`).join(", ")}`}
      style={{
        background: gradient,
        mask: "radial-gradient(farthest-side, transparent 58%, black 58%)",
        WebkitMask: "radial-gradient(farthest-side, transparent 58%, black 58%)",
      }}
    />
  );
}

export function CampaignBreakdown({ campaigns }: CampaignBreakdownProps) {
  const [statusFilter, setStatusFilter] = useState<Set<CampaignStatus>>(
    () => new Set<CampaignStatus>(["ENABLED", "PAUSED"])
  );
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumnKey>>(
    () => new Set<OptionalColumnKey>()
  );
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showImpressions = visibleColumns.has("impressions");
  const showCtr = visibleColumns.has("ctr");
  const showCpc = visibleColumns.has("cpc");
  const showSearchImpShare = visibleColumns.has("search_impression_share");

  function toggleStatus(status: CampaignStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleColumn(key: OptionalColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const statusLabel =
    statusFilter.size === 3
      ? "Status (All)"
      : `Status (${statusFilter.size})`;

  const typeAggregates = useMemo<TypeAggregate[]>(() => {
    const groups: Record<
      string,
      { cost: number; conversions: number; revenue: number }
    > = {};

    campaigns.forEach((c) => {
      const label = getCampaignTypeLabel(c.campaign_type);
      if (!groups[label]) groups[label] = { cost: 0, conversions: 0, revenue: 0 };
      groups[label].cost += Number(c.cost) || 0;
      groups[label].conversions += Number(c.conversions) || 0;
      groups[label].revenue += Number(c.conversion_value) || 0;
    });

    const sorted = Object.entries(groups).sort(([, a], [, b]) => b.cost - a.cost);
    const totalSpend = sorted.reduce((sum, [, g]) => sum + g.cost, 0);

    return sorted.map(([label, data], i) => ({
      label,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      percentage: totalSpend > 0 ? (data.cost / totalSpend) * 100 : 0,
      cost: Math.round(data.cost * 100) / 100,
      conversions: Math.round(data.conversions * 100) / 100,
      revenue: Math.round(data.revenue * 100) / 100,
      roas: data.cost > 0 ? Math.round((data.revenue / data.cost) * 100) / 100 : null,
      cpa:
        data.conversions > 0
          ? Math.round((data.cost / data.conversions) * 100) / 100
          : null,
    }));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    let result = campaigns.filter((c) => {
      const status = (c.campaign_status || "") as CampaignStatus;
      if (!statusFilter.has(status)) return false;
      if (searchTerm) {
        const name = (c.campaign_name || "").toLowerCase();
        if (!name.includes(searchTerm)) return false;
      }
      return true;
    });
    result = [...result];
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return result;
  }, [campaigns, statusFilter, search, sortKey, sortAsc]);

  const topSpenderId = useMemo(() => {
    if (filteredCampaigns.length === 0) return null;
    return (
      [...filteredCampaigns].sort(
        (a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0)
      )[0]?.id ?? null
    );
  }, [filteredCampaigns]);

  const worstRoasId = useMemo(() => {
    const withSpend = filteredCampaigns.filter(
      (c) => Number(c.cost) > 0 && c.roas != null
    );
    if (withSpend.length === 0) return null;
    return (
      [...withSpend].sort(
        (a, b) => (Number(a.roas) || 0) - (Number(b.roas) || 0)
      )[0]?.id ?? null
    );
  }, [filteredCampaigns]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Layers className="h-5 w-5" />
          <span className="text-sm">No campaign data available for this date.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Tabs defaultValue="by-type" className="p-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="by-type">By Type</TabsTrigger>
            <TabsTrigger value="all-campaigns">
              All Campaigns ({campaigns.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── BY TYPE ── */}
        <TabsContent value="by-type" className="data-[state=active]:animate-fade-in">
          <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-start">
            {/* Type table with inline spend bars */}
            <div className="min-w-0 flex-1 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 h-9">
                    <TableHead className="pl-3 text-xs font-medium">Type</TableHead>
                    <TableHead className="w-36 text-xs font-medium">Spend share</TableHead>
                    <TableHead className="text-right text-xs font-medium">Spend</TableHead>
                    <TableHead className="text-right text-xs font-medium">Conv.</TableHead>
                    <TableHead className="text-right text-xs font-medium">Revenue</TableHead>
                    <TableHead className="text-right text-xs font-medium">ROAS</TableHead>
                    <TableHead className="pr-3 text-right text-xs font-medium">CPA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeAggregates.map((t) => (
                    <TableRow key={t.label} className="hover:bg-muted/30">
                      <TableCell className="pl-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${t.percentage}%`,
                                backgroundColor: t.color,
                              }}
                            />
                          </div>
                          <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
                            {t.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-display">
                        {formatCurrency(t.cost)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-display">
                        {formatNumber(t.conversions, { decimals: 1 })}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-display">
                        {formatCurrency(t.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-display">
                        {formatRoas(t.roas)}
                      </TableCell>
                      <TableCell className="pr-3 text-right text-sm tabular-nums font-display">
                        {formatCurrency(t.cpa)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Compact donut */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20 p-5 md:w-44 md:flex-shrink-0">
              <SpendDonut aggregates={typeAggregates} />
              <div className="space-y-1.5 w-full">
                {typeAggregates.map((t) => (
                  <div key={t.label} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="flex-1 truncate text-muted-foreground">{t.label}</span>
                    <span className="font-medium tabular-nums">{t.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── ALL CAMPAIGNS ── */}
        <TabsContent value="all-campaigns" className="data-[state=active]:animate-fade-in">
          <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">
                {filteredCampaigns.length} campaign
                {filteredCampaigns.length !== 1 ? "s" : ""}
                <span className="ml-1.5 text-xs opacity-60">
                  — click a row for details
                </span>
              </span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-50 ring-1 ring-emerald-400/60 dark:bg-emerald-950/40" />
                  Top spender
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-50 ring-1 ring-rose-400/60 dark:bg-rose-950/40" />
                  Lowest ROAS
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns…"
                className="h-8 w-48 text-xs"
                aria-label="Search campaigns"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    {statusLabel}
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel className="text-xs">Show status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.has("ENABLED")}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleStatus("ENABLED")}
                    className="text-xs"
                  >
                    Enabled
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.has("PAUSED")}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleStatus("PAUSED")}
                    className="text-xs"
                  >
                    Paused
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.has("REMOVED")}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleStatus("REMOVED")}
                    className="text-xs"
                  >
                    Removed
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    Columns ({visibleColumns.size})
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">
                    Optional columns
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={showImpressions}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleColumn("impressions")}
                    className="text-xs"
                  >
                    Impressions
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showCtr}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleColumn("ctr")}
                    className="text-xs"
                  >
                    CTR
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showCpc}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleColumn("cpc")}
                    className="text-xs"
                  >
                    CPC
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showSearchImpShare}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() =>
                      toggleColumn("search_impression_share")
                    }
                    className="text-xs"
                  >
                    Search Imp. Share
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 h-9">
                  <TableHead className="w-8 pl-3" />
                  <TableHead className="text-xs font-medium">
                    <SortableTableHeader
                      label="Campaign"
                      sorted={sortKey === "campaign_name" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("campaign_name")}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium">
                    <SortableTableHeader
                      label="Type"
                      sorted={sortKey === "campaign_type" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("campaign_type")}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium">
                    <SortableTableHeader
                      label="Status"
                      sorted={sortKey === "campaign_status" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("campaign_status")}
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    <SortableTableHeader
                      label="Spend"
                      sorted={sortKey === "cost" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("cost")}
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    <SortableTableHeader
                      label="Clicks"
                      sorted={sortKey === "clicks" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("clicks")}
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    <SortableTableHeader
                      label="Conv."
                      sorted={sortKey === "conversions" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("conversions")}
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    <SortableTableHeader
                      label="Revenue"
                      sorted={sortKey === "conversion_value" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("conversion_value")}
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    <SortableTableHeader
                      label="ROAS"
                      sorted={sortKey === "roas" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("roas")}
                    />
                  </TableHead>
                  <TableHead
                    className={cn(
                      "text-right text-xs font-medium",
                      !showImpressions && !showCtr && !showCpc && !showSearchImpShare && "pr-3"
                    )}
                  >
                    <SortableTableHeader
                      label="CPA"
                      sorted={sortKey === "cpa" ? (sortAsc ? "asc" : "desc") : false}
                      onSort={() => handleSort("cpa")}
                    />
                  </TableHead>
                  {showImpressions && (
                    <TableHead
                      className={cn(
                        "text-right text-xs font-medium",
                        !showCtr && !showCpc && !showSearchImpShare && "pr-3"
                      )}
                    >
                      <SortableTableHeader
                        label="Impr."
                        sorted={sortKey === "impressions" ? (sortAsc ? "asc" : "desc") : false}
                        onSort={() => handleSort("impressions")}
                      />
                    </TableHead>
                  )}
                  {showCtr && (
                    <TableHead
                      className={cn(
                        "text-right text-xs font-medium",
                        !showCpc && !showSearchImpShare && "pr-3"
                      )}
                    >
                      <SortableTableHeader
                        label="CTR"
                        sorted={sortKey === "ctr" ? (sortAsc ? "asc" : "desc") : false}
                        onSort={() => handleSort("ctr")}
                      />
                    </TableHead>
                  )}
                  {showCpc && (
                    <TableHead
                      className={cn(
                        "text-right text-xs font-medium",
                        !showSearchImpShare && "pr-3"
                      )}
                    >
                      <SortableTableHeader
                        label="CPC"
                        sorted={sortKey === "cpc" ? (sortAsc ? "asc" : "desc") : false}
                        onSort={() => handleSort("cpc")}
                      />
                    </TableHead>
                  )}
                  {showSearchImpShare && (
                    <TableHead className="pr-3 text-right text-xs font-medium">
                      <SortableTableHeader
                        label="Imp. Share"
                        sorted={
                          sortKey === "search_impression_share"
                            ? (sortAsc ? "asc" : "desc")
                            : false
                        }
                        onSort={() => handleSort("search_impression_share")}
                      />
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((c) => {
                  const statusColor = getCampaignStatusColor(c.campaign_status);
                  const isTopSpender = c.id === topSpenderId;
                  const isWorstRoas = c.id === worstRoasId && c.id !== topSpenderId;
                  const isExpanded = expandedId === c.id;

                  return (
                    <Fragment key={c.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                          isTopSpender
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70"
                            : isWorstRoas
                              ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70"
                              : "hover:bg-muted/40 transition-colors"
                        )}
                        onClick={() => toggleExpand(c.id)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} details for campaign ${c.campaign_name || "Unnamed"}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            // Prevent Space from scrolling the page
                            e.preventDefault();
                            toggleExpand(c.id);
                          }
                        }}
                      >
                        <TableCell className="pl-3 w-8">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-sm font-medium"
                          title={c.campaign_name || undefined}
                        >
                          {c.campaign_name || "Unnamed"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {getCampaignTypeLabel(c.campaign_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                c.campaign_status === "ENABLED"
                                  ? "bg-emerald-500"
                                  : c.campaign_status === "PAUSED"
                                    ? "bg-gray-400"
                                    : "bg-red-500"
                              )}
                            />
                            {humanizeStatus(c.campaign_status || "Unknown")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-display">
                          {formatCurrency(c.cost)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-display">
                          {formatNumber(c.clicks)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-display">
                          {formatNumber(c.conversions, { decimals: 1 })}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-display">
                          {formatCurrency(c.conversion_value)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-display">
                          {formatRoas(c.roas)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-sm tabular-nums font-display",
                            !showImpressions && !showCtr && !showCpc && !showSearchImpShare && "pr-3"
                          )}
                        >
                          {formatCurrency(c.cpa)}
                        </TableCell>
                        {showImpressions && (
                          <TableCell
                            className={cn(
                              "text-right text-sm tabular-nums font-display",
                              !showCtr && !showCpc && !showSearchImpShare && "pr-3"
                            )}
                          >
                            {formatNumber(c.impressions, { compact: true })}
                          </TableCell>
                        )}
                        {showCtr && (
                          <TableCell
                            className={cn(
                              "text-right text-sm tabular-nums font-display",
                              !showCpc && !showSearchImpShare && "pr-3"
                            )}
                          >
                            {formatPercent(c.ctr)}
                          </TableCell>
                        )}
                        {showCpc && (
                          <TableCell
                            className={cn(
                              "text-right text-sm tabular-nums font-display",
                              !showSearchImpShare && "pr-3"
                            )}
                          >
                            {formatCurrency(c.cpc)}
                          </TableCell>
                        )}
                        {showSearchImpShare && (
                          <TableCell className="pr-3 text-right text-sm tabular-nums font-display">
                            {c.search_impression_share != null
                              ? formatPercentRaw(c.search_impression_share, 1)
                              : "—"}
                          </TableCell>
                        )}
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={10 + visibleColumns.size} className="p-0">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t bg-muted/25 px-12 py-3 sm:grid-cols-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Impressions</p>
                                <p className="text-sm font-medium tabular-nums">
                                  {formatNumber(c.impressions, { compact: true })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">CTR</p>
                                <p className="text-sm font-medium tabular-nums">
                                  {formatPercent(c.ctr)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">CPC</p>
                                <p className="text-sm font-medium tabular-nums">
                                  {formatCurrency(c.cpc)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Search Imp. Share</p>
                                <p className="text-sm font-medium tabular-nums">
                                  {c.search_impression_share != null
                                    ? formatPercentRaw(c.search_impression_share, 1)
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}

                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10 + visibleColumns.size}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No campaigns to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
