"use client";

import { useState, useEffect } from "react";
import { getHealthStroke } from "@/lib/utils/health-colors";
import { getHealthScoreColor } from "@/lib/utils/health-score";
import { formatScore } from "@/lib/utils/formatting";

interface HealthRingProps {
  score: number | null;
  size?: "sm" | "md";
  animate?: boolean;
}

const SIZES = {
  sm: { box: 20, r: 8, stroke: 2 },
  md: { box: 24, r: 10, stroke: 2 },
};

export function HealthRing({ score, size = "md", animate = true }: HealthRingProps) {
  const [mounted, setMounted] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [animate]);

  const { box, r, stroke } = SIZES[size];
  const cx = box / 2;
  const cy = box / 2;
  const colors = getHealthScoreColor(score);
  const ringColor = getHealthStroke(score);
  const circumference = 2 * Math.PI * r;
  const isNull = score == null;
  const progress = Math.min(score ?? 0, 100) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="inline-flex items-center gap-1.5">
      <svg
        width={box}
        height={box}
        className="transform -rotate-90 flex-shrink-0"
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={isNull ? "currentColor" : ringColor}
          strokeWidth={stroke}
          strokeDasharray={isNull ? "3 3" : circumference}
          strokeDashoffset={
            isNull ? 0 : mounted ? dashOffset : circumference
          }
          strokeLinecap="round"
          className={isNull ? "text-muted-foreground/40" : undefined}
          style={
            !isNull && animate
              ? { transition: "stroke-dashoffset 0.6s ease-out" }
              : undefined
          }
        />
      </svg>
      <span className={`text-xs font-semibold ${colors.text}`}>
        {formatScore(score)}
      </span>
    </div>
  );
}
