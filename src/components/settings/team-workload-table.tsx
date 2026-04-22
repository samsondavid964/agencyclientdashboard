import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TeamWorkloadRow } from "@/lib/queries/team";

interface TeamWorkloadTableProps {
  rows: TeamWorkloadRow[];
}

function getInitials(email: string, fullName: string | null): string {
  if (fullName) {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function HealthScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const rounded = Math.round(score);
  if (score >= 80) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
        {rounded}
      </span>
    );
  }
  if (score >= 60) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        {rounded}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
      {rounded}
    </span>
  );
}

export function TeamWorkloadTable({ rows }: TeamWorkloadTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            No team members with active clients assigned.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Member</TableHead>
            <TableHead className="text-center">Clients Assigned</TableHead>
            <TableHead className="text-center">Avg Health Score</TableHead>
            <TableHead className="text-center">Open Alerts</TableHead>
            <TableHead className="text-center">Open Tasks</TableHead>
            <TableHead>Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.email}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                  >
                    {getInitials(row.email, row.full_name)}
                  </div>
                  <div className="min-w-0">
                    {row.full_name && (
                      <p className="truncate text-sm font-medium">
                        {row.full_name}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {row.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium">{row.clients_assigned}</span>
              </TableCell>
              <TableCell className="text-center">
                <HealthScoreBadge score={row.avg_health_score} />
              </TableCell>
              <TableCell className="text-center">
                {row.open_alerts > 0 ? (
                  <Badge variant="destructive">{row.open_alerts}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">0</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm">{row.open_tasks}</span>
              </TableCell>
              <TableCell>
                {row.last_activity_at ? (
                  <time
                    dateTime={row.last_activity_at}
                    className="text-sm text-muted-foreground"
                  >
                    {formatDistanceToNow(new Date(row.last_activity_at), {
                      addSuffix: true,
                    })}
                  </time>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No activity
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
