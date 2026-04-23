import { Skeleton } from "@/components/ui/skeleton";

export function CampaignsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="heading" className="w-48" />
          <Skeleton variant="bar" className="w-32" />
        </div>
        <Skeleton variant="card" className="h-64" />
      </div>
      <Skeleton variant="card" className="h-72" />
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton variant="card" className="h-28" />
        <Skeleton variant="card" className="h-28" />
        <Skeleton variant="card" className="h-28" />
        <Skeleton variant="card" className="h-28" />
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="heading" className="w-56" />
          <div className="flex gap-2">
            <Skeleton variant="bar" className="w-28" />
            <Skeleton variant="bar" className="w-24" />
          </div>
        </div>
        <Skeleton variant="card" className="h-80" />
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <Skeleton variant="heading" className="w-40" />
      <div className="space-y-3">
        <Skeleton variant="card" className="h-20" />
        <Skeleton variant="card" className="h-20" />
        <Skeleton variant="card" className="h-20" />
        <Skeleton variant="card" className="h-20" />
      </div>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton variant="heading" className="w-48" />
          <Skeleton variant="line" className="w-64" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton variant="bar" className="w-24" />
        <Skeleton variant="bar" className="w-24" />
        <Skeleton variant="bar" className="w-24" />
      </div>
      <Skeleton variant="card" className="h-64" />
    </div>
  );
}
