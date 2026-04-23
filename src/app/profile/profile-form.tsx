"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateProfile, uploadAvatar } from "@/lib/actions/profile";
import { getInitials } from "@/lib/utils/initials";
import PasswordChangeForm from "./password-change-form";

interface ProfileFormProps {
  initialUser: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
  };
}

export function ProfileForm({ initialUser }: ProfileFormProps) {
  const [user, setUser] = useState(initialUser);
  const [fullName, setFullName] = useState(initialUser.fullName);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveName = () => {
    if (!fullName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("full_name", fullName.trim());

    startSaving(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Name updated!");
        setUser((prev) => ({ ...prev, fullName: fullName.trim() }));
      }
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: type and size
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    startUploading(async () => {
      try {
        const result = await uploadAvatar(formData);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Avatar updated!");
          if (result.avatarUrl) {
            setUser((prev) => ({ ...prev, avatarUrl: result.avatarUrl! }));
          }
        }
      } catch {
        // Catches framework-level failures (e.g. body-size rejection before
        // the action runs) so the page doesn't bounce to the error boundary.
        toast.error("Could not upload avatar. Please try a smaller image.");
      } finally {
        e.target.value = "";
      }
    });
  };

  const initials = getInitials(user.fullName || user.email);

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label="Change profile picture"
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-primary"
          >
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
              ) : (
                <Camera className="h-6 w-6 text-white" aria-hidden="true" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={isUploading}
          />
          <div>
            <p className="text-sm font-medium">Upload a photo</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, or GIF. Max 2MB.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-busy={isUploading || undefined}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                "Change photo"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Account Details Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Account Details</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <div className="flex gap-3">
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
              <Button
                onClick={handleSaveName}
                disabled={isSaving || fullName === user.fullName}
                aria-busy={isSaving || undefined}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Save
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              readOnly
              value={user.email}
              className="cursor-not-allowed opacity-70 select-all"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              readOnly
              value={user.role || "member"}
              className="cursor-not-allowed opacity-70 capitalize"
            />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Security</h2>
        <PasswordChangeForm />
      </div>
    </div>
  );
}
