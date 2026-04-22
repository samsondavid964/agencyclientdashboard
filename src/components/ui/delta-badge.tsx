"use client";

import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
  /** The delta value (positive = up, negative = down, zero = flat) */
  value: number | null | undefined;
  /** Override the auto-detected tone */
  tone?: "success" | "destructive" | "warning" | "muted";
  /** Suffix after the number (default "%") */
  suffix?: string;
  /** When true, negative is good (e.g. alerts going down = green) */
  invert?: boolean;
  className?: string;
}

const toneClasses: Record<string, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  destructive:
    "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  muted: "bg-muted text-muted-foreground",
};

function ArrowUpIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4 L11 18 M5 10 L11 4 L17 10" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 18 L11 4 M5 12 L11 18 L17 12" />
    </svg>
  );
}

function FlatIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 22 22"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="14" height="2" rx="1" />
    </svg>
  );
}

export function DeltaBadge({
  value,
  tone,
  suffix = "%",
  invert = false,
  className,
}: DeltaBadgeProps) {
  // Null / undefined / zero → flat muted badge
  if (value == null || value === 0) {
    return (
      <span
        className={cn(
          "inline-flex h-[22px] items-center gap-0.5 rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
          toneClasses.muted,
          className
        )}
      >
        <FlatIcon />
        {`0${suffix}`}
      </span>
    );
  }

  // Determine whether this delta reads as "good" or "bad"
  const isPositive = invert ? value < 0 : value > 0;

  // Resolve tone: explicit override wins, otherwise derive from sign
  const resolvedTone =
    tone ?? (isPositive ? "success" : "destructive");

  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-0.5 rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
        toneClasses[resolvedTone],
        className
      )}
    >
      {value > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
      {`${Math.abs(value)}${suffix}`}
    </span>
  );
}
