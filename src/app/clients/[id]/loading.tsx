import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailLoading() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="border-b border-border py-4">
        <div className="space-y-4">
          <Skeleton variant="line" className="w-40" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Skeleton variant="avatar" className="h-14 w-14 rounded-xl" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton variant="heading" className="w-56" />
                  <Skeleton variant="chip" className="w-20" />
                </div>
                <Skeleton variant="line" className="w-64" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton variant="bar" className="w-28" />
              <Skeleton variant="bar" className="w-48" />
            </div>
          </div>
        </div>
      </div>

      <Skeleton variant="card" className="h-40" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton variant="card" className="h-36" />
        <Skeleton variant="card" className="h-36" />
        <Skeleton variant="card" className="h-36" />
        <Skeleton variant="card" className="h-36" />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <Skeleton variant="line" className="w-24" />
            <Skeleton className="h-24 w-40 rounded-t-full" />
            <Skeleton variant="chip" className="w-24" />
          </div>
          <Skeleton variant="card" className="h-64" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton variant="card" className="h-56" />
        <Skeleton variant="card" className="h-56" />
        <Skeleton variant="card" className="h-56" />
      </div>
    </div>
  );
}
