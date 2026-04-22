"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableTableHeaderProps {
  label: string;
  sorted: "asc" | "desc" | false;
  onSort: () => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  sorted,
  onSort,
  className,
}: SortableTableHeaderProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors",
        className
      )}
      onClick={onSort}
      aria-label={`Sort by ${label}${sorted ? `, currently ${sorted === "asc" ? "ascending" : "descending"}` : ""}`}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3 text-primary" aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3 text-primary" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
      )}
    </button>
  );
}
