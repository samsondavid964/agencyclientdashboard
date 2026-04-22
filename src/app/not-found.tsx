import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        <span
          className="absolute -top-16 left-1/2 -translate-x-1/2 text-[160px] font-black text-primary/[0.04] select-none pointer-events-none"
          aria-hidden="true"
        >
          404
        </span>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <p className="text-sm text-muted-foreground">
          If you followed a link, it may have been moved or deleted.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/">Back to dashboard</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/">Browse all clients</Link>
        </Button>
      </div>
    </div>
  );
}
