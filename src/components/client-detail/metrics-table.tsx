"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnOrderState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Columns3,
  Download,
  Info,
  GripVertical,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatRoas } from "@/lib/utils/formatting";
import { HealthRing } from "@/components/client-detail/health-ring";
import type { MetricsTableRow } from "@/lib/types/database";

interface MetricsTableProps {
  data: MetricsTableRow[];
  days?: number;
}

const RANGE_OPTIONS = [14, 30, 90];

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const EM_DASH = "\u2014";

type Agg = "sum" | "avg" | "none";

type ColumnMeta = {
  label: string;
  agg: Agg;
};

function SortableHeader({
  column,
  children,
}: {
  column: {
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | "asc" | "desc";
  };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${typeof children === "string" ? children : "column"}${sorted ? `, currently ${sorted}ending` : ""}`}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ArrowDown
          className="ml-1 h-3.5 w-3.5 text-primary"
          aria-hidden="true"
        />
      ) : (
        <ArrowUpDown
          className="ml-1 h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </Button>
  );
}

// ── CSV export ───────────────────────────────────────────────────────────────
function toCsv(
  headers: Array<{ id: string; label: string }>,
  rows: MetricsTableRow[]
): string {
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map((h) => escape(h.label)).join(",");
  const body = rows
    .map((r) =>
      headers
        .map((h) => {
          const v = r[h.id as keyof MetricsTableRow];
          if (h.id === "ctr" && typeof v === "number") {
            return escape((v * 100).toFixed(4) + "%");
          }
          if (
            (h.id === "search_impression_share" ||
              h.id === "search_budget_lost_is") &&
            typeof v === "number"
          ) {
            return escape(v.toFixed(2) + "%");
          }
          if (typeof v === "number") return escape(v);
          return escape(v);
        })
        .join(",")
    )
    .join("\n");
  return head + "\n" + body;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Aggregate calculator for footer ──────────────────────────────────────────
function computeFooter(rows: MetricsTableRow[]) {
  if (rows.length === 0) return null;

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const keys: Array<keyof MetricsTableRow> = [
    "cost",
    "conversions",
    "conversion_value",
    "clicks",
    "impressions",
    "search_impression_share",
    "search_budget_lost_is",
    "weighted_total",
  ];
  for (const k of keys) {
    sums[k as string] = 0;
    counts[k as string] = 0;
  }
  for (const r of rows) {
    for (const k of keys) {
      const v = r[k];
      if (v != null && !Number.isNaN(Number(v))) {
        sums[k as string] += Number(v);
        counts[k as string] += 1;
      }
    }
  }

  const avgIS =
    counts.search_impression_share > 0
      ? sums.search_impression_share / counts.search_impression_share
      : null;
  const avgLostIS =
    counts.search_budget_lost_is > 0
      ? sums.search_budget_lost_is / counts.search_budget_lost_is
      : null;
  const totalClicks = sums.clicks;
  const totalImpressions = sums.impressions;

  return {
    cost: counts.cost > 0 ? sums.cost : null,
    conversions: counts.conversions > 0 ? sums.conversions : null,
    conversion_value:
      counts.conversion_value > 0 ? sums.conversion_value : null,
    clicks: counts.clicks > 0 ? totalClicks : null,
    impressions: counts.impressions > 0 ? totalImpressions : null,
    roas:
      counts.cost > 0 && sums.cost > 0
        ? sums.conversion_value / sums.cost
        : null,
    cpa:
      counts.conversions > 0 && sums.conversions > 0
        ? sums.cost / sums.conversions
        : null,
    aov:
      counts.conversions > 0 && sums.conversions > 0
        ? sums.conversion_value / sums.conversions
        : null,
    ctr:
      totalImpressions > 0 ? totalClicks / totalImpressions : null, // ctr stored as fraction
    cpc: totalClicks > 0 ? sums.cost / totalClicks : null,
    search_impression_share: avgIS,
    search_budget_lost_is: avgLostIS,
    weighted_total:
      counts.weighted_total > 0
        ? sums.weighted_total / counts.weighted_total
        : null,
  };
}

const COLUMN_ORDER_STORAGE_KEY = "metrics-table-column-order";

export function MetricsTable({ data, days = 14 }: MetricsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    {}
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragColRef = useRef<string | null>(null);

  const columns: ColumnDef<MetricsTableRow>[] = useMemo(
    () => [
      {
        id: "date",
        accessorKey: "date",
        enableHiding: false,
        meta: { label: "Date", agg: "none" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Date</SortableHeader>
        ),
        cell: ({ row }) => {
          const d = parseLocalDate(row.getValue<string>("date"));
          return (
            <span className="font-medium">
              {d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          );
        },
      },
      {
        id: "cost",
        accessorKey: "cost",
        meta: { label: "Spend", agg: "sum" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Spend</SortableHeader>
        ),
        cell: ({ row }) => formatCurrency(row.getValue<number | null>("cost")),
      },
      {
        id: "roas",
        accessorKey: "roas",
        meta: { label: "ROAS", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>ROAS</SortableHeader>
        ),
        cell: ({ row }) => formatRoas(row.getValue<number | null>("roas")),
      },
      {
        id: "cpa",
        accessorKey: "cpa",
        meta: { label: "CPA", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>CPA</SortableHeader>
        ),
        cell: ({ row }) => formatCurrency(row.getValue<number | null>("cpa")),
      },
      {
        id: "conversions",
        accessorKey: "conversions",
        meta: { label: "Conversions", agg: "sum" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Conversions</SortableHeader>
        ),
        cell: ({ row }) =>
          formatNumber(row.getValue<number | null>("conversions"), {
            decimals: 1,
          }),
      },
      {
        id: "conversion_value",
        accessorKey: "conversion_value",
        meta: { label: "Conv Value", agg: "sum" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Conv Value</SortableHeader>
        ),
        cell: ({ row }) =>
          formatCurrency(row.getValue<number | null>("conversion_value")),
      },
      {
        id: "aov",
        accessorKey: "aov",
        meta: { label: "AOV", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>AOV</SortableHeader>
        ),
        cell: ({ row }) => formatCurrency(row.getValue<number | null>("aov")),
      },
      {
        id: "search_impression_share",
        accessorKey: "search_impression_share",
        meta: { label: "IS", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>IS</SortableHeader>
        ),
        cell: ({ row }) => {
          const v = row.getValue<number | null>("search_impression_share");
          if (v == null) return EM_DASH;
          return `${Number(v).toFixed(1)}%`;
        },
      },
      {
        id: "search_budget_lost_is",
        accessorKey: "search_budget_lost_is",
        meta: { label: "Lost IS (Budget)", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Lost IS (Budget)</SortableHeader>
        ),
        cell: ({ row }) => {
          const v = row.getValue<number | null>("search_budget_lost_is");
          if (v == null) return EM_DASH;
          const n = Number(v);
          return (
            <span
              className={cn(
                n >= 10 && "text-amber-600 dark:text-amber-400 font-semibold"
              )}
            >
              {n.toFixed(1)}%
            </span>
          );
        },
      },
      {
        id: "ctr",
        accessorKey: "ctr",
        meta: { label: "CTR", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>CTR</SortableHeader>
        ),
        cell: ({ row }) => {
          const ctr = row.getValue<number | null>("ctr");
          if (ctr == null) return EM_DASH;
          return `${(Number(ctr) * 100).toFixed(2)}%`;
        },
      },
      {
        id: "cpc",
        accessorKey: "cpc",
        meta: { label: "CPC", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>CPC</SortableHeader>
        ),
        cell: ({ row }) => formatCurrency(row.getValue<number | null>("cpc")),
      },
      {
        id: "clicks",
        accessorKey: "clicks",
        meta: { label: "Clicks", agg: "sum" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Clicks</SortableHeader>
        ),
        cell: ({ row }) => formatNumber(row.getValue<number | null>("clicks")),
      },
      {
        id: "impressions",
        accessorKey: "impressions",
        meta: { label: "Impressions", agg: "sum" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Impressions</SortableHeader>
        ),
        cell: ({ row }) =>
          formatNumber(row.getValue<number | null>("impressions")),
      },
      {
        id: "weighted_total",
        accessorKey: "weighted_total",
        meta: { label: "Health", agg: "avg" } satisfies ColumnMeta,
        header: ({ column }) => (
          <SortableHeader column={column}>Health</SortableHeader>
        ),
        cell: ({ row }) => {
          const score = row.getValue<number | null>("weighted_total");
          if (score == null) return EM_DASH;
          return <HealthRing score={score} size="md" />;
        },
      },
    ],
    []
  );

  // Initialize / restore column order
  useEffect(() => {
    const defaultOrder = columns.map((c) => c.id as string);
    if (typeof window === "undefined") {
      setColumnOrder(defaultOrder);
      return;
    }
    try {
      const saved = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Ensure the saved order still contains every column (handle added/removed)
        const missing = defaultOrder.filter((id) => !parsed.includes(id));
        const valid = parsed.filter((id) => defaultOrder.includes(id));
        setColumnOrder([...valid, ...missing]);
        return;
      }
    } catch {
      // ignore
    }
    setColumnOrder(defaultOrder);
  }, [columns]);

  useEffect(() => {
    if (columnOrder.length === 0 || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        COLUMN_ORDER_STORAGE_KEY,
        JSON.stringify(columnOrder)
      );
    } catch {
      // ignore
    }
  }, [columnOrder]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Track horizontal scroll for sticky column shadow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setIsScrolled(el.scrollLeft > 4);
    handler();
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const handleRangeChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === String(RANGE_OPTIONS[0])) {
        params.delete("range");
      } else {
        params.set("range", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleExportCsv = useCallback(() => {
    const visibleCols = table
      .getVisibleLeafColumns()
      .map((c) => ({
        id: c.id,
        label:
          (c.columnDef.meta as ColumnMeta | undefined)?.label ?? c.id,
      }));
    const rows = table.getSortedRowModel().rows.map((r) => r.original);
    const csv = toCsv(visibleCols, rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`metrics-${days}d-${today}.csv`, csv);
  }, [table, days]);

  const footer = useMemo(
    () => computeFooter(table.getFilteredRowModel().rows.map((r) => r.original)),
    [table, data] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDragStart = (colId: string) => (e: React.DragEvent) => {
    dragColRef.current = colId;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const src = dragColRef.current;
    dragColRef.current = null;
    if (!src || src === targetId) return;
    setColumnOrder((order) => {
      const current = order.length ? [...order] : columns.map((c) => c.id as string);
      const from = current.indexOf(src);
      const to = current.indexOf(targetId);
      if (from === -1 || to === -1) return current;
      current.splice(from, 1);
      current.splice(to, 0, src);
      return current;
    });
  };

  // Footer aggregate formatter
  const renderFooterCell = (colId: string): React.ReactNode => {
    if (!footer) return null;
    const agg = (columns.find((c) => c.id === colId)?.meta as
      | ColumnMeta
      | undefined)?.agg;
    if (colId === "date") {
      return (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Totals / Avg
        </span>
      );
    }
    if (!agg || agg === "none") return null;
    switch (colId) {
      case "cost":
      case "conversion_value":
        return formatCurrency(footer[colId as "cost" | "conversion_value"]);
      case "conversions":
        return formatNumber(footer.conversions, { decimals: 1 });
      case "clicks":
      case "impressions":
        return formatNumber(footer[colId as "clicks" | "impressions"]);
      case "roas":
        return formatRoas(footer.roas);
      case "cpa":
      case "cpc":
      case "aov":
        return formatCurrency(footer[colId as "cpa" | "cpc" | "aov"]);
      case "ctr":
        return footer.ctr != null
          ? `${(footer.ctr * 100).toFixed(2)}%`
          : EM_DASH;
      case "search_impression_share":
        return footer.search_impression_share != null
          ? `${footer.search_impression_share.toFixed(1)}%`
          : EM_DASH;
      case "search_budget_lost_is":
        return footer.search_budget_lost_is != null
          ? `${footer.search_budget_lost_is.toFixed(1)}%`
          : EM_DASH;
      case "weighted_total":
        return footer.weighted_total != null ? (
          <HealthRing score={footer.weighted_total} size="md" animate={false} />
        ) : (
          EM_DASH
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Daily Metrics
          </h3>
          <p className="text-xs text-muted-foreground">
            Last {days} days · {data.length} row{data.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                Legend
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded bg-red-50 ring-1 ring-red-200 dark:bg-red-950/40" />
                  <span>Row: overall health &lt; 60</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-4 w-1 rounded-sm bg-amber-400" />
                  <span>Left border: one or more dimension scores &lt; 40</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    10%+
                  </span>
                  <span>Lost IS (Budget) highlighted</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={String(days)} onValueChange={handleRangeChange}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  Last {n} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleExportCsv}
            disabled={data.length === 0}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => {
                  const label =
                    (col.columnDef.meta as ColumnMeta | undefined)?.label ??
                    col.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="text-xs"
                      checked={col.getIsVisible()}
                      onCheckedChange={(value) =>
                        col.toggleVisibility(!!value)
                      }
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto px-4 pb-4">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-t bg-muted/40 hover:bg-muted/40 h-9"
              >
                {headerGroup.headers.map((header, headerIndex) => {
                  const sorted = header.column.getIsSorted();
                  const ariaSort:
                    | "ascending"
                    | "descending"
                    | "none" =
                    sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : "none";
                  const isDateCol = headerIndex === 0;
                  const colId = header.column.id;
                  return (
                    <TableHead
                      key={header.id}
                      draggable={!isDateCol}
                      onDragStart={handleDragStart(colId)}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop(colId)}
                      className={cn(
                        "whitespace-nowrap text-xs font-medium select-none",
                        !isDateCol && "cursor-grab active:cursor-grabbing",
                        isDateCol
                          ? cn(
                              "sticky left-0 z-20 bg-muted/40",
                              isScrolled &&
                                "shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                            )
                          : "bg-muted/40"
                      )}
                      aria-sort={ariaSort}
                    >
                      <div className="flex items-center gap-0.5">
                        {!isDateCol && (
                          <GripVertical
                            className="h-3 w-3 text-muted-foreground/40 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart3
                      className="h-8 w-8 opacity-30"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium">No metrics data yet</p>
                    <p className="text-xs max-w-xs">
                      Daily metrics appear here once the data pipeline runs. Check back after the next scheduled pull (06:00 UTC).
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const weightedTotal = row.original.weighted_total;
                const pacingScore = row.original.spend_pacing_score;
                const cpaScore = row.original.cpa_score;
                const convScore = row.original.conv_quality_score;

                const isBelowSixty =
                  weightedTotal != null && Number(weightedTotal) < 60;
                const hasCriticalDimension =
                  (pacingScore != null && Number(pacingScore) < 40) ||
                  (cpaScore != null && Number(cpaScore) < 40) ||
                  (convScore != null && Number(convScore) < 40);

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      isBelowSixty &&
                        "bg-red-50/50 hover:bg-red-100/60 dark:bg-red-950/20",
                      hasCriticalDimension &&
                        !isBelowSixty &&
                        "border-l-4 border-l-amber-400"
                    )}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const isDateCell = cellIndex === 0;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "whitespace-nowrap tabular-nums text-sm py-2.5",
                            !isDateCell && "font-display",
                            isDateCell &&
                              cn(
                                "sticky left-0 z-10 bg-card",
                                isScrolled &&
                                  "shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                              ),
                            isBelowSixty &&
                              isDateCell &&
                              "bg-red-50/50 dark:bg-red-950/20"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {data.length > 0 && footer && (
            <TableFooter>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-t">
                {table.getVisibleLeafColumns().map((col, idx) => {
                  const isDateCell = idx === 0;
                  return (
                    <TableCell
                      key={col.id}
                      className={cn(
                        "whitespace-nowrap tabular-nums text-sm py-2.5 font-semibold",
                        isDateCell &&
                          cn(
                            "sticky left-0 z-10 bg-muted/50",
                            isScrolled &&
                              "shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                          )
                      )}
                    >
                      {renderFooterCell(col.id)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
