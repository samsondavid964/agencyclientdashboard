import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Accessible empty-state card.
 *
 * Use inside data-driven surfaces (tables, chart panels, list views) whenever
 * the underlying query returns zero rows or too little data to render a chart.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "animate-fade-in flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/20 bg-card/40 px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="relative flex h-18 w-18 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-muted/60 animate-pulse" aria-hidden="true" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-8 w-8" aria-hidden="true" />
          </div>
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
