import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading alerts"
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" className="rounded-lg" />
        <div className="space-y-2">
          <Skeleton variant="heading" className="w-40" />
          <Skeleton variant="line" className="w-64" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton variant="bar" className="w-40" />
        <Skeleton variant="bar" className="w-36" />
        <Skeleton variant="bar" className="flex-1 min-w-[200px]" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="bg-muted/40 px-4 py-3">
          <Skeleton variant="line" className="w-40" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton variant="bar" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
