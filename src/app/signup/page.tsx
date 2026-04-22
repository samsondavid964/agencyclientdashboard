import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { checkInviteEmail, signup } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a new Ad Lab Dashboard account.",
};

type Props = {
  searchParams: Promise<{
    step?: string;
    email?: string;
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const { step, email, error } = await searchParams;

  const showConfirm = step === "confirm" && typeof email === "string" && email.length > 0;
  const showDenied = step === "denied";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_80%_0%,hsl(152_69%_15%/0.06),transparent_60%)]" />
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm animate-slide-up">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Ad Lab"
            width={56}
            height={56}
            className="rounded-xl"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {showDenied ? "Access Restricted" : "Create Account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {showConfirm
                ? "Invite confirmed. Finish setting up your account."
                : showDenied
                  ? "No invite found for this email."
                  : "Enter your Ad Lab email to get started."}
            </p>
          </div>
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

        {showDenied ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No invite found for this email. Contact your admin to request
              access.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Try a different email
              </Link>
              <Link
                href="/login"
                className="text-center text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : showConfirm ? (
          <form action={signup} className="space-y-4">
            <input type="hidden" name="email" value={email} />

            <div className="space-y-2">
              <Label htmlFor="email_display">Email</Label>
              <Input
                id="email_display"
                type="email"
                value={email}
                disabled
                readOnly
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Your full name"
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <SubmitButton className="w-full" pendingText="Creating account…">
              Create Account
            </SubmitButton>
          </form>
        ) : (
          <form action={checkInviteEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@ad-lab.io"
                required
                autoComplete="email"
                spellCheck={false}
              />
            </div>

            <SubmitButton className="w-full" pendingText="Checking invite…">
              Continue
            </SubmitButton>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
