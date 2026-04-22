"use client";

import { useState } from "react";
import Link from "next/link";
import { updatePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < current ? "w-6 bg-primary" : i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? undefined;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_80%_0%,hsl(152_69%_15%/0.06),transparent_60%)]" />
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm animate-slide-up">
        <StepIndicator current={2} total={3} />

        <div className="text-center">
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <form action={updatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min 6 characters"
              minLength={6}
              required
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Confirm your password"
              minLength={6}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={mismatch ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {mismatch && (
              <p className="text-sm text-destructive">Passwords don&apos;t match</p>
            )}
          </div>

          <SubmitButton
            className="w-full"
            pendingText="Updating…"
            disabled={!password || !confirm || mismatch}
          >
            Update Password
          </SubmitButton>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
