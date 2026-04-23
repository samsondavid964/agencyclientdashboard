import { Skeleton } from "@/components/ui/skeleton";

export default function NewClientLoading() {
  return (
    <div
      className="animate-fade-in mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading new client form"
    >
      <div className="space-y-2">
        <Skeleton variant="heading" className="w-48" />
        <Skeleton variant="line" className="w-64" />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-8">
        <div className="space-y-4">
          <Skeleton variant="heading" className="w-24" />
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant="line" className="w-1/4" />
                <Skeleton variant="bar" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="bar" className="h-12" />
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Skeleton variant="bar" className="w-20" />
          <Skeleton variant="bar" className="w-28" />
        </div>
      </div>
    </div>
  );
}
