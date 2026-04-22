import type { Metadata } from "next";
import { requireAdmin } from "@/lib/utils/auth";
import { ClientForm } from "@/components/forms/client-form";

export const metadata: Metadata = {
  title: "Add Client",
  description: "Register a new client in the dashboard.",
};

export default async function NewClientPage() {
  // Redirects to /forbidden for non-admins.
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Client</h1>
        <p className="text-muted-foreground">
          Fill in the details below to register a new client.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ClientForm />
      </div>
    </div>
  );
}
