import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import { getAllAlerts } from "@/lib/queries/alerts";
import { AlertsTable } from "@/components/alerts/alerts-table";

export const metadata: Metadata = {
  title: "Alerts Inbox",
  description: "Cross-client alert inbox — view and respond to health score alerts.",
};

export default async function AlertsPage() {
  const user = await getAuthenticatedUser();
  const userIsAdmin = isAdmin(user);

  const alerts = await getAllAlerts(200);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
          <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Alerts Inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            Health score alerts across all active clients
          </p>
        </div>
      </div>

      <AlertsTable
        alerts={alerts}
        isAdmin={userIsAdmin}
        userEmail={user.email ?? ""}
      />
    </div>
  );
}
