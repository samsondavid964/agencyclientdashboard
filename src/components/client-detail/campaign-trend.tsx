"use client";

import { useState, useMemo, useEffect } from "react";
import { LineChart } from "@tremor/react";
import { BarChart3, ChevronDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  formatCurrency,
  formatRoas,
  formatNumber,
} from "@/lib/utils/formatting";
import type { CampaignTrendRow } from "@/lib/queries/campaigns";

interface CampaignTrendProps {
  data: CampaignTrendRow[];
}

type Metric = "cost" | "roas" | "conversions" | "cpa" | "clicks";
type RangeDays = 7 | 14 | 30;

const METRIC_OPTIONS: { key: Metric; label: string }[] = [
  { key: "cost", label: "Spend" },
  { key: "roas", label: "ROAS" },
  { key: "conversions", label: "Conversions" },
  { key: "cpa", label: "CPA" },
  { key: "clicks", label: "Clicks" },
];

const RANGE_OPTIONS: { days: RangeDays; label: string }[] = [
  { days: 7, label: "7d" },
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
];

// Tremor color palette (string names, not hex)
const TREMOR_COLORS = [
  "emerald",
  "blue",
  "amber",
  "violet",
  "red",
  "cyan",
  "fuchsia",
  "lime",
  "orange",
  "indigo",
] as const;

