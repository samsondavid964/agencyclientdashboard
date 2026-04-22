import { Skeleton } from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Selector card skeleton */}
      <div className="rounded-xl border bg-card p-5">
        <Skeleton className="mb-4 h-4 w-28" />
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Comparison table skeleton */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Header row */}
        <div className="flex border-b bg-muted/40 px-4 py-3 gap-8">
          <Skeleton className="h-4 w-16 shrink-0" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[160px] space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-8 border-b px-4 py-3 last:border-0"
          >
            <Skeleton className="h-4 w-24 shrink-0" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="min-w-[160px]">
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
