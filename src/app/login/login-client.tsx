"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { login, requestOtpSignIn } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? undefined;
  const message = searchParams.get("message") ?? undefined;

  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[hsl(150,80%,5%)] p-10 text-white">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Ad Lab"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-display text-xl font-bold tracking-tight">
              Ad Lab
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Monitor. Optimize.<br />
            Grow your clients.
          </h2>
          <p className="text-sm leading-relaxed text-white/50 max-w-sm">
            Real-time health scores, spend pacing, and campaign performance across your entire Google Ads portfolio.
          </p>
        </div>
        <p className="text-xs text-white/30">
          Internal dashboard for Ad Lab team members
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6 lg:p-10">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <Image
              src="/logo.png"
              alt="Ad Lab"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <h1 className="font-display text-xl font-bold">Ad Lab Dashboard</h1>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              {message}
            </div>
          )}

          {/* Shared email field */}
          <div className="space-y-2 stagger-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              spellCheck={false}
              placeholder="you@ad-lab.io"
              required
            />
          </div>

          <div className="space-y-4">
            {/* Password sign-in */}
            <form action={login} className="space-y-3 stagger-2">
              <input type="hidden" name="email" value={email} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <SubmitButton className="w-full" pendingText="Signing in...">
                Sign In
              </SubmitButton>
            </form>

            {/* Divider */}
            <div className="relative stagger-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* OTP sign-in */}
            <form action={requestOtpSignIn} className="stagger-4">
              <input type="hidden" name="email" value={email} />
              <SubmitButton
                variant="outline"
                className="w-full"
                pendingText="Sending code..."
              >
                Email me a sign-in code
              </SubmitButton>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground stagger-5">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
