import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div
      className="animate-fade-in mx-auto max-w-7xl space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      <div className="rounded-2xl border bg-card p-5 lg:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton variant="chip" className="h-3 w-36" />
            <Skeleton variant="heading" className="w-56" />
            <Skeleton variant="line" className="w-72" />
          </div>
          <Skeleton variant="chip" className="w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <Skeleton variant="line" className="w-24" />
            <Skeleton variant="heading" className="h-8 w-20" />
            <div className="border-t pt-2">
              <Skeleton variant="line" className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <Skeleton variant="line" className="w-32" />
            <Skeleton variant="bar" className="h-6 rounded-full" />
            <div className="flex justify-between border-t pt-2">
              <Skeleton variant="chip" className="w-16" />
              <Skeleton variant="chip" className="w-16" />
              <Skeleton variant="chip" className="w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton variant="bar" className="w-[140px]" />
          <Skeleton variant="bar" className="w-[170px]" />
          <Skeleton variant="bar" className="w-[165px]" />
          <Skeleton variant="bar" className="flex-1 min-w-[200px]" />
        </div>
        <div className="flex items-center gap-2 border-t pt-2.5">
          <Skeleton variant="line" className="h-3 w-12" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="chip" className="w-20" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton variant="heading" className="h-5 w-3/5" />
              <Skeleton variant="heading" className="h-7 w-12" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton variant="avatar" className="h-8 w-8 rounded-lg" />
              <Skeleton variant="line" className="h-3 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <Skeleton variant="line" className="h-5" />
              <Skeleton variant="line" className="h-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
