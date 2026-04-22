"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Phone,
  Mail,
  Users,
  MessageSquare,
  RefreshCw,
  FileText,
  CheckSquare,
  Bell,
  Activity,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { WorkspaceActivity, ActivityType } from "@/lib/queries/client-workspace";

interface ActivityFeedProps {
  activities: WorkspaceActivity[];
}

// ─── Activity type config ─────────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: React.ElementType; label: string; iconClass: string; bgClass: string }
> = {
  call: {
    icon: Phone,
    label: "Call",
    iconClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
  },
  email: {
    icon: Mail,
    label: "Email",
    iconClass: "text-violet-600 dark:text-violet-400",
    bgClass: "bg-violet-50 dark:bg-violet-950/40",
  },
  meeting: {
    icon: Users,
    label: "Meeting",
    iconClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  slack: {
    icon: MessageSquare,
    label: "Slack",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  status_change: {
    icon: RefreshCw,
    label: "Status Change",
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
  },
  note: {
    icon: FileText,
    label: "Note",
    iconClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-50 dark:bg-slate-900/40",
  },
  task: {
    icon: CheckSquare,
    label: "Task",
    iconClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/40",
  },
  alert_response: {
    icon: Bell,
    label: "Alert Response",
    iconClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/40",
  },
  other: {
    icon: Activity,
    label: "Other",
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Activity entries will appear here as you log calls, emails, meetings, and other interactions."
        className="mt-2"
      />
    );
  }

  return (
    <ol className="relative space-y-0 pl-8" aria-label="Activity timeline">
      {/* Vertical line */}
      <div
        className="absolute left-3.5 top-2 bottom-2 w-px bg-border"
        aria-hidden="true"
      />

      {activities.map((activity) => {
        const config = ACTIVITY_CONFIG[activity.activity_type] ?? ACTIVITY_CONFIG.other;
        const Icon = config.icon;

        const relativeTime = formatDistanceToNow(parseISO(activity.created_at), {
          addSuffix: true,
        });

        const shortActor = activity.actor_email.split("@")[0];

        return (
          <li key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Icon dot */}
            <div
              className={cn(
                "absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background",
                config.bgClass
              )}
              aria-hidden="true"
            >
              <Icon className={cn("h-3.5 w-3.5", config.iconClass)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  by {shortActor}
                </span>
                <time
                  dateTime={activity.created_at}
                  className="text-xs text-muted-foreground/70 ml-auto"
                  title={new Date(activity.created_at).toLocaleString()}
                >
                  {relativeTime}
                </time>
              </div>
              <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap break-words">
                {activity.summary}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
