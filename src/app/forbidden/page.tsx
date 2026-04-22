import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function ForbiddenPage() {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Admin access required
        </h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view this page. If you need access, ask an
          admin to upgrade your role.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
