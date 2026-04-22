"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/auth";
import { clientServerSchema, clientStatusSchema } from "@/lib/validations/client";
import type { ActionState } from "@/lib/types/database";

export async function createClientAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientServerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed. Please check the form fields.",
    };
  }

  const values = parsed.data;
  const supabase = await createClient();

  // Build insert object, converting empty strings to null
  const insertData = {
    client_name: values.client_name,
    company_name: values.company_name || null,
    store_name: values.store_name || null,
    google_ads_id: values.google_ads_id,
    gmc_id: values.gmc_id || null,
    industry: values.industry || null,
    website_platform: values.website_platform || null,
    store_url: values.store_url || null,
    monthly_budget: values.monthly_budget,
    roas_target: values.roas_target,
    account_manager: values.account_manager || null,
    mb_assigned: values.mb_assigned || null,
    csm_assigned: values.csm_assigned || null,
    slack_channel_url: values.slack_channel_url || null,
    clickup_folder_url: values.clickup_folder_url || null,
    client_status: values.client_status,
    onboarding_date: values.onboarding_date || null,
    notes: values.notes || null,
  };

  const { data, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    // Handle unique constraint on google_ads_id (PostgreSQL error code 23505)
    if (error.code === "23505") {
      return {
        errors: {
          google_ads_id: [
            "This Google Ads ID is already registered to another client.",
          ],
        },
        message: "Duplicate Google Ads ID.",
      };
    }
    return {
      message: `Failed to create client: ${error.message}`,
    };
  }

  revalidatePath("/");
  revalidateTag("client");
  redirect(`/clients/${data.id}`);
}

export async function updateClient(
  clientId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientServerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed. Please check the form fields.",
    };
  }

  const values = parsed.data;
  const supabase = await createClient();

  const updateData = {
    client_name: values.client_name,
    company_name: values.company_name || null,
    store_name: values.store_name || null,
    google_ads_id: values.google_ads_id,
    gmc_id: values.gmc_id || null,
    industry: values.industry || null,
    website_platform: values.website_platform || null,
    store_url: values.store_url || null,
    monthly_budget: values.monthly_budget,
    roas_target: values.roas_target,
    account_manager: values.account_manager || null,
    mb_assigned: values.mb_assigned || null,
    csm_assigned: values.csm_assigned || null,
    slack_channel_url: values.slack_channel_url || null,
    clickup_folder_url: values.clickup_folder_url || null,
    client_status: values.client_status,
    onboarding_date: values.onboarding_date || null,
    notes: values.notes || null,
  };

  const { error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", clientId);

  if (error) {
    if (error.code === "23505") {
      return {
        errors: {
          google_ads_id: [
            "This Google Ads ID is already registered to another client.",
          ],
        },
        message: "Duplicate Google Ads ID.",
      };
    }
    return {
      message: `Failed to update client: ${error.message}`,
    };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  revalidateTag("client");

  return {
    success: true,
    message: "Client updated successfully.",
  };
}

export async function updateClientStatus(
  clientId: string,
  newStatus: string
): Promise<ActionState> {
  await requireAdmin();

  const parsed = clientStatusSchema.safeParse(newStatus);
  if (!parsed.success) {
    return { message: "Invalid status value." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ client_status: parsed.data })
    .eq("id", clientId);

  if (error) {
    return { message: `Failed to update status: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  revalidateTag("client");

  return {
    success: true,
    message: `Status changed to ${parsed.data}.`,
  };
}

export async function reassignClientMB(
  clientId: string,
  newMB: string
): Promise<ActionState> {
  await requireAdmin();

  if (!clientId) return { message: "Client ID is required." };
  if (!newMB.trim()) return { message: "Media buyer value is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ mb_assigned: newMB.trim() })
    .eq("id", clientId);

  if (error) {
    return { message: `Failed to reassign media buyer: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  revalidateTag("client");

  return { success: true, message: "Media buyer updated." };
}

export async function bulkReassignMB(
  clientIds: string[],
  newMB: string
): Promise<ActionState> {
  await requireAdmin();

  if (!clientIds.length) return { message: "No clients selected." };
  if (!newMB.trim()) return { message: "Media buyer value is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ mb_assigned: newMB.trim() })
    .in("id", clientIds);

  if (error) {
    return { message: `Failed to bulk reassign media buyers: ${error.message}` };
  }

  revalidatePath("/");
  revalidateTag("client");

  return { success: true, message: `Updated ${clientIds.length} client(s).` };
}

export async function deleteClient(clientId: string): Promise<ActionState> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (error) {
    return { message: `Failed to delete client: ${error.message}` };
  }

  revalidatePath("/");
  revalidateTag("client");
  redirect("/");
}

