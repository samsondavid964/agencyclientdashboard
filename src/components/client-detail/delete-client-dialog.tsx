"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteClient } from "@/lib/actions/clients";

interface DeleteClientDialogProps {
  clientId: string;
  clientName: string;
}

export function DeleteClientDialog({
  clientId,
  clientName,
}: DeleteClientDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmText === clientName;

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (result?.message && !result?.success) {
        toast.error(result.message);
        setOpen(false);
      }
      // On success, deleteClient redirects to /
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setConfirmText(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Client</AlertDialogTitle>
          <AlertDialogDescription>
            This action <span className="font-semibold">cannot be undone</span>. This
            will permanently delete the client and all associated data (daily metrics,
            health scores, campaign metrics, and alert log entries).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>All daily metrics records</li>
            <li>All daily health scores</li>
            <li>All campaign metrics records</li>
            <li>All alert log entries</li>
          </ul>
          <div className="space-y-2">
            <Label
              htmlFor="confirm-delete"
              className="text-sm font-medium text-foreground"
            >
              Type <span className="font-mono font-semibold">{clientName}</span> to
              confirm:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={clientName}
              autoComplete="off"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isPending ? "Deleting..." : "Delete Client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
