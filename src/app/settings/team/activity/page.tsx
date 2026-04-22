import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/utils/auth";
import { getTeamMembers } from "@/lib/queries/team";
import { UserActivityFeed } from "@/components/settings/user-activity-feed";
import { TeamTabNav } from "@/components/settings/team-tab-nav";

export const metadata: Metadata = {
  title: "Team Activity",
  description: "View per-user activity across clients.",
};

export default async function TeamActivityPage() {
  await requireAdmin();

  const members = await getTeamMembers();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
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

      <div className="mb-4">
        <h2 className="font-semibold text-lg">Per-User Activity Feed</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse activity logs, notes, and alert responses for each team member.
        </p>
      </div>

      <UserActivityFeed members={members} />
    </div>
  );
}
