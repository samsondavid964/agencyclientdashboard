import { Skeleton } from "@/components/ui/skeleton";

export default function NewClientLoading() {
  return (
    <div
      className="animate-fade-in mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading new client form"
    >
      {/* Page heading */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-8">
        {/* Basic Info section — always visible, matches the non-collapsible section */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-px w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client Name */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            {/* Company Name */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-52" />
            </div>
            {/* Store Name */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-44" />
            </div>
            {/* Google Ads ID */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
            {/* Monthly Budget */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
            {/* Client Status */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </div>

        {/* Collapsible section placeholders */}
        {["Targets", "Store Details", "Team Assignment", "Integrations", "Notes"].map(
          (section) => (
            <div key={section} className="rounded-lg border">
              <div className="flex items-center justify-between px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </div>
          )
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
