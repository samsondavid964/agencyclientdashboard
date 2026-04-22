"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logActionTaken } from "@/lib/actions/alerts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardPen, Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/types/database";

interface LogActionFormProps {
  alertId: string;
  alertDate: string;
}

const initialState: ActionState = {};

export function LogActionForm({ alertId, alertDate }: LogActionFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    logActionTaken,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <ClipboardPen className="h-3.5 w-3.5" />
          Log Action
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Action Taken</DialogTitle>
          <DialogDescription>
            Record what action was taken for the alert on {alertDate}.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="alert_id" value={alertId} />
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="response_notes">Action Notes</Label>
              <Textarea
                id="response_notes"
                name="response_notes"
                placeholder="Describe the action taken to address this alert..."
                className="min-h-[120px]"
                required
              />
              {state.errors?.response_notes && (
                <p className="text-sm text-red-600">
                  {state.errors.response_notes[0]}
                </p>
              )}
            </div>
            {state.message && !state.success && (
              <p className="text-sm text-red-600">{state.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Action
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
