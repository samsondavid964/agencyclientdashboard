"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  Users,
  MessageSquare,
  RefreshCw,
  FileText,
  CheckSquare,
  Bell,
  MoreHorizontal,
  StickyNote,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchUserActivity } from "@/lib/actions/team";
import type { TeamMember, UserActivityEntry } from "@/lib/queries/team";

interface UserActivityFeedProps {
  members: TeamMember[];
  initialEmail?: string;
}

type DayRange = 7 | 30;

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  slack: MessageSquare,
  status_change: RefreshCw,
  note: FileText,
  task: CheckSquare,
  alert_response: Bell,
  other: MoreHorizontal,
};

function ActivityIcon({
  type,
  activityType,
}: {
  type: UserActivityEntry["type"];
  activityType?: string;
}) {
  if (type === "note") {
    return <StickyNote className="h-4 w-4 text-blue-500" />;
  }
  if (type === "alert_response") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  if (activityType && activityType in ACTIVITY_ICONS) {
    const Icon = ACTIVITY_ICONS[activityType];
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  }
  return <MoreHorizontal className="h-4 w-4 text-muted-foreground" />;
}

function typeLabel(entry: UserActivityEntry): string {
  if (entry.type === "note") return "Note";
  if (entry.type === "alert_response") return "Alert Response";
  if (entry.activity_type) {
    return entry.activity_type.charAt(0).toUpperCase() +
      entry.activity_type.slice(1).replace("_", " ");
  }
  return "Activity";
}

export function UserActivityFeed({
  members,
  initialEmail,
}: UserActivityFeedProps) {
  const [selectedEmail, setSelectedEmail] = useState<string>(
    initialEmail ?? members[0]?.email ?? ""
  );
  const [days, setDays] = useState<DayRange>(7);
  const [entries, setEntries] = useState<UserActivityEntry[] | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function load(email: string, daysRange: DayRange) {
    if (!email) return;
    startTransition(async () => {
      const result = await fetchUserActivity(email, daysRange);
      setEntries(result);
      setHasFetched(true);
    });
  }

  function handleEmailChange(value: string) {
    setSelectedEmail(value);
    load(value, days);
  }

  function handleDaysChange(value: DayRange) {
    setDays(value);
    load(selectedEmail, value);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedEmail} onValueChange={handleEmailChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.email}>
                {m.full_name ? `${m.full_name} (${m.email})` : m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Day range pill toggle */}
        <div className="flex rounded-md border bg-muted p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={
              days === 7
                ? "rounded bg-background text-foreground shadow-sm px-4"
                : "rounded px-4 text-muted-foreground hover:text-foreground"
            }
            onClick={() => handleDaysChange(7)}
          >
            Last 7 days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={
              days === 30
                ? "rounded bg-background text-foreground shadow-sm px-4"
                : "rounded px-4 text-muted-foreground hover:text-foreground"
            }
            onClick={() => handleDaysChange(30)}
          >
            Last 30 days
          </Button>
        </div>

        {!hasFetched && selectedEmail && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(selectedEmail, days)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load Activity"
            )}
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Activity list */}
      {!isPending && hasFetched && (
        <>
          {entries === null || entries.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground text-sm">
                  No activity found for this team member in the last {days} days.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ActivityIcon
                      type={entry.type}
                      activityType={entry.activity_type}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {typeLabel(entry)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <Link
                        href={`/clients/${entry.client_id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {entry.client_name}
                      </Link>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground line-clamp-2">
                      {entry.summary}
                    </p>
                    <time
                      dateTime={entry.occurred_at}
                      className="mt-1 block text-xs text-muted-foreground"
                    >
                      {formatDistanceToNow(new Date(entry.occurred_at), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pre-load state */}
      {!isPending && !hasFetched && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Select a team member and click &quot;Load Activity&quot; to view their feed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
