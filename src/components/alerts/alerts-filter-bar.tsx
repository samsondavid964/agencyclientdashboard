"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AlertStatusFilter = "all" | "unresolved" | "resolved";
export type AlertSeverityFilter = "all" | "critical" | "warning" | "healthy";

interface AlertsFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: AlertStatusFilter;
  onStatusChange: (v: AlertStatusFilter) => void;
  severity: AlertSeverityFilter;
  onSeverityChange: (v: AlertSeverityFilter) => void;
  resultCount: number;
}

export function AlertsFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  severity,
  onSeverityChange,
  resultCount,
}: AlertsFilterBarProps) {
  const hasFilters = search !== "" || status !== "all" || severity !== "all";

  const clearAll = useCallback(() => {
    onSearchChange("");
    onStatusChange("all");
    onSeverityChange("all");
  }, [onSearchChange, onStatusChange, onSeverityChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Status filter */}
      <Select value={status} onValueChange={(v) => onStatusChange(v as AlertStatusFilter)}>
        <SelectTrigger className="h-9 w-full sm:w-[160px]" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="unresolved">Unresolved</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
        </SelectContent>
      </Select>

      {/* Severity filter */}
      <Select value={severity} onValueChange={(v) => onSeverityChange(v as AlertSeverityFilter)}>
        <SelectTrigger className="h-9 w-full sm:w-[160px]" aria-label="Filter by severity">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="healthy">Healthy</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search client or reason..."
          className="h-9 pl-8 pr-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search alerts"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Clear & result count */}
      <div className="flex items-center gap-3 shrink-0">
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1.5">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {resultCount} alert{resultCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
