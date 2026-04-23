"use client";

import {
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Loader2,
  Bookmark,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatMBDisplay } from "@/lib/utils/display-name";
import {
  listSavedViews,
  saveView,
  deleteSavedView,
  type SavedView,
} from "@/lib/actions/saved-views";

interface FilterBarProps {
  mediaBuyers: string[];
  rightSlot?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "paused", label: "Paused" },
  { value: "churned", label: "Churned" },
  { value: "all", label: "All Statuses" },
];

const SORT_OPTIONS = [
  { value: "score-asc", label: "Score Low \u2192 High" },
  { value: "score-desc", label: "Score High \u2192 Low" },
  { value: "spend-desc", label: "Spend High \u2192 Low" },
  { value: "name-asc", label: "Name A \u2192 Z" },
];

const HEALTH_RANGES = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "healthy", label: "Healthy" },
];

// --- SavedViews sub-component (Supabase-backed, multi-device) ---

interface SavedViewsProps {
  currentParams: Record<string, string>;
  onLoad: (params: Record<string, string>) => void;
}

function SavedViews({ currentParams, onLoad }: SavedViewsProps) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();

  // Load from Supabase whenever the popover opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listSavedViews()
      .then((next) => setViews(next))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startSaving(async () => {
      const result = await saveView(trimmed, currentParams);
      if (result.success) {
        setNewName("");
        toast.success(`Saved view "${trimmed}"`);
        // Refresh list
        const next = await listSavedViews();
        setViews(next);
      } else {
        toast.error(result.message ?? "Failed to save view.");
      }
    });
  }, [newName, currentParams]);

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deleteSavedView(id);
      if (result.success) {
        setViews((prev) => prev.filter((v) => v.id !== id));
      } else {
        toast.error(result.message ?? "Failed to delete view.");
      }
    },
    []
  );

  const handleLoad = useCallback(
    (v: SavedView) => {
      onLoad(v.params);
      setOpen(false);
    },
    [onLoad]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-lg text-sm"
          aria-label="Saved views"
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
          Views
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Saved Views
        </p>

        {/* Saved presets list */}
        {loading ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Loading…
          </p>
        ) : views.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            No saved views yet
          </p>
        ) : (
          <ul className="mb-3 space-y-1">
            {views.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-1 rounded-lg border p-1.5"
              >
                <button
                  type="button"
                  onClick={() => handleLoad(v)}
                  className="flex-1 truncate text-left text-sm font-medium hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {v.name}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoad(v)}
                  className="h-7 px-2 text-xs"
                >
                  Load
                </Button>
                <button
                  type="button"
                  aria-label={`Delete view "${v.name}"`}
                  onClick={() => handleDelete(v.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Save current filters */}
        <div className="border-t pt-2.5">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Save current filters as a view
          </p>
          <div className="flex gap-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="View name..."
              className="h-8 flex-1 text-sm"
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!newName.trim() || isSaving}
              className="h-8 gap-1"
              aria-label="Save current filters"
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- FilterBar ---

export function FilterBar({ mediaBuyers, rightSlot }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Debounce search
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Read current filter state from URL
  const currentStatus = searchParams.get("status") ?? "active";
  const currentMb = searchParams.get("mb") ?? "";
  const currentSort = searchParams.get("sort") ?? "score-asc";
  const currentHealth = searchParams.get("health") ?? "all";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, searchParams, pathname]
  );

  // Debounced search — pushes directly without startTransition to avoid
  // flickering the pending bar on every keystroke.
  const pushSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, searchParams, pathname]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushSearch(searchValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, pushSearch]);

  // Sort is an ordering preference, not a filter — do NOT include it in the
  // "filters active" signal or the Clear Filters button.
  const hasFilters =
    currentStatus !== "active" ||
    currentMb !== "" ||
    currentHealth !== "all" ||
    searchValue !== "";

  const activeFilterCount = [
    currentStatus !== "active",
    currentMb !== "",
    currentHealth !== "all",
    searchValue !== "",
  ].filter(Boolean).length;

  const handleClear = useCallback(() => {
    setSearchValue("");
    const params = new URLSearchParams();
    // Preserve date param and current sort — sort is not a filter
    const date = searchParams.get("date");
    if (date) params.set("date", date);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, searchParams, pathname]);

  // Snapshot of current URL params for saving a preset
  const currentParamsSnapshot = useCallback((): Record<string, string> => {
    const snap: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      snap[key] = value;
    });
    // Include local search state (may not yet be in URL)
    if (searchValue) snap["search"] = searchValue;
    return snap;
  }, [searchParams, searchValue]);

  // Load a saved preset
  const handleLoadPreset = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams();
      // Keep date param if present in current URL
      const date = searchParams.get("date");
      if (date) next.set("date", date);
      Object.entries(params).forEach(([k, v]) => {
        if (k !== "date") next.set(k, v);
      });
      // Sync local search state
      setSearchValue(params["search"] ?? "");
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [router, searchParams, pathname]
  );

  return (
    <div
      className="space-y-3"
      role="search"
      aria-label="Filter clients"
    >
      {/* Main filter bar wrapper */}
      <div className="relative rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <Select
            value={currentStatus}
            onValueChange={(v) => updateParams({ status: v })}
          >
            <SelectTrigger
              className="h-9 w-full sm:w-[140px] rounded-lg text-sm shadow-none"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Media Buyer filter */}
          <Select
            value={currentMb || "all"}
            onValueChange={(v) => updateParams({ mb: v === "all" ? "" : v })}
          >
            <SelectTrigger
              className="h-9 w-full sm:w-[170px] rounded-lg text-sm shadow-none"
              aria-label="Filter by media buyer"
            >
              <SelectValue placeholder="Media Buyer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Media Buyers</SelectItem>
              {mediaBuyers.map((mb) => (
                <SelectItem key={mb} value={mb}>
                  {formatMBDisplay(mb)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort — ordering preference, not counted as a filter */}
          <Select
            value={currentSort}
            onValueChange={(v) => updateParams({ sort: v })}
          >
            <SelectTrigger
              className="h-9 w-full sm:w-[165px] rounded-lg text-sm shadow-none"
              aria-label="Sort clients"
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            {isPending ? (
              <Loader2
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search clients..."
              aria-label="Search clients"
              className="h-9 rounded-lg pl-8 text-sm shadow-none"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Clear filters + badge + SavedViews */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className={cn(
                "h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity",
                hasFilters ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              tabIndex={hasFilters ? 0 : -1}
              aria-hidden={!hasFilters}
            >
              <X className="mr-1 h-3 w-3" aria-hidden="true" />
              Clear
            </Button>

            {/* Active filter count badge */}
            {hasFilters && (
              <Badge variant="secondary" className="ml-0 text-xs">
                {activeFilterCount} active
              </Badge>
            )}

            {/* Saved views */}
            <SavedViews
              currentParams={currentParamsSnapshot()}
              onLoad={handleLoadPreset}
            />

            {/* Slot for additional action (e.g. Select toggle) */}
            {rightSlot}
          </div>
        </div>

        {/* Health range buttons — labels aligned with alert logic (<60 critical) */}
        <div
          className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5"
          role="group"
          aria-label="Filter by health zone"
        >
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Health:
          </span>
          {HEALTH_RANGES.map((range) => {
            const isActive = currentHealth === range.value;
            return (
              <button
                key={range.value}
                type="button"
                onClick={() => updateParams({ health: range.value })}
                aria-pressed={isActive}
                className="h-9 rounded-full border border-transparent bg-transparent px-3 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                {range.label}
                {range.value === "critical" && " <60"}
                {range.value === "warning" && " 60-69"}
                {range.value === "healthy" && " 70+"}
              </button>
            );
          })}
        </div>

        {/* Indeterminate loading bar — inside card, at bottom edge */}
        {isPending && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl bg-muted">
            <div className="h-full w-full animate-loading-bar bg-emerald-500 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
