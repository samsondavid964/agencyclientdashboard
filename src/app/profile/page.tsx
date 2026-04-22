import type { Metadata } from "next";
import { User } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/utils/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your account and profile picture.",
};

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();

  const initialUser = {
    id: user.id,
    email: user.email || "",
    fullName: (user.user_metadata?.full_name as string | undefined) || "",
    avatarUrl: (user.user_metadata?.avatar_url as string | null | undefined) ?? null,
    role: (user.app_metadata?.role as string | undefined) || "member",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-primary" aria-hidden="true" />
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and profile picture.
        </p>
      </div>

      <ProfileForm initialUser={initialUser} />
    </div>
  );
}
