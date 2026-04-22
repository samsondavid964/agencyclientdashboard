/**
 * Minimum days of daily_metrics history required before showing deltas
 * or trend-based insights. Below this, data is too sparse to be meaningful.
 */
export const INSUFFICIENT_HISTORY_DAYS = 14;

export type ScoreZone = "healthy" | "warning" | "critical" | "neutral";

export interface ScoreColors {
  text: string;
  bg: string;
  badge: string;
  ring: string;
  label: string;
  zone: ScoreZone;
}

export function getHealthScoreColor(score: number | null | undefined): ScoreColors {
  if (score == null) {
    return {
      text: "text-gray-400",
      bg: "bg-gray-50",
      badge: "bg-gray-100 text-gray-600",
      ring: "ring-gray-200",
      label: "No Data",
      zone: "neutral",
    };
  }
  if (score >= 70) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700",
      ring: "ring-emerald-200",
      label: "Healthy",
      zone: "healthy",
    };
  }
  if (score >= 40) {
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      ring: "ring-amber-200",
      label: "Warning",
      zone: "warning",
    };
  }
  return {
    text: "text-red-600",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    ring: "ring-red-200",
    label: "Critical",
    zone: "critical",
  };
}

export type TrendDirection = "up" | "down" | "stable";

export function getTrendDirection(
  current: number | null | undefined,
  previous: number | null | undefined
): TrendDirection {
  if (current == null || previous == null) return "stable";
  const diff = current - previous;
  if (diff > 3) return "up";
  if (diff < -3) return "down";
  return "stable";
}

export function getTrendColor(direction: TrendDirection): string {
  switch (direction) {
    case "up":
      return "text-emerald-600";
    case "down":
      return "text-red-600";
    case "stable":
      return "text-gray-400";
  }
}

export function getTremorDeltaType(
  direction: TrendDirection
): "moderateIncrease" | "moderateDecrease" | "unchanged" {
  switch (direction) {
    case "up":
      return "moderateIncrease";
    case "down":
      return "moderateDecrease";
    case "stable":
      return "unchanged";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-[hsl(var(--purple-100))] text-[hsl(var(--purple-700))]";
    case "onboarding":
      return "bg-blue-100 text-blue-700";
    case "paused":
      return "bg-gray-100 text-gray-600";
    case "churned":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
