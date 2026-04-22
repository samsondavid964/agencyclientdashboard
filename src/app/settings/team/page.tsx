import type { Metadata } from "next";
import { requireAdmin } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Team",
  description: "Manage team members and invites for the Ad Lab Dashboard.",
};
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteUserForm } from "@/components/forms/invite-user-form";
import { TeamTabNav } from "@/components/settings/team-tab-nav";
import { Users, Shield, User } from "lucide-react";
import { format } from "date-fns";

export default async function TeamPage() {
  await requireAdmin();

  const adminClient = createAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const users = usersData?.users || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
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

      <div className="mb-6">
        <InviteUserForm />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">
            Team Members ({users.length})
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Sign In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const role = u.app_metadata?.role || "member";
              const fullName =
                u.user_metadata?.full_name ||
                u.user_metadata?.name ||
                "No name";
              const lastSignInAt = u.last_sign_in_at;
              const lastSignInFormatted = lastSignInAt
                ? format(new Date(lastSignInAt), "MMM dd, yyyy HH:mm")
                : "Never";

              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                      >
                        {fullName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      {fullName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    {role === "admin" ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                        <Shield className="h-3 w-3" aria-hidden="true" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground border-border gap-1"
                      >
                        <User className="h-3 w-3" aria-hidden="true" />
                        Member
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lastSignInAt ? (
                      <time dateTime={lastSignInAt}>{lastSignInFormatted}</time>
                    ) : (
                      "Never"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No team members yet. Invite someone to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
