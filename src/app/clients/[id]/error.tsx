"use client";

import { useEffect } from "react";
import { AlertOctagon, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Client detail error:", error);
  }, [error]);

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertOctagon className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Failed to load client data
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        We couldn&apos;t fetch this client&apos;s information. This might be a temporary
        issue — try again or go back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-xs font-mono text-muted-foreground/60 mb-4">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Link>
        </Button>
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
