"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inviteUser } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, X, CheckCircle2, AlertCircle } from "lucide-react";
import type { ActionState } from "@/lib/types/database";

const initialState: ActionState = {};

export function InviteUserForm() {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState(
    inviteUser,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      // Keep form visible to show success message, auto-hide after 3s
      const timer = setTimeout(() => {
        setShowForm(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="gap-1.5">
        <Mail className="h-4 w-4" aria-hidden="true" />
        Invite Team Member
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <form ref={formRef} action={formAction}>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="invite-email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="name@ad-lab.io"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role" className="text-sm font-medium">
                Role
              </Label>
              <Select name="role" defaultValue="member">
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Button
              type="submit"
              disabled={isPending}
              size="default"
              aria-busy={isPending || undefined}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                "Send Invite"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowForm(false)}
              aria-label="Cancel invite"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Only @ad-lab.io email addresses are accepted. After inviting, share the
          /signup link with them — they&apos;ll sign up themselves.
        </p>
      </form>

      {state?.message && (
        <div
          role={state.success ? "status" : "alert"}
          aria-live="polite"
          className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
            state.success
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {state.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {state.message}
        </div>
      )}
    </div>
  );
}
