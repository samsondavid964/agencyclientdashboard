import { generateExecutiveSummary, getSummaryTone, type ExecutiveSummaryInput } from "@/lib/utils/executive-summary";
import { cn } from "@/lib/utils";

const TONE_DOT_CLASS = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  unknown: "bg-gray-400",
} as const;

export function ExecutiveSummary(props: ExecutiveSummaryInput) {
  const { sentences } = generateExecutiveSummary(props);
  const tone = getSummaryTone(props);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn("h-2 w-2 rounded-full flex-shrink-0", TONE_DOT_CLASS[tone])}
            aria-hidden="true"
          />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Executive Summary
          </h2>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {sentences.join(" ")}
        </p>
      </div>
    </div>
  );
}
