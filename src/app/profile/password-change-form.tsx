"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { changePassword } from "@/lib/actions/auth";

const MIN_LENGTH = 12;

export default function PasswordChangeForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (state?.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [state]);

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const incomplete =
    !currentPassword || !newPassword || !confirmPassword;
  const disabled =
    isPending ||
    incomplete ||
    newPassword.length < MIN_LENGTH ||
    newPassword !== confirmPassword;

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && (
        <div
          role={state.success ? "status" : "alert"}
          aria-live="polite"
          className={cn(
            "rounded-md border p-3 text-sm",
            state.success
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="current_password">Current Password</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new_password">New Password</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        {tooShort && (
          <p className="text-xs text-muted-foreground">
            Password must be at least {MIN_LENGTH} characters.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm New Password</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {mismatch && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Passwords do not match.
          </p>
        )}
      </div>

      <Button type="submit" disabled={disabled} aria-busy={isPending || undefined}>
        {isPending ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}
