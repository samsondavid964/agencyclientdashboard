import "server-only";
import { createN8nAgentClient } from "@/lib/supabase/n8n-agent";
import type { Client } from "@/lib/types/database";

export interface LatestWeeklyReport {
  id: string;
  html_content: string;
  date_start: string | null;
  date_end: string | null;
  created_at: string;
}

/**
 * Strip non-digits. Used to normalize Google Ads IDs across the two projects
 * (this dashboard formats them as 123-456-7890 for display; the n8n Agent
 * Data project may store raw digits or another format).
 */
function digitsOnly(id: string | null | undefined): string {
  return (id ?? "").replace(/\D/g, "");
}

/**
 * Lowercase + alphanumeric only. Matches the normalization the reports app
 * applies when storing client_name (e.g. "Numoya, Inc." → "numoyainc").
 */
function normalizeName(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickNormalizedName(client: Pick<Client, "store_name" | "client_name">): string {
  const fromStore = normalizeName(client.store_name);
  if (fromStore) return fromStore;
  return normalizeName(client.client_name);
}

/**
 * Fetches the latest weekly report for a client from the n8n Agent Data
 * project. Returns null when no completed weekly report exists.
 *
 * Match priority: google_ads_id (digits-only) > normalized client_name.
 * Within ties, ORDER BY created_at DESC picks the most recent.
 */
export async function getLatestWeeklyReport(
  client: Pick<Client, "google_ads_id" | "store_name" | "client_name">,
): Promise<LatestWeeklyReport | null> {
  const supabase = createN8nAgentClient();
  const adsId = digitsOnly(client.google_ads_id);
  const normName = pickNormalizedName(client);

  let winningId: string | null = null;

  if (adsId) {
    const { data: byAds, error: adsErr } = await supabase
      .from("report_jobs")
      .select("id, google_ads_id")
      .eq("status", "complete")
      .eq("job_type", "weekly")
      .not("html_content", "is", null)
      .order("created_at", { ascending: false });
    if (adsErr) throw adsErr;
    const hit = (byAds ?? []).find(
      (row) => digitsOnly(row.google_ads_id ?? null) === adsId,
    );
    if (hit) winningId = hit.id;
  }

  if (!winningId && normName) {
    const { data: byName, error: nameErr } = await supabase
      .from("report_jobs")
      .select("id, client_name")
      .eq("status", "complete")
      .eq("job_type", "weekly")
      .not("html_content", "is", null)
      .order("created_at", { ascending: false });
    if (nameErr) throw nameErr;
    const hit = (byName ?? []).find(
      (row) => normalizeName(row.client_name) === normName,
    );
    if (hit) winningId = hit.id;
  }

  if (!winningId) return null;

  const { data: row, error: rowErr } = await supabase
    .from("report_jobs")
    .select("id, html_content, date_start, date_end, created_at")
    .eq("id", winningId)
    .maybeSingle();
  if (rowErr) throw rowErr;
  if (!row || !row.html_content) return null;

  return {
    id: row.id,
    html_content: row.html_content,
    date_start: row.date_start,
    date_end: row.date_end,
    created_at: row.created_at,
  };
}

/**
 * Cheap presence check used by the client detail page to decide whether to
 * render the "Latest report" button. Same predicate as getLatestWeeklyReport
 * but selects nothing heavy.
 */
export async function hasLatestWeeklyReport(
  client: Pick<Client, "google_ads_id" | "store_name" | "client_name">,
): Promise<boolean> {
  const supabase = createN8nAgentClient();
  const adsId = digitsOnly(client.google_ads_id);
  const normName = pickNormalizedName(client);

  if (!adsId && !normName) return false;

  const { data, error } = await supabase
    .from("report_jobs")
    .select("id, google_ads_id, client_name")
    .eq("status", "complete")
    .eq("job_type", "weekly")
    .not("html_content", "is", null);
  if (error) throw error;

  for (const row of data ?? []) {
    if (adsId && digitsOnly(row.google_ads_id ?? null) === adsId) return true;
    if (normName && normalizeName(row.client_name) === normName) return true;
  }
  return false;
}

/**
 * Inject the view-mode body class so the report's existing
 * `body.view-mode [contenteditable]` CSS disables editing. Inserts a script
 * before the closing </body> tag (case-insensitive). Falls back to appending
 * if no </body> is found (e.g. malformed HTML).
 */
export function injectViewMode(html: string): string {
  const tag = '<script>document.body.classList.add("view-mode");</script>';
  const re = /<\/body\s*>/gi;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) last = m;
  if (!last) return html + tag;
  return html.slice(0, last.index) + tag + html.slice(last.index);
}
