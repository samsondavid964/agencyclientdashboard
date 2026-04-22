"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ClipboardPen, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import type { ActionState } from "@/lib/types/database";

interface RespondDialogProps {
  alertId: string;
  alertDate: string;
  /** Client name shown in dialog description */
  clientName?: string;
}

const initialState: ActionState = {};

export function RespondDialog({ alertId, alertDate, clientName }: RespondDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(logActionTaken, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Action logged.");
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <ClipboardPen className="h-3.5 w-3.5" aria-hidden="true" />
          Respond
        </Button>
      </DialogTrigger>

      {/* Radix Dialog handles focus trap and Escape key natively */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Action Taken</DialogTitle>
          <DialogDescription>
            Record what action was taken for the{" "}
            {clientName ? <strong>{clientName}</strong> : "client"} alert on{" "}
            <strong>{alertDate}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} noValidate>
          <input type="hidden" name="alert_id" value={alertId} />

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`response_notes_${alertId}`}>Action Notes</Label>
              <Textarea
                id={`response_notes_${alertId}`}
                name="response_notes"
                placeholder="Describe the action taken to address this alert..."
                className="min-h-[120px]"
                required
                aria-describedby={
                  state.errors?.response_notes ? `err_notes_${alertId}` : undefined
                }
              />
              {state.errors?.response_notes && (
                <p
                  id={`err_notes_${alertId}`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {state.errors.response_notes[0]}
                </p>
              )}
            </div>

            {/* Server-level errors (not success) surfaced in the dialog */}
            {state.message && !state.success && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Save Action
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
