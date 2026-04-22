"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createNote } from "@/lib/actions/client-workspace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/types/database";

interface NoteFormProps {
  clientId: string;
  canWrite: boolean;
}

const initialState: ActionState = {};

export function NoteForm({ clientId, canWrite }: NoteFormProps) {
  const [state, formAction, isPending] = useActionState(createNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Note saved.");
      formRef.current?.reset();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  if (!canWrite) return null;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="client_id" value={clientId} />

      <div className="grid gap-2">
        <Label htmlFor="note_body">New Note</Label>
        <Textarea
          id="note_body"
          name="body"
          placeholder="Add a note about this client..."
          className="min-h-[100px] resize-y"
          required
          aria-describedby={state.errors?.body ? "err_note_body" : undefined}
        />
        {state.errors?.body && (
          <p id="err_note_body" className="text-xs text-destructive">
            {state.errors.body[0]}
          </p>
        )}
      </div>

      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Save Note
      </Button>
    </form>
  );
}
