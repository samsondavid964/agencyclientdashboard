import { Skeleton } from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading comparison"
    >
      <div className="space-y-2">
        <Skeleton variant="heading" className="w-48" />
        <Skeleton variant="line" className="w-72" />
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <Skeleton variant="line" className="w-28" />
        <Skeleton variant="bar" className="w-64" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-muted/40 px-4 py-3">
          <Skeleton variant="line" className="w-48" />
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
