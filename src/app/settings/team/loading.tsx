import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading team"
    >
      <div className="space-y-2">
        <Skeleton variant="heading" className="w-48" />
        <Skeleton variant="line" className="w-80" />
      </div>

      <Skeleton variant="bar" className="w-64" />

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Skeleton variant="heading" className="w-40" />
        <Skeleton variant="bar" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
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
