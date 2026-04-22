"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import type { ActionState } from "@/lib/types/database";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const noteSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  body: z.string().min(1, "Note cannot be empty").max(10000, "Note too long"),
  is_pinned: z.coerce.boolean().optional(),
});

const pinNoteSchema = z.object({
  note_id: z.string().uuid("Invalid note ID"),
  client_id: z.string().uuid("Invalid client ID"),
  is_pinned: z.coerce.boolean(),
});

const deleteNoteSchema = z.object({
  note_id: z.string().uuid("Invalid note ID"),
  client_id: z.string().uuid("Invalid client ID"),
});

const taskSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  due_date: z.string().optional(),
  assigned_email: z
    .string()
    .refine((v) => v === "" || v.includes("@"), { message: "Must be a valid email" })
    .optional(),
});

const updateTaskStatusSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  client_id: z.string().uuid("Invalid client ID"),
  status: z.enum(["open", "in_progress", "done"]),
});

const deleteTaskSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  client_id: z.string().uuid("Invalid client ID"),
});

const activitySchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  activity_type: z.enum([
    "call",
    "email",
    "meeting",
    "slack",
    "status_change",
    "note",
    "task",
    "alert_response",
    "other",
  ]),
  summary: z.string().min(1, "Summary cannot be empty").max(2000, "Summary too long"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function revalidateWorkspace(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidateTag("client");
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function createNote(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const raw = {
    client_id: formData.get("client_id") as string,
    body: formData.get("body") as string,
    is_pinned: formData.get("is_pinned") === "true",
  };

  const parsed = noteSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "Validation failed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_notes").insert({
    client_id: parsed.data.client_id,
    body: parsed.data.body,
    is_pinned: parsed.data.is_pinned ?? false,
    author_email: user.email ?? user.id,
  });

  if (error) {
    console.error("createNote error:", error);
    return { message: "Failed to create note. Please try again." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: "Note saved." };
}

export async function togglePinNote(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const raw = {
    note_id: formData.get("note_id") as string,
    client_id: formData.get("client_id") as string,
    is_pinned: formData.get("is_pinned") as string,
  };

  const parsed = pinNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();

  // Only admin or note author can pin/unpin
  const { data: note } = await supabase
    .from("workspace_notes")
    .select("author_email")
    .eq("id", parsed.data.note_id)
    .single();

  if (!note) return { message: "Note not found." };

  if (!isAdmin(user) && note.author_email !== (user.email ?? user.id)) {
    return { message: "Permission denied." };
  }

  const { error } = await supabase
    .from("workspace_notes")
    .update({ is_pinned: parsed.data.is_pinned })
    .eq("id", parsed.data.note_id);

  if (error) {
    return { message: "Failed to update note." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: parsed.data.is_pinned ? "Note pinned." : "Note unpinned." };
}

export async function deleteNote(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const raw = {
    note_id: formData.get("note_id") as string,
    client_id: formData.get("client_id") as string,
  };

  const parsed = deleteNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();

  const { data: note } = await supabase
    .from("workspace_notes")
    .select("author_email")
    .eq("id", parsed.data.note_id)
    .single();

  if (!note) return { message: "Note not found." };

  if (!isAdmin(user) && note.author_email !== (user.email ?? user.id)) {
    return { message: "Permission denied." };
  }

  const { error } = await supabase
    .from("workspace_notes")
    .delete()
    .eq("id", parsed.data.note_id);

  if (error) {
    return { message: "Failed to delete note." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: "Note deleted." };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const raw = {
    client_id: formData.get("client_id") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    due_date: (formData.get("due_date") as string) || undefined,
    assigned_email: (formData.get("assigned_email") as string) || undefined,
  };

  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "Validation failed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_tasks").insert({
    client_id: parsed.data.client_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_date: parsed.data.due_date ?? null,
    assigned_email:
      parsed.data.assigned_email && parsed.data.assigned_email !== ""
        ? parsed.data.assigned_email
        : null,
    created_by: user.email ?? user.id,
    status: "open",
  });

  if (error) {
    console.error("createTask error:", error);
    return { message: "Failed to create task. Please try again." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: "Task created." };
}

export async function updateTaskStatus(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAuthenticatedUser();

  const raw = {
    task_id: formData.get("task_id") as string,
    client_id: formData.get("client_id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateTaskStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.task_id);

  if (error) {
    return { message: "Failed to update task." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: "Task updated." };
}

export async function deleteTask(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const raw = {
    task_id: formData.get("task_id") as string,
    client_id: formData.get("client_id") as string,
  };

  const parsed = deleteTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();

  const { data: task } = await supabase
    .from("workspace_tasks")
    .select("created_by")
    .eq("id", parsed.data.task_id)
    .single();

  if (!task) return { message: "Task not found." };

  if (!isAdmin(user) && task.created_by !== (user.email ?? user.id)) {
    return { message: "Permission denied." };
  }

  const { error } = await supabase
    .from("workspace_tasks")
    .delete()
    .eq("id", parsed.data.task_id);

  if (error) {
    return { message: "Failed to delete task." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: "Task deleted." };
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function logActivity(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const raw = {
    client_id: formData.get("client_id") as string,
    activity_type: formData.get("activity_type") as string,
    summary: formData.get("summary") as string,
  };

  const parsed = activitySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "Validation failed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_activity").insert({
    client_id: parsed.data.client_id,
    activity_type: parsed.data.activity_type,
    summary: parsed.data.summary,
    actor_email: user.email ?? user.id,
  });

  if (error) {
    console.error("logActivity error:", error);
    return { message: "Failed to log activity. Please try again." };
  }

  revalidateWorkspace(parsed.data.client_id);
  return { success: true, message: "Activity logged." };
}
