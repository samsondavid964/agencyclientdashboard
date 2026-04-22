import type { ReactNode } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  TreePine,
  PauseCircle,
  XCircle,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PillStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "active"
  | "onboarding"
  | "paused"
  | "churned"
  | "top-performer";

interface PillConfig {
  pill: string;
  dotColor?: string;
  dotStyle?: React.CSSProperties;
  icon: LucideIcon;
  iconClass: string;
  style?: React.CSSProperties;
}

const PILL_CONFIG: Record<PillStatus, PillConfig> = {
  healthy: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    icon: TrendingUp,
    iconClass: "text-emerald-500",
  },
  warning: {
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    dotColor: "bg-amber-500",
    icon: AlertTriangle,
    iconClass: "text-amber-500",
  },
  critical: {
    pill: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    dotColor: "bg-red-500",
    icon: AlertTriangle,
    iconClass: "text-red-500",
  },
  active: {
    pill: "",
    icon: CheckCircle2,
    iconClass: "text-[hsl(var(--purple-500))]",
    style: {
      background: "hsl(var(--purple-100))",
      color: "hsl(var(--purple-700))",
    },
  },
  onboarding: {
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
    dotColor: "bg-sky-500",
    icon: TreePine,
    iconClass: "text-sky-500",
  },
  paused: {
    pill: "border border-border bg-background text-foreground",
    dotColor: "bg-gray-400",
    icon: PauseCircle,
    iconClass: "text-gray-400",
  },
  churned: {
    pill: "border border-border bg-background text-muted-foreground",
    dotColor: "bg-gray-400",
    icon: XCircle,
    iconClass: "text-gray-400",
  },
  "top-performer": {
    pill: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
    dotColor: "bg-orange-500",
    icon: Star,
    iconClass: "text-orange-500",
  },
};

interface StatusPillProps {
  status: PillStatus;
  children: ReactNode;
  /** Replace the default dot with the status icon */
  showIcon?: boolean;
  className?: string;
}

export function StatusPill({
  status,
  children,
  showIcon = false,
  className,
}: StatusPillProps) {
  const config = PILL_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
        config.pill,
        className
      )}
      style={config.style}
    >
      {showIcon ? (
        <Icon
          className={cn("h-3 w-3 flex-shrink-0", config.iconClass)}
          aria-hidden="true"
        />
      ) : (
        <span
          className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", config.dotColor)}
          style={
            status === "active"
              ? { background: "hsl(var(--purple-500))" }
              : undefined
          }
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * Maps a client_status string to the typed PillStatus.
 * Falls back to "paused" for unknown values.
 */
export function toPillStatus(status: string): PillStatus {
  const valid: PillStatus[] = [
    "healthy",
    "warning",
    "critical",
    "active",
    "onboarding",
    "paused",
    "churned",
    "top-performer",
  ];
  return valid.includes(status as PillStatus)
    ? (status as PillStatus)
    : "paused";
}
