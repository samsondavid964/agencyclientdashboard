"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/utils/auth";

export interface SavedView {
  id: string;
  name: string;
  params: Record<string, string>;
  is_shared: boolean;
}

export async function listSavedViews(): Promise<SavedView[]> {
  await getAuthenticatedUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_views")
    .select("id, name, params, is_shared")
    .order("name", { ascending: true });

  if (error) {
    console.error("listSavedViews error:", error);
    return [];
  }

  return (data ?? []) as SavedView[];
}

export async function saveView(
  name: string,
  params: Record<string, string>
): Promise<{ success: boolean; message?: string }> {
  const user = await getAuthenticatedUser();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, message: "Name is required." };

  const supabase = await createClient();

  // Upsert by (user_id, name)
  const { error } = await supabase
    .from("saved_views")
    .upsert(
      { user_id: user.id, name: trimmed, params },
      { onConflict: "user_id,name" }
    );

  if (error) {
    console.error("saveView error:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteSavedView(
  id: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getAuthenticatedUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("deleteSavedView error:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
