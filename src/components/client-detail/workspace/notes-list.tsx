"use client";

import { useActionState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Pin, PinOff, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { togglePinNote, deleteNote } from "@/lib/actions/client-workspace";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { WorkspaceNote } from "@/lib/queries/client-workspace";
import type { ActionState } from "@/lib/types/database";

interface NotesListProps {
  notes: WorkspaceNote[];
  clientId: string;
  canWrite: boolean;
  currentUserEmail: string;
  isAdmin: boolean;
}

// ─── Single note card ─────────────────────────────────────────────────────────

function NoteCard({
  note,
  clientId,
  canWrite,
  currentUserEmail,
  isAdmin,
}: {
  note: WorkspaceNote;
  clientId: string;
  canWrite: boolean;
  currentUserEmail: string;
  isAdmin: boolean;
}) {
  const [pinState, pinAction, pinPending] = useActionState<ActionState, FormData>(
    togglePinNote,
    {}
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteNote,
    {}
  );

  useEffect(() => {
    if (pinState.success) toast.success(pinState.message ?? "Note updated.");
    else if (pinState.message && !pinState.success && Object.keys(pinState).length > 0)
      toast.error(pinState.message);
  }, [pinState]);

  useEffect(() => {
    if (deleteState.success) toast.success(deleteState.message ?? "Note deleted.");
    else if (deleteState.message && !deleteState.success && Object.keys(deleteState).length > 0)
      toast.error(deleteState.message);
  }, [deleteState]);

  const canManage = canWrite && (isAdmin || currentUserEmail === note.author_email);
  const shortAuthor = note.author_email.split("@")[0];
  const absDate = format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a");

  return (
    <article
      className={cn(
        "rounded-lg border p-4 transition-colors",
        note.is_pinned
          ? "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20"
          : "bg-card hover:bg-muted/30"
      )}
      aria-label={note.is_pinned ? "Pinned note" : "Note"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {note.is_pinned && (
            <Pin
              className="h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
              aria-label="Pinned"
            />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {shortAuthor} &middot;{" "}
            <time dateTime={note.created_at} title={absDate}>
              {absDate}
            </time>
          </span>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Pin / Unpin */}
            <form action={pinAction}>
              <input type="hidden" name="note_id" value={note.id} />
              <input type="hidden" name="client_id" value={clientId} />
              <input
                type="hidden"
                name="is_pinned"
                value={String(!note.is_pinned)}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                disabled={pinPending || deletePending}
                aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
              >
                {pinPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : note.is_pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>

            {/* Delete */}
            <form action={deleteAction}>
              <input type="hidden" name="note_id" value={note.id} />
              <input type="hidden" name="client_id" value={clientId} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={pinPending || deletePending}
                aria-label="Delete note"
              >
                {deletePending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>

      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">
        {note.body}
      </p>
    </article>
  );
}

// ─── Notes list ───────────────────────────────────────────────────────────────

export function NotesList({
  notes,
  clientId,
  canWrite,
  currentUserEmail,
  isAdmin,
}: NotesListProps) {
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No notes yet"
        description="Add a note below to keep track of important information about this client."
        className="mt-2"
      />
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          clientId={clientId}
          canWrite={canWrite}
          currentUserEmail={currentUserEmail}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
