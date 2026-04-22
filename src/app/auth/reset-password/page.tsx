import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ResetPasswordClient from "./reset-password-client";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Choose a new password for your Ad Lab Dashboard account.",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has("recovery_verified")) {
    redirect("/auth/forgot-password");
  }

  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}
