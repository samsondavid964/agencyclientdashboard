import { createClient } from "@/lib/supabase/server";

// The UI layer uses these shapes. The DB columns (migration 027) differ:
//   client_notes.pinned           ↔ is_pinned
//   client_tasks.completed (bool) ↔ status ("open" | "done")
//   client_activity_log.user_email ↔ actor_email
//   client_activity_log.occurred_at ↔ created_at
// We translate here so UI components stay unchanged.

export interface WorkspaceNote {
  id: string;
  client_id: string;
  author_email: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTask {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: "open" | "done";
  due_date: string | null;
  assigned_email: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "slack"
  | "status_change"
  | "note"
  | "task"
  | "alert_response"
  | "other";

export interface WorkspaceActivity {
  id: string;
  client_id: string;
  actor_email: string;
  activity_type: ActivityType;
  summary: string;
  created_at: string;
}

export async function getWorkspaceNotes(clientId: string): Promise<WorkspaceNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, client_id, author_email, body, pinned, created_at, updated_at")
    .eq("client_id", clientId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace notes:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    client_id: row.client_id,
    author_email: row.author_email ?? "",
    body: row.body,
    is_pinned: row.pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getWorkspaceTasks(clientId: string): Promise<WorkspaceTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_tasks")
    .select(
      "id, client_id, title, description, completed, due_date, assigned_email, created_by_user_id, created_at, updated_at"
    )
    .eq("client_id", clientId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace tasks:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    description: row.description,
    status: row.completed ? ("done" as const) : ("open" as const),
    due_date: row.due_date,
    assigned_email: row.assigned_email,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getWorkspaceActivity(
  clientId: string,
  limit: number = 50
): Promise<WorkspaceActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_activity_log")
    .select("id, client_id, user_email, activity_type, summary, occurred_at")
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching workspace activity:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    client_id: row.client_id,
    actor_email: row.user_email ?? "",
    activity_type: row.activity_type as ActivityType,
    summary: row.summary,
    created_at: row.occurred_at,
  }));
}
