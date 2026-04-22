import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { StepIndicator } from "@/components/auth/step-indicator";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset code for your Ad Lab Dashboard account.",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

const ALLOWED_ERRORS = new Set([
  "Email is required.",
  "Could not send reset code. Please try again.",
  "Too many attempts. Please try again later.",
  "Something went wrong. Please try again.",
]);

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error: rawError } = await searchParams;
  // Drop unknown URL errors rather than showing a generic fallback banner.
  const error = rawError && ALLOWED_ERRORS.has(rawError) ? rawError : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_80%_0%,hsl(152_69%_15%/0.06),transparent_60%)]" />
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm animate-slide-up">
        <StepIndicator current={0} total={3} />

        <div className="text-center">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you an 8-digit code to reset your password.
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


        <form action={requestPasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@ad-lab.io"
              required
              autoFocus
              autoComplete="email"
              spellCheck={false}
            />
          </div>

          <SubmitButton className="w-full" pendingText="Sending code…">
            Send Reset Code
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
