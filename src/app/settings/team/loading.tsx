import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading team"
    >
      <div className="mb-8 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <Skeleton className="h-9 w-full" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-4 w-48" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
