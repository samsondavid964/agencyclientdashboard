import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordClient from "./reset-password-client";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Choose a new password for your Ad Lab Dashboard account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}