type TremorColor = (typeof TREMOR_COLORS)[number];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CampaignTrend({ data }: CampaignTrendProps) {
  const [metric, setMetric] = useState<Metric>("cost");
  const [rangeDays, setRangeDays] = useState<RangeDays>(14);

  // Filter to the selected window (data is sorted asc from query, up to 30 days)
  const windowedData = useMemo(() => {
    if (data.length === 0) return data;
    const uniqueDates = Array.from(new Set(data.map((r) => r.date))).sort();
    const keepDates = new Set(uniqueDates.slice(-rangeDays));
    return data.filter((r) => keepDates.has(r.date));
  }, [data, rangeDays]);

  // All campaigns in the window, sorted by total cost desc (for consistent color assignment)
  const allCampaignIds = useMemo<string[]>(() => {
    const totals = new Map<string, number>();
    for (const row of windowedData) {
      const prev = totals.get(row.campaign_id) ?? 0;
      totals.set(row.campaign_id, prev + (Number(row.cost) || 0));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [windowedData]);

  // Selected campaign_ids — default to top 5 by spend
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(allCampaignIds.slice(0, 5))
  );

  // Prune selection if a campaign disappears from the data set
  useEffect(() => {
    setSelectedIds((prev) => {
      const known = new Set(allCampaignIds);
      const next = new Set<string>();
      for (const id of prev) {
        if (known.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [allCampaignIds]);

  const visibleCampaignIds = useMemo(
    () => allCampaignIds.filter((id) => selectedIds.has(id)),
    [allCampaignIds, selectedIds]
  );

  // Build a name map (campaign_id → campaign_name)
  const nameMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const row of windowedData) {
      if (!map.has(row.campaign_id)) {
        map.set(row.campaign_id, row.campaign_name);
      }
    }
    return map;
  }, [windowedData]);

  // Collect all unique dates (already sorted asc from query)
  const dates = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const row of windowedData) seen.add(row.date);
    return Array.from(seen).sort();
  }, [windowedData]);

  // Build lookup: date → campaign_id → row
  const lookup = useMemo<Map<string, Map<string, CampaignTrendRow>>>(() => {
    const outer = new Map<string, Map<string, CampaignTrendRow>>();
    for (const row of windowedData) {
      if (!outer.has(row.date)) outer.set(row.date, new Map());
      outer.get(row.date)!.set(row.campaign_id, row);
    }
    return outer;
  }, [windowedData]);

  // Reshape into Tremor format: one row per date with a key per campaign name
  const chartData = useMemo(() => {
    return dates.map((dateStr: string) => {
      const dateRows = lookup.get(dateStr);
      const entry: Record<string, string | number | null> = {
        date: formatDate(dateStr),
      };
      for (const campaignId of visibleCampaignIds) {
        const name = nameMap.get(campaignId) ?? campaignId;
        const row = dateRows?.get(campaignId);
        const value = row ? row[metric] : null;
        entry[name] = value != null ? Number(value) : null;
      }
      return entry;
    });
  }, [dates, lookup, visibleCampaignIds, nameMap, metric]);

  // Category labels = visible campaign names (cost-sorted)
  const categories = useMemo(
    () =>
      visibleCampaignIds.map(
        (campaignId: string) => nameMap.get(campaignId) ?? campaignId
      ),
    [visibleCampaignIds, nameMap]
  );

  const colors = TREMOR_COLORS.slice(0, categories.length) as TremorColor[];

  const valueFormatter = (() => {
    switch (metric) {
      case "cost":
      case "cpa":
        return (v: number) => formatCurrency(v);
      case "roas":
        return (v: number) => formatRoas(v);
      case "clicks":
        return (v: number) => formatNumber(v);
      case "conversions":
        return (v: number) => formatNumber(v, { decimals: 1 });
    }
  })();

  const metricLabel =
    METRIC_OPTIONS.find((m) => m.key === metric)?.label ?? metric;

  const chartSummary = useMemo(() => {
    if (chartData.length === 0 || categories.length === 0) {
      return { ariaLabel: "", srDesc: "" };
    }
    type Extreme = { value: number; date: string; category: string };
    let minE: Extreme | null = null;
    let maxE: Extreme | null = null;
    let latest: Extreme | null = null;
    const lastRow = chartData[chartData.length - 1];
    for (const cat of categories) {
      const v = lastRow[cat];
      if (typeof v === "number" && (latest == null || v > latest.value)) {
        latest = { value: v, date: String(lastRow.date), category: cat };
      }
    }
    for (const row of chartData) {
      for (const cat of categories) {
        const v = row[cat];
        if (typeof v !== "number") continue;
        if (minE == null || v < minE.value)
          minE = { value: v, date: String(row.date), category: cat };
        if (maxE == null || v > maxE.value)
          maxE = { value: v, date: String(row.date), category: cat };
      }
    }
    const ariaLabel = latest
      ? `${rangeDays}-day campaign ${metricLabel} trend across ${categories.length} campaigns. Top on ${latest.date}: ${latest.category} at ${valueFormatter(latest.value)}.`
      : `${rangeDays}-day campaign ${metricLabel} trend across ${categories.length} campaigns.`;
    const srDesc =
      minE && maxE
        ? `${metricLabel} by day for ${categories.length} campaigns over ${chartData.length} days. Minimum ${valueFormatter(minE.value)} (${minE.category} on ${minE.date}), maximum ${valueFormatter(maxE.value)} (${maxE.category} on ${maxE.date}).`
        : `${metricLabel} by day for ${categories.length} campaigns over ${chartData.length} days.`;
    return { ariaLabel, srDesc };
  }, [chartData, categories, metricLabel, rangeDays, valueFormatter]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Campaign Trend
          </h3>
        </div>
        <div className="flex h-48 flex-col items-center justify-center gap-1 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            No campaign trend history in this window.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Try a wider date range or check back once more days of data are collected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Campaign Trend ({rangeDays} days)
            </h3>
            <p className="text-xs text-muted-foreground">
              {visibleCampaignIds.length === allCampaignIds.length
                ? `All ${allCampaignIds.length} campaigns`
                : `${visibleCampaignIds.length} of ${allCampaignIds.length} campaigns`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Select date range">
            {RANGE_OPTIONS.map((r) => (
              <Button
                key={r.days}
                variant={rangeDays === r.days ? "default" : "outline"}
                size="sm"
                onClick={() => setRangeDays(r.days)}
                className="h-7 text-xs"
              >
                {r.label}
              </Button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                Campaigns ({visibleCampaignIds.length}/{allCampaignIds.length})
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-auto">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  const allSelected =
                    selectedIds.size === allCampaignIds.length;
                  setSelectedIds(
                    allSelected ? new Set() : new Set(allCampaignIds)
                  );
                }}
                className="text-xs font-medium"
              >
                {selectedIds.size === allCampaignIds.length
                  ? "Clear all"
                  : "Select all"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {allCampaignIds.map((id) => {
                const name = nameMap.get(id) ?? id;
                return (
                  <DropdownMenuCheckboxItem
                    key={id}
                    checked={selectedIds.has(id)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(id);
                        else next.delete(id);
                        return next;
                      });
                    }}
                    className="text-xs"
                  >
                    <span className="truncate" title={name}>
                      {name}
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-wrap gap-1" role="group" aria-label="Select metric">
            {METRIC_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={metric === opt.key ? "default" : "outline"}
                size="sm"
                onClick={() => setMetric(opt.key)}
                className="h-7 text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div role="img" aria-label={chartSummary.ariaLabel}>
          <LineChart
            data={chartData}
            index="date"
            categories={categories}
            colors={colors}
            valueFormatter={valueFormatter}
            showLegend={true}
            showYAxis={true}
            showXAxis={true}
            yAxisWidth={64}
            curveType="monotone"
            connectNulls={false}
            className="h-64"
            rotateLabelX={{ angle: -30, verticalShift: 10, xAxisHeight: 40 }}
          />
          <span className="sr-only">{chartSummary.srDesc}</span>
        </div>
      </div>
    </div>
  );
}
