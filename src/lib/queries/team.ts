import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeamMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null; // 'admin' | 'member'
};

export type TeamWorkloadRow = {
  email: string;
  full_name: string | null;
  clients_assigned: number;
  avg_health_score: number | null;
  open_alerts: number;
  open_tasks: number;
  last_activity_at: string | null;
};

export type UserActivityEntry = {
  type: "activity" | "note" | "alert_response";
  occurred_at: string;
  client_id: string;
  client_name: string;
  summary: string;
  activity_type?: string;
};

export async function getTeamMembers(): Promise<TeamMember[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error("getTeamMembers error:", error);
    return [];
  }
  return (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name:
      (u.user_metadata?.full_name as string | undefined) ??
      (u.user_metadata?.name as string | undefined) ??
      null,
    role: (u.app_metadata?.role as string | undefined) ?? "member",
  }));
}

export async function getTeamWorkload(date: string): Promise<TeamWorkloadRow[]> {
  const supabase = await createClient();

  // 1. Fetch all active clients grouped by mb_assigned
  const { data: clientsData, error: clientsError } = await supabase
    .from("clients")
    .select("id, mb_assigned")
    .eq("client_status", "active")
    .not("mb_assigned", "is", null);

  if (clientsError) {
    console.error("getTeamWorkload clients error:", clientsError);
    return [];
  }

  const clients = (clientsData ?? []) as { id: string; mb_assigned: string }[];

  // Group client IDs by assignee email
  const byEmail = new Map<string, string[]>();
  for (const c of clients) {
    const email = c.mb_assigned;
    const existing = byEmail.get(email) ?? [];
    existing.push(c.id);
    byEmail.set(email, existing);
  }

  if (byEmail.size === 0) return [];

  const emailList = Array.from(byEmail.keys());
  const clientIdList = clients.map((c) => c.id);

  // 2a. Avg health scores for the given date
  const { data: scoresData, error: scoresError } = await supabase
    .from("daily_health_scores")
    .select("client_id, weighted_total")
    .in("client_id", clientIdList)
    .eq("date", date);

  if (scoresError) {
    console.error("getTeamWorkload scores error:", scoresError);
  }
  const scoresByClientId = new Map<string, number | null>();
  for (const s of scoresData ?? []) {
    scoresByClientId.set(
      s.client_id as string,
      s.weighted_total as number | null
    );
  }

  // 2b. Unresolved alert_log rows (response_notes IS NULL)
  const { data: alertsData, error: alertsError } = await supabase
    .from("alert_log")
    .select("client_id")
    .in("client_id", clientIdList)
    .is("response_notes", null);

  if (alertsError) {
    console.error("getTeamWorkload alerts error:", alertsError);
  }
  const alertCountByClientId = new Map<string, number>();
  for (const a of alertsData ?? []) {
    const cid = a.client_id as string;
    alertCountByClientId.set(cid, (alertCountByClientId.get(cid) ?? 0) + 1);
  }

  // 2c. Incomplete tasks per client
  const { data: tasksData, error: tasksError } = await supabase
    .from("client_tasks")
    .select("client_id")
    .in("client_id", clientIdList)
    .eq("completed", false);

  if (tasksError) {
    console.error("getTeamWorkload tasks error:", tasksError);
  }
  const taskCountByClientId = new Map<string, number>();
  for (const t of tasksData ?? []) {
    const cid = t.client_id as string;
    taskCountByClientId.set(cid, (taskCountByClientId.get(cid) ?? 0) + 1);
  }

  // 2d. Latest activity per assignee email
  const { data: activityData, error: activityError } = await supabase
    .from("client_activity_log")
    .select("user_email, occurred_at")
    .in("user_email", emailList)
    .order("occurred_at", { ascending: false });

  if (activityError) {
    console.error("getTeamWorkload activity error:", activityError);
  }
  const latestActivityByEmail = new Map<string, string>();
  for (const a of activityData ?? []) {
    const email = a.user_email as string;
    if (!latestActivityByEmail.has(email)) {
      latestActivityByEmail.set(email, a.occurred_at as string);
    }
  }

  // 3. Cross-reference with team members for full_name
  const teamMembers = await getTeamMembers();
  const memberByEmail = new Map<string, TeamMember>();
  for (const m of teamMembers) {
    memberByEmail.set(m.email, m);
  }

  // Build result rows
  const rows: TeamWorkloadRow[] = [];
  for (const [email, clientIds] of byEmail) {
    const member = memberByEmail.get(email);

    // Avg health score for this assignee's clients
    const scores = clientIds
      .map((id) => scoresByClientId.get(id))
      .filter((s): s is number => s != null);
    const avg_health_score =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    // Open alerts sum across all clients for this assignee
    const open_alerts = clientIds.reduce(
      (sum, id) => sum + (alertCountByClientId.get(id) ?? 0),
      0
    );

    // Open tasks sum
    const open_tasks = clientIds.reduce(
      (sum, id) => sum + (taskCountByClientId.get(id) ?? 0),
      0
    );

    rows.push({
      email,
      full_name: member?.full_name ?? null,
      clients_assigned: clientIds.length,
      avg_health_score,
      open_alerts,
      open_tasks,
      last_activity_at: latestActivityByEmail.get(email) ?? null,
    });
  }

  // Sort by clients_assigned desc
  rows.sort((a, b) => b.clients_assigned - a.clients_assigned);
  return rows;
}

