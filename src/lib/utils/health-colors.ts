/**
 * Shared health-score color utilities.
 *
 * Zones map to the health score thresholds used in alerting:
 *   healthy  ≥ 70   (green)
 *   warning  40-69  (amber)
 *   critical < 40   (red)
 *   neutral  null/undefined (grey)
 */

export type HealthZone = "healthy" | "warning" | "critical" | "neutral";

/** Alias exported for components that use the ScoreZone name. */
export type ScoreZone = "healthy" | "warning" | "critical" | "neutral";

export function getHealthZone(score: number | null | undefined): HealthZone {
  if (score === null || score === undefined || Number.isNaN(score)) return "neutral";
  if (score >= 70) return "healthy";
  if (score >= 40) return "warning";
  return "critical";
}

/** Hex values for use in SVG / chart `stroke` / `fill` props where Tailwind classes don't apply. */
export const HEALTH_HEX: Record<HealthZone, string> = {
  healthy: "#059669",
  warning: "#d97706",
  critical: "#dc2626",
  neutral: "#6b7280",
};

export function getHealthStroke(score: number | null | undefined): string {
  return HEALTH_HEX[getHealthZone(score)];
}

/** Tailwind text-color classes (light + dark) for badges / score pills. */
export const HEALTH_TEXT_CLASS: Record<HealthZone, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
};

/** Tailwind background-color classes (light + dark) for surface fills. */
export const HEALTH_BG_CLASS: Record<HealthZone, string> = {
  healthy: "bg-emerald-50 dark:bg-emerald-950/40",
  warning: "bg-amber-50 dark:bg-amber-950/40",
  critical: "bg-red-50 dark:bg-red-950/40",
  neutral: "bg-muted",
};

/** Combined ring + text + bg class string for badge-style score chips. */
export const HEALTH_CHIP_CLASS: Record<HealthZone, string> = {
  healthy:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900",
  critical:
    "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900",
  neutral:
    "bg-muted text-muted-foreground ring-1 ring-border",
};

export function getHealthLabel(score: number | null | undefined): string {
  const zone = getHealthZone(score);
  if (zone === "healthy") return "Healthy";
  if (zone === "warning") return "Needs attention";
  if (zone === "critical") return "Critical";
  return "No data";
}
