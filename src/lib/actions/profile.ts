"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, requireAdmin } from "@/lib/utils/auth";

// Whitelist MIME types -> file extensions. Deriving the extension from the
// browser-reported MIME type (not the filename) blocks attacks where an
// attacker uploads e.g. `evil.svg` or `evil.html` and the extension is
// propagated into the public CDN URL. `image/svg+xml` is intentionally
// excluded because SVG can embed JavaScript.
const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extensionFromMime(mime: string): string | null {
  return ALLOWED_IMAGE_MIME_TYPES[mime.toLowerCase()] ?? null;
}

export async function updateProfile(formData: FormData) {
  await getAuthenticatedUser(); // ensure authenticated
  const supabase = await createClient();

  const fullName = formData.get("full_name") as string;

  if (!fullName || fullName.trim().length === 0) {
    return { error: "Name is required." };
  }

  const trimmed = fullName.trim().slice(0, 100);

  const { error } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  });

  if (error) {
    return { error: "Could not update profile. Please try again." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const user = await getAuthenticatedUser();
  const supabase = await createClient();

  const file = formData.get("avatar") as File;

  if (!file || file.size === 0) {
    return { error: "No file selected." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "File must be under 2MB." };
  }

  const avatarExt = extensionFromMime(file.type);
  if (!avatarExt) {
    return { error: "Unsupported image type." };
  }

  const filePath = `${user.id}/avatar.${avatarExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { error: "Could not upload avatar. Please try again." };
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  // Append cache-buster to force browser refresh
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (updateError) {
    return { error: "Could not save avatar. Please try again." };
  }

  revalidatePath("/", "layout");
  return { success: true, avatarUrl };
}

export async function uploadClientLogo(clientId: string, formData: FormData) {
  // Only admins may upload client logos. Throws a redirect to /forbidden for
  // non-admins, so the browser-side `startTransition` call will raise.
  await requireAdmin();
  const supabase = await createClient();

  const file = formData.get("logo") as File;

  if (!file || file.size === 0) {
    return { error: "No file selected." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "File must be under 2MB." };
  }

  const logoExt = extensionFromMime(file.type);
  if (!logoExt) {
    return { error: "Unsupported image type." };
  }

  const filePath = `${clientId}/logo.${logoExt}`;

  const { error: uploadError } = await supabase.storage
    .from("client-logos")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { error: "Could not upload logo. Please try again." };
  }

  const { data: urlData } = supabase.storage
    .from("client-logos")
    .getPublicUrl(filePath);

  const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Use admin client for the DB update — the anon client is blocked by RLS
  // (clients table has no UPDATE policy). requireAdmin() already gates this action.
  const adminClient = createAdminClient();
  const { error: dbError } = await adminClient
    .from("clients")
    .update({ logo_url: logoUrl })
    .eq("id", clientId);

  if (dbError) {
    return { error: "Could not save logo. Please try again." };
  }

  revalidatePath("/");
  revalidatePath(`/clients/${clientId}`);
  return { success: true, logoUrl };
}