export async function getUserActivity(
  userEmail: string,
  days: number
): Promise<UserActivityEntry[]> {
  const supabase = await createClient();

  // Build cutoff timestamp string
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  // Fetch client names upfront for fast join
  const { data: clientsData } = await supabase
    .from("clients")
    .select("id, client_name");
  const clientNameById = new Map<string, string>();
  for (const c of clientsData ?? []) {
    clientNameById.set(c.id as string, c.client_name as string);
  }

  const entries: UserActivityEntry[] = [];

  // Query client_activity_log
  const { data: activityRows, error: activityError } = await supabase
    .from("client_activity_log")
    .select("client_id, activity_type, summary, occurred_at")
    .eq("user_email", userEmail)
    .gte("occurred_at", cutoff)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (activityError) {
    console.error("getUserActivity activity error:", activityError);
  }
  for (const row of activityRows ?? []) {
    entries.push({
      type: "activity",
      occurred_at: row.occurred_at as string,
      client_id: row.client_id as string,
      client_name: clientNameById.get(row.client_id as string) ?? "Unknown",
      summary: row.summary as string,
      activity_type: row.activity_type as string,
    });
  }

  // Query client_notes
  const { data: notesRows, error: notesError } = await supabase
    .from("client_notes")
    .select("client_id, body, created_at")
    .eq("author_email", userEmail)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (notesError) {
    console.error("getUserActivity notes error:", notesError);
  }
  for (const row of notesRows ?? []) {
    entries.push({
      type: "note",
      occurred_at: row.created_at as string,
      client_id: row.client_id as string,
      client_name: clientNameById.get(row.client_id as string) ?? "Unknown",
      summary: row.body as string,
    });
  }

  // Query alert_log responses
  const { data: alertRows, error: alertError } = await supabase
    .from("alert_log")
    .select("client_id, response_notes, created_at")
    .eq("responded_by", userEmail)
    .gte("created_at", cutoff)
    .not("response_notes", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (alertError) {
    console.error("getUserActivity alerts error:", alertError);
  }
  for (const row of alertRows ?? []) {
    entries.push({
      type: "alert_response",
      occurred_at: row.created_at as string,
      client_id: row.client_id as string,
      client_name: clientNameById.get(row.client_id as string) ?? "Unknown",
      summary: (row.response_notes as string) ?? "Alert responded",
    });
  }

  // Merge, sort descending, limit 50
  entries.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );
  return entries.slice(0, 50);
}
