"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { logActivity } from "@/lib/actions/client-workspace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/lib/types/database";

const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "slack", label: "Slack" },
  { value: "status_change", label: "Status Change" },
  { value: "note", label: "Note" },
  { value: "task", label: "Task" },
  { value: "alert_response", label: "Alert Response" },
  { value: "other", label: "Other" },
] as const;

interface LogActivityFormProps {
  clientId: string;
  canWrite: boolean;
}

const initialState: ActionState = {};

export function LogActivityForm({ clientId, canWrite }: LogActivityFormProps) {
  const [state, formAction, isPending] = useActionState(logActivity, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Activity logged.");
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
        <Label htmlFor="activity_type">Type</Label>
        <Select name="activity_type" defaultValue="call" required>
          <SelectTrigger id="activity_type" className="h-9">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.activity_type && (
          <p className="text-xs text-destructive">{state.errors.activity_type[0]}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="activity_summary">Summary</Label>
        <Textarea
          id="activity_summary"
          name="summary"
          placeholder="What happened? (brief summary)"
          className="min-h-[80px] resize-y"
          required
          aria-describedby={state.errors?.summary ? "err_activity_summary" : undefined}
        />
        {state.errors?.summary && (
          <p id="err_activity_summary" className="text-xs text-destructive">
            {state.errors.summary[0]}
          </p>
        )}
      </div>

      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Log Activity
      </Button>
    </form>
  );
}
