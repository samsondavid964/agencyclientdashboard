"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTask } from "@/lib/actions/client-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/types/database";

interface TaskFormProps {
  clientId: string;
  canWrite: boolean;
}

const initialState: ActionState = {};

export function TaskForm({ clientId, canWrite }: TaskFormProps) {
  const [state, formAction, isPending] = useActionState(createTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Task created.");
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
        <Label htmlFor="task_title">Task Title</Label>
        <Input
          id="task_title"
          name="title"
          placeholder="e.g. Review campaign budget..."
          required
          aria-describedby={state.errors?.title ? "err_task_title" : undefined}
        />
        {state.errors?.title && (
          <p id="err_task_title" className="text-xs text-destructive">
            {state.errors.title[0]}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="task_description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="task_description"
          name="description"
          placeholder="Additional details..."
          className="min-h-[80px] resize-y"
          aria-describedby={state.errors?.description ? "err_task_description" : undefined}
        />
        {state.errors?.description && (
          <p id="err_task_description" className="text-xs text-destructive">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="task_due_date">
            Due Date{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="task_due_date"
            name="due_date"
            type="date"
            aria-describedby={state.errors?.due_date ? "err_task_due_date" : undefined}
          />
          {state.errors?.due_date && (
            <p id="err_task_due_date" className="text-xs text-destructive">
              {state.errors.due_date[0]}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="task_assigned_email">
            Assignee{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="task_assigned_email"
            name="assigned_email"
            type="email"
            placeholder="email@ad-lab.io"
            aria-describedby={state.errors?.assigned_email ? "err_task_assigned_email" : undefined}
          />
          {state.errors?.assigned_email && (
            <p id="err_task_assigned_email" className="text-xs text-destructive">
              {state.errors.assigned_email[0]}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Create Task
      </Button>
    </form>
  );
}
