import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailLoading() {
  return (
    <div className="animate-fade-in space-y-6 p-6 lg:p-8">
      {/* Top bar skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Health Score Hero skeleton */}
      <div className="rounded-xl border bg-card p-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-32" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>

      {/* Score Breakdown skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-5 w-32 mb-3" />
            <Skeleton className="h-40 w-full" />
            <div className="mt-3 space-y-2 border-t pt-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Efficiency skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Metrics Table skeleton */}
      <div className="rounded-xl border bg-card p-5">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
