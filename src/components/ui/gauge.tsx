"use client";

import { useId, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GaugeProps {
  /** Health score value 0-100 */
  value: number | null;
  /** Width of the gauge container in px (default 180) */
  size?: number;
  /** Label below the score (default "out of 100") */
  label?: string;
  className?: string;
}

// Half-circle arc path: M 10,60 A 50,50 0 0,1 110,60
// Radius = 50, center = (60, 60), starts left (10,60), ends right (110,60)
const ARC_PATH = "M 10,60 A 50,50 0 0,1 110,60";
const ARC_LENGTH = Math.PI * 50; // ~157.08

type Zone = "healthy" | "warning" | "critical" | "null";

function getZone(value: number | null): Zone {
  if (value === null) return "null";
  if (value >= 70) return "healthy";
  if (value >= 40) return "warning";
  return "critical";
}

// Gradient stops: hue changes per zone, lightness steps stay consistent
function getGradientStops(zone: Zone): [string, string, string] {
  if (zone === "null") {
    return ["hsl(215 16% 75%)", "hsl(215 16% 65%)", "hsl(215 16% 55%)"];
  }
  const hue = zone === "healthy" ? 142 : zone === "warning" ? 38 : 0;
  return [
    `hsl(${hue} 72% 78%)`,
    `hsl(${hue} 78% 58%)`,
    `hsl(${hue} 84% 40%)`,
  ];
}

// Badge classes using established Tailwind color tokens (matches health-score.ts)
function getBadgeClasses(zone: Zone): string {
  switch (zone) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
    default:
      return "";
  }
}

function getBadgeLabel(zone: Zone): string {
  switch (zone) {
    case "healthy":
      return "Strong";
    case "warning":
      return "Moderate";
    case "critical":
      return "Weak";
    default:
      return "";
  }
}

export function Gauge({
  value,
  size = 180,
  label = "out of 100",
  className,
}: GaugeProps) {
  const gradientId = useId();
  const zone = getZone(value);
  // Respect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // Animate stroke-dashoffset from full (hidden) to target offset
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (value === null || prefersReducedMotion) {
      setAnimated(true);
      return;
    }
    const raf = requestAnimationFrame(() => {
      setAnimated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, prefersReducedMotion]);

  const targetOffset =
    value !== null ? ARC_LENGTH * (1 - value / 100) : ARC_LENGTH;

  // While not yet animated, start the arc fully hidden (offset = arcLength)
  const dashOffset = animated ? targetOffset : ARC_LENGTH;

  const transitionStyle = prefersReducedMotion
    ? undefined
    : "stroke-dashoffset 1200ms cubic-bezier(0.16, 1, 0.3, 1)";

  const gradientStops = getGradientStops(zone);
  const badgeClasses = getBadgeClasses(zone);
  const badgeLabel = getBadgeLabel(zone);

  // Sizes derived from container
  const scoreFontSize = size * 0.28;
  const labelFontSize = 10;
  const negativeMargin = -size * 0.14;

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-2", className)}
      role="meter"
      aria-valuenow={value ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={
        value !== null
          ? `Health score: ${value} out of 100 — ${badgeLabel}`
          : "Health score: no data"
      }
    >
      {/* SVG gauge */}
      <div style={{ width: size, position: "relative" }}>
        <svg
          viewBox="0 0 120 70"
          width={size}
          height={size * (70 / 120)}
          aria-hidden="true"
          overflow="visible"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={gradientStops[0]} />
              <stop offset="50%" stopColor={gradientStops[1]} />
              <stop offset="100%" stopColor={gradientStops[2]} />
            </linearGradient>
          </defs>

          {/* Track arc — muted background */}
          <path
            d={ARC_PATH}
            fill="none"
            stroke="hsl(215 16% 90%)"
            strokeWidth={10}
            strokeLinecap="round"
            className="dark:stroke-[hsl(215_16%_20%)]"
            strokeDasharray={value === null ? "4 4" : undefined}
          />

          {/* Value arc */}
          {value !== null && (
            <path
              d={ARC_PATH}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={ARC_LENGTH}
              strokeDashoffset={dashOffset}
              style={{
                transition: transitionStyle,
              }}
            />
          )}
        </svg>

        {/* Center score display — overlaid below the arc */}
        <div
          style={{
            marginTop: negativeMargin,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 500,
              fontSize: scoreFontSize,
              letterSpacing: "-0.035em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              color: "hsl(var(--foreground))",
            }}
          >
            {value !== null ? value : "\u2014"}
          </span>
          <span
            style={{
              fontSize: labelFontSize,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "hsl(var(--muted-foreground))",
              lineHeight: 1,
            }}
          >
            {value !== null ? label.toUpperCase() : "NO DATA"}
          </span>
        </div>
      </div>

      {/* Strength badge */}
      {value !== null && zone !== "null" && (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badgeClasses
          )}
        >
          {badgeLabel}
        </span>
      )}
    </div>
  );
}
