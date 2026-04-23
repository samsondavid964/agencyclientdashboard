"use client";

import { useActionState, useEffect, useTransition } from "react";
import { format, parseISO, isToday, isBefore, startOfToday } from "date-fns";
import { Trash2, CheckSquare, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus, deleteTask } from "@/lib/actions/client-workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { WorkspaceTask } from "@/lib/queries/client-workspace";
import type { ActionState } from "@/lib/types/database";

interface TasksListProps {
  tasks: WorkspaceTask[];
  clientId: string;
  canWrite: boolean;
  currentUserId: string;
  isAdmin: boolean;
}

// ─── Due date badge ───────────────────────────────────────────────────────────

function DueDateBadge({
  dueDate,
  status,
}: {
  dueDate: string;
  status: WorkspaceTask["status"];
}) {
  if (status === "done") return null;

  const date = parseISO(dueDate);
  const today = startOfToday();

  if (isToday(date)) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 text-[10px] font-medium">
        Due today
      </Badge>
    );
  }

  if (isBefore(date, today)) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 text-[10px] font-medium">
        Overdue
      </Badge>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      Due {format(date, "MMM d")}
    </span>
  );
}

// ─── Status cycle button ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<WorkspaceTask["status"], string> = {
  open: "Open",
  done: "Done",
};

const STATUS_NEXT: Record<WorkspaceTask["status"], WorkspaceTask["status"]> = {
  open: "done",
  done: "open",
};

const STATUS_CLASSES: Record<WorkspaceTask["status"], string> = {
  open: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
  done: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
};

function StatusCycleButton({
  task,
  clientId,
  disabled,
}: {
  task: WorkspaceTask;
  clientId: string;
  disabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateTaskStatus,
    {}
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) toast.success(state.message ?? "Task updated.");
    else if (state.message && !state.success && Object.keys(state).length > 0)
      toast.error(state.message);
  }, [state]);

  const nextStatus = STATUS_NEXT[task.status];

  return (
    <form action={formAction}>
      <input type="hidden" name="task_id" value={task.id} />
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        disabled={isPending || disabled}
        aria-label={`Status: ${STATUS_LABELS[task.status]}. Click to advance.`}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed",
          STATUS_CLASSES[task.status]
        )}
        onClick={(e) => {
          e.preventDefault();
          const form = e.currentTarget.form;
          if (form) startTransition(() => formAction(new FormData(form)));
        }}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          STATUS_LABELS[task.status]
        )}
      </button>
    </form>
  );
}

// ─── Single task card ─────────────────────────────────────────────────────────

function TaskCard({
  task,
  clientId,
  canWrite,
  currentUserId,
  isAdmin,
}: {
  task: WorkspaceTask;
  clientId: string;
  canWrite: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteTask,
    {}
  );

  useEffect(() => {
    if (deleteState.success) toast.success(deleteState.message ?? "Task deleted.");
    else if (
      deleteState.message &&
      !deleteState.success &&
      Object.keys(deleteState).length > 0
    )
      toast.error(deleteState.message);
  }, [deleteState]);

  const canDelete =
    canWrite && (isAdmin || currentUserId === task.created_by_user_id);
  const isDone = task.status === "done";

  const assigneeDisplay = task.assigned_email
    ? task.assigned_email.length > 28
      ? task.assigned_email.slice(0, 26) + "\u2026"
      : task.assigned_email
    : "Unassigned";

  return (
    <article
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isDone ? "opacity-60 bg-muted/30" : "bg-card hover:bg-muted/20"
      )}
      aria-label={`Task: ${task.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {/* Status badge — clickable to cycle */}
            {canWrite ? (
              <StatusCycleButton task={task} clientId={clientId} disabled={deletePending} />
            ) : (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                  STATUS_CLASSES[task.status]
                )}
              >
                {STATUS_LABELS[task.status]}
              </span>
            )}

            {/* Due date badge */}
            {task.due_date && (
              <DueDateBadge dueDate={task.due_date} status={task.status} />
            )}

            {/* Assignee */}
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              title={task.assigned_email ?? undefined}
            >
              <User className="h-3 w-3" aria-hidden="true" />
              {assigneeDisplay}
            </span>
          </div>
        </div>

        {/* Delete */}
        {canDelete && (
          <form action={deleteAction}>
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={deletePending}
              aria-label="Delete task"
            >
              {deletePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>
        )}
      </div>
    </article>
  );
}

// ─── Tasks list ───────────────────────────────────────────────────────────────

export function TasksList({
  tasks,
  clientId,
  canWrite,
  currentUserId,
  isAdmin,
}: TasksListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks yet"
        description="Create a task below to track action items for this client."
        className="mt-2"
      />
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          clientId={clientId}
          canWrite={canWrite}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
