import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import VerifyClient from "./verify-client";

export const metadata: Metadata = {
  title: "Verify code",
  description: "Enter the 8-digit code sent to your email.",
};

type Props = {
  searchParams: Promise<{
    type?: string;
  }>;
};

function resolveType(raw: string | undefined): "signup" | "magiclink" | "recovery" {
  if (raw === "signup") return "signup";
  if (raw === "recovery") return "recovery";
  return "magiclink";
}

export default async function VerifyOtpPage({ searchParams }: Props) {
  const { type: rawType } = await searchParams;
  const type = resolveType(rawType);

  // Email now lives in HttpOnly cookies (Phase 2, M10 mitigation) — pick the
  // cookie that matches the current flow so the verify UI can display who is
  // verifying and render the resend button for magiclink/recovery.
  const cookieStore = await cookies();
  const cookieName =
    type === "signup"
      ? "pending_signup_email"
      : type === "recovery"
        ? "pending_recovery_email"
        : "pending_2fa_email";
  const email = cookieStore.get(cookieName)?.value ?? "";

  return (
    <Suspense>
      <VerifyClient email={email} type={type} />
    </Suspense>
  );
}
