"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for Vercel / server logs. Swap for a real logger when we add one.
    console.error("[dashboard] route error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-10 w-10" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We hit an unexpected error loading this page. Try again, or head back to the
          dashboard.
        </p>
        {error.digest ? (
          <p className="pt-2 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset} variant="default" size="sm">
          <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Go home</Link>
        </Button>
        {error.digest && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(error.digest || "");
              toast.success("Error ID copied");
            }}
          >
            <ClipboardCopy className="h-4 w-4 mr-1.5" />
            Copy Error ID
          </Button>
        )}
      </div>
    </div>
  );
}
