import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientById } from "@/lib/queries/clients";
import { getLatestWeeklyReport, injectViewMode } from "@/lib/queries/reports";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) return { title: { absolute: "Latest report — Ad-Lab" } };
  const label = client.store_name || client.client_name;
  return { title: { absolute: `Weekly report — ${label} — Ad-Lab` } };
}

export default async function LatestReportPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const report = await getLatestWeeklyReport(client);

  if (!report) {
    const label = client.store_name || client.client_name;
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">No weekly report yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No completed weekly report has been generated for {label} yet.
          </p>
          <Link
            href={`/clients/${client.id}`}
            className="mt-4 inline-block rounded text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Back to client
          </Link>
        </div>
      </main>
    );
  }

  const srcDoc = injectViewMode(report.html_content);
  const label = client.store_name || client.client_name;

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups"
      className="fixed inset-0 z-[60] h-screen w-screen border-0"
      title={`Weekly report — ${label}`}
    />
  );
}
