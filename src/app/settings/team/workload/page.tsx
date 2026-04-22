import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { requireAdmin } from "@/lib/utils/auth";
import { getTeamWorkload } from "@/lib/queries/team";
import { TeamWorkloadTable } from "@/components/settings/team-workload-table";
import { TeamTabNav } from "@/components/settings/team-tab-nav";

export const metadata: Metadata = {
  title: "Team Workload",
  description: "View workload distribution across team members.",
};

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function TeamWorkloadPage() {
  await requireAdmin();

  const yesterday = getYesterday();
  const rows = await getTeamWorkload(yesterday);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Team Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team members, workload, and activity.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <TeamTabNav />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">
          Workload Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Health scores as of{" "}
          <time dateTime={yesterday}>{yesterday}</time>
        </p>
      </div>

      <TeamWorkloadTable rows={rows} />
    </div>
  );
}
