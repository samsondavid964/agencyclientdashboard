import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyClient from "./verify-client";

export const metadata: Metadata = {
  title: "Verify code",
  description: "Enter the 8-digit code sent to your email.",
};

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyClient />
    </Suspense>
  );
}
