import { createClient } from "@/lib/supabase/server";

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
  status: "open" | "in_progress" | "done";
  due_date: string | null;
  assigned_email: string | null;
  created_by: string;
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
    .from("workspace_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace notes:", error);
    return [];
  }
  return (data as WorkspaceNote[]) ?? [];
}

export async function getWorkspaceTasks(clientId: string): Promise<WorkspaceTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace tasks:", error);
    return [];
  }
  return (data as WorkspaceTask[]) ?? [];
}

export async function getWorkspaceActivity(
  clientId: string,
  limit: number = 50
): Promise<WorkspaceActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_activity")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching workspace activity:", error);
    return [];
  }
  return (data as WorkspaceActivity[]) ?? [];
}
