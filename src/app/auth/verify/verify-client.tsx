"use client";

import React, { useRef, useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { verifyOtp, sendOtpCode } from "@/lib/actions/auth";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/auth/step-indicator";

type VerifyFlowType = "signup" | "magiclink" | "recovery";

type VerifyClientProps = {
  email: string;
  type: VerifyFlowType;
};

const ALLOWED_ERRORS = new Set<string>([
  "Please enter the verification code.",
  "Verification failed. Please try again.",
  "Something went wrong. Please try again.",
  "Too many attempts. Please try again later.",
]);

const TYPE_LABELS: Record<string, { title: string; description: string }> = {
  signup: {
    title: "Verify Your Email",
    description: "Enter the 8-digit code we sent to your email to confirm your account.",
  },
  magiclink: {
    title: "Check Your Email",
    description: "Enter the 8-digit sign-in code we sent to your email.",
  },
  recovery: {
    title: "Reset Your Password",
    description:
      "Enter the 8-digit code from the email we sent, or click the reset link in that email to continue.",
  },
};

function OtpInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newValue = value.split("");
    newValue[index] = char;
    const joined = newValue.join("").slice(0, 8);
    onChange(joined);
    if (char && index < 7) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    onChange(digits);
    inputs.current[Math.min(digits.length, 7)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 8 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-10 rounded-lg border bg-card text-center text-lg font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          spellCheck={false}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

export default function VerifyClient({ email, type }: VerifyClientProps) {
  const searchParams = useSearchParams();

  // Only render URL-sourced errors that match our allowlist. An unrecognised
  // error param (stale URL, browser-history back-navigation, crafted link)
  // shouldn't render a scary generic banner on what is otherwise a happy-path
  // landing — better to silently drop it than to confuse the user mid-flow.
  const rawError = searchParams.get("error");
  const error = rawError && ALLOWED_ERRORS.has(rawError) ? rawError : undefined;

  const labels = TYPE_LABELS[type] ?? TYPE_LABELS.signup;

  const [otpValue, setOtpValue] = useState("");
  const [cooldown, setCooldown] = useState(60);

  const [resendState, resendAction, resendPending] = useActionState(sendOtpCode, null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset cooldown after a confirmed successful resend
  useEffect(() => {
    if (resendState?.success) {
      setCooldown(60);
    }
  }, [resendState]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_80%_0%,hsl(152_69%_15%/0.06),transparent_60%)]" />
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm animate-slide-up">
        <StepIndicator current={1} total={3} />

        <div className="text-center">
          <h1 className="text-2xl font-bold">{labels.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {labels.description}
          </p>
          {email && (
            <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
          )}
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

        {resendState?.message && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-md border p-3 text-sm",
              resendState.success
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            )}
          >
            {resendState.message}
          </div>
        )}

        <form action={verifyOtp} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="token" value={otpValue} />

          <div className="space-y-3">
            <Label className="block text-center">Verification Code</Label>
            <OtpInput value={otpValue} onChange={setOtpValue} />
          </div>

          <SubmitButton
            className="w-full"
            pendingText="Verifying…"
            disabled={otpValue.length < 8}
          >
            Verify Code
          </SubmitButton>
        </form>

        {/* Resend option for sign-in and recovery flows */}
        {(type === "magiclink" || type === "recovery") && email && (
          <div className="text-center">
            <form action={resendAction}>
              <input type="hidden" name="type" value={type} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={cooldown > 0 || resendPending}
                className="text-sm text-muted-foreground"
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
              </Button>
            </form>
          </div>
        )}

        <div className="text-center">
          <Link
            href={type === "recovery" ? "/auth/forgot-password" : "/login"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
