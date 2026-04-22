"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[];
  /** Health zone tone (determines color) */
  tone?: "healthy" | "warning" | "critical";
  /** SVG width in px (default 72) */
  width?: number;
  /** SVG height in px (default 28) */
  height?: number;
  className?: string;
}

const COLOR_MAP: Record<NonNullable<SparklineProps["tone"]>, string> = {
  healthy: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function Sparkline({
  data,
  tone = "healthy",
  width = 72,
  height = 28,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const color = COLOR_MAP[tone];
  const rgb = hexToRgb(color);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y =
      range === 0
        ? height / 2
        : height - 4 - ((v - min) / range) * (height - 8);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const lastPoint = points[points.length - 1];

  // Area polygon: data points → bottom-right → bottom-left → close
  const areaPoints = [
    ...points.map((p) => `${p.x},${p.y}`),
    `${lastPoint.x},${height}`,
    `0,${height}`,
  ].join(" ");

  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{
        width,
        height,
        padding: "2px 0",
        borderRadius: 6,
        backgroundColor: `rgba(${rgb}, 0.08)`,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={`rgba(${rgb}, 0.14)`}
        />

        {/* Line stroke */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End dot — outer glow */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={4}
          fill={`rgba(${rgb}, 0.22)`}
        />

        {/* End dot — inner solid */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2}
          fill={color}
          stroke="#fff"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
