import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading profile"
    >
      <div className="space-y-2">
        <Skeleton variant="heading" className="w-40" />
        <Skeleton variant="line" className="w-64" />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton variant="avatar" className="h-20 w-20" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="heading" className="w-40" />
            <Skeleton variant="line" className="w-56" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="line" className="w-1/4" />
              <Skeleton variant="bar" />
            </div>
          ))}
        </div>

        <Skeleton variant="bar" className="w-32" />
      </div>
    </div>
  );
}
