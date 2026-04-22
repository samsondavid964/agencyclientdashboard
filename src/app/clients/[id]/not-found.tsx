import Link from "next/link";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Users className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Client not found
        </h1>
        <p className="text-sm text-muted-foreground">
          This client either doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <p className="text-sm text-muted-foreground">
          The client may have been removed or the link may be incorrect.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/">Back to dashboard</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/">Back to all clients</Link>
        </Button>
      </div>
    </div>
  );
}
