"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { verifyOtp, requestOtpSignIn } from "@/lib/actions/auth";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

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
    description: "Enter the 8-digit code we sent to your email to reset your password.",
  },
};

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

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const type = searchParams.get("type") ?? "signup";
  const error = searchParams.get("error") ?? undefined;

  const labels = TYPE_LABELS[type] ?? TYPE_LABELS.signup;

  const [otpValue, setOtpValue] = useState("");
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    const formData = new FormData();
    formData.set("email", email);
    await requestOtpSignIn(formData);
  };

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

        <form action={verifyOtp} className="space-y-4">
          <input type="hidden" name="email" value={email} />
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

        {/* Resend option for magic link sign-in */}
        {type === "magiclink" && email && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={cooldown > 0}
              onClick={() => { handleResend(); setCooldown(60); }}
              className="text-sm text-muted-foreground"
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </Button>
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
