import { cn } from "@/lib/utils";

interface ScoreChipProps {
  score: number | null | undefined;
  className?: string;
}

export function ScoreChip({ score, className }: ScoreChipProps) {
  if (score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full border border-dashed border-gray-200 bg-gray-50 px-2.5 py-1",
          "dark:border-gray-700 dark:bg-gray-900/30",
          className
        )}
      >
        <span className="font-display text-[13px] font-semibold leading-none text-gray-400 dark:text-gray-500">
          &mdash;
        </span>
      </span>
    );
  }

  const rounded = Math.round(score);

  const chipClass =
    score >= 70
      ? "bg-emerald-50 text-emerald-700 border-emerald-700/30 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-400/30"
      : score >= 40
      ? "bg-amber-50 text-amber-700 border-amber-700/30 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-400/30"
      : "bg-red-50 text-red-700 border-red-700/30 dark:bg-red-950/30 dark:text-red-400 dark:border-red-400/30";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-2.5 py-1",
        chipClass,
        className
      )}
    >
      <span className="font-display text-[13px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
        {rounded}
      </span>
      <span className="font-mono text-[9px] font-medium leading-none opacity-70 tracking-[0.02em]">
        /100
      </span>
    </span>
  );
}
