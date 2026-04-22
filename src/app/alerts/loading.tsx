import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading alerts"
    >
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[140px]" />
        <Skeleton className="h-9 flex-1 min-w-[200px]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="bg-muted/60 px-4 py-3 grid grid-cols-[160px_1fr_100px_100px_100px_180px_160px] gap-4">
          {["Date", "Client", "Overall", "Pacing", "CPA", "Reasons", "Status"].map(
            (col) => (
              <Skeleton key={col} className="h-4 w-full max-w-[80px]" />
            )
          )}
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-t grid grid-cols-[160px_1fr_100px_100px_100px_180px_160px] gap-4 items-center"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
