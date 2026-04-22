"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import { logActionSchema } from "@/lib/validations/client";
import type { ActionState } from "@/lib/types/database";

export async function logActionTaken(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const rawData = {
    alert_id: formData.get("alert_id") as string,
    response_notes: formData.get("response_notes") as string,
  };

  const parsed = logActionSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const supabase = await createClient();

  // Fetch the alert to get client_id for permission check
  const { data: alert, error: alertError } = await supabase
    .from("alert_log")
    .select("id, client_id, response_notes")
    .eq("id", parsed.data.alert_id)
    .single();

  if (alertError || !alert) {
    return { message: "Alert not found." };
  }

  if (alert.response_notes !== null) {
    return { message: "Action has already been logged for this alert." };
  }

  // Permission check: admin or assigned media buyer
  if (!isAdmin(user)) {
    const { data: client } = await supabase
      .from("clients")
      .select("mb_assigned")
      .eq("id", alert.client_id)
      .single();

    if (!client || user.email !== client.mb_assigned) {
      return { message: "You do not have permission to log actions for this client." };
    }
  }

  // Update alert_log
  const { error: updateError } = await supabase
    .from("alert_log")
    .update({
      response_notes: parsed.data.response_notes,
      responded_by: user.email || user.id,
    })
    .eq("id", parsed.data.alert_id)
    .is("response_notes", null);

  if (updateError) {
    console.error("Error logging action:", updateError);
    return { message: "Failed to log action. Please try again." };
  }

  revalidatePath("/clients/[id]", "page");
  revalidatePath("/alerts");
  revalidateTag("client");

  return {
    success: true,
    message: "Action logged successfully.",
  };
}

export async function bulkResolveAlerts(
  alertIds: string[],
  notes: string
): Promise<{ success: boolean; message: string; resolvedCount?: number }> {
  if (!alertIds.length) {
    return { success: false, message: "No alert IDs provided." };
  }

  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return { success: false, message: "Response notes cannot be empty." };
  }

  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  // Fetch all requested alerts to check permissions and resolve-eligibility
  const { data: alerts, error: fetchError } = await supabase
    .from("alert_log")
    .select("id, client_id, response_notes")
    .in("id", alertIds);

  if (fetchError || !alerts) {
    return { success: false, message: "Failed to fetch alerts." };
  }

  // Only process alerts that are still unresolved
  const unresolved = alerts.filter((a) => a.response_notes === null);

  if (unresolved.length === 0) {
    return { success: false, message: "All selected alerts are already resolved." };
  }

  // Permission check for non-admins: must be assigned MB on every alert's client
  if (!isAdmin(user)) {
    const clientIds = [...new Set(unresolved.map((a) => a.client_id))];
    const { data: clients } = await supabase
      .from("clients")
      .select("id, mb_assigned")
      .in("id", clientIds);

    const clientMap = new Map(
      (clients ?? []).map((c) => [c.id, c.mb_assigned])
    );

    const permitted = unresolved.every(
      (a) => clientMap.get(a.client_id) === user.email
    );

    if (!permitted) {
      return {
        success: false,
        message: "You do not have permission to resolve one or more of these alerts.",
      };
    }
  }

  const resolvedIds = unresolved.map((a) => a.id);

  const { error: updateError } = await supabase
    .from("alert_log")
    .update({
      response_notes: trimmedNotes,
      responded_by: user.email || user.id,
    })
    .in("id", resolvedIds)
    .is("response_notes", null);

  if (updateError) {
    console.error("Error bulk-resolving alerts:", updateError);
    return { success: false, message: "Failed to resolve alerts. Please try again." };
  }

  revalidatePath("/clients/[id]", "page");
  revalidatePath("/alerts");
  revalidateTag("client");

  return {
    success: true,
    message: `${resolvedIds.length} alert${resolvedIds.length !== 1 ? "s" : ""} resolved.`,
    resolvedCount: resolvedIds.length,
  };
}
