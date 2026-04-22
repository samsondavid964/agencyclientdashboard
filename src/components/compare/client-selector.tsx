"use client";

import * as React from "react";
import { X, ChevronsUpDown, Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SelectorClient } from "@/lib/queries/compare";

interface ClientSelectorProps {
  allClients: SelectorClient[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  max?: number;
}

export function ClientSelector({
  allClients,
  selectedIds,
  onSelectionChange,
  max = 5,
}: ClientSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [limitMsg, setLimitMsg] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedClients = allClients.filter((c) => selectedIds.includes(c.id));

  const filtered = allClients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.client_name.toLowerCase().includes(q) ||
      (c.store_name?.toLowerCase().includes(q) ?? false)
    );
  });

  function toggle(id: string) {
    const isSelected = selectedIds.includes(id);
    if (!isSelected && selectedIds.length >= max) {
      setLimitMsg(true);
      setTimeout(() => setLimitMsg(false), 2500);
      return;
    }
    const next = isSelected
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onSelectionChange(next);
  }

  function remove(id: string) {
    onSelectionChange(selectedIds.filter((x) => x !== id));
  }

  // Focus input when popover opens
  React.useEffect(() => {
    if (open) {
      // slight delay to let animation settle
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setSearch("");
      setLimitMsg(false);
    }
  }, [open]);

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClients.map((c) => (
            <Badge
              key={c.id}
              variant="secondary"
              className="flex items-center gap-1.5 py-1 pl-2.5 pr-1.5 text-[12px] font-medium"
            >
              <span className="max-w-[140px] truncate">
                {c.store_name ?? c.client_name}
              </span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                aria-label={`Remove ${c.client_name}`}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select clients to compare"
            className="w-full max-w-sm justify-between"
          >
            <span className="text-muted-foreground">
              {selectedIds.length === 0
                ? "Select clients…"
                : `${selectedIds.length} / ${max} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[340px] p-0"
          align="start"
          sideOffset={6}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search clients"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground focus-visible:outline-none"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Limit warning */}
          {limitMsg && (
            <p className="px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              Maximum of {max} clients reached.
            </p>
          )}

          {/* Client list */}
          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label="Available clients"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No clients found.
              </p>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const isDisabled = !isSelected && selectedIds.length >= max;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent hover:text-accent-foreground",
                      isDisabled && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">
                      {c.client_name}
                      {c.store_name && c.store_name !== c.client_name && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({c.store_name})
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              Select 2–{max} clients to compare side by side
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
