"use client";

import { useState, useTransition, useOptimistic } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateClientStatus } from "@/lib/actions/clients";
import { CLIENT_STATUSES } from "@/lib/validations/client";

interface StatusChangeDropdownProps {
  clientId: string;
  currentStatus: string;
}

export function StatusChangeDropdown({
  clientId,
  currentStatus,
}: StatusChangeDropdownProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus);

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setPendingStatus(newStatus);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingStatus) return;

    startTransition(async () => {
      setOptimisticStatus(pendingStatus);
      const result = await updateClientStatus(clientId, pendingStatus);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "Failed to update status.");
      }
      setConfirmOpen(false);
      setPendingStatus(null);
    });
  };

  const isChurned = pendingStatus === "churned";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Status
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CLIENT_STATUSES.map((status) => (
            <DropdownMenuItem
              key={status.value}
              onClick={() => handleStatusSelect(status.value)}
              disabled={status.value === optimisticStatus}
              className={
                status.value === optimisticStatus
                  ? "font-medium text-foreground"
                  : status.value === "churned"
                    ? "text-red-600"
                    : ""
              }
            >
              {status.label}
              {status.value === optimisticStatus && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (current)
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Client Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status from{" "}
              <span className="font-medium capitalize">{currentStatus}</span> to{" "}
              <span className="font-medium capitalize">{pendingStatus}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isChurned && (
            <div
              role="note"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <p className="text-sm text-red-700 dark:text-red-300">
                Churned clients will be excluded from daily metrics pulls and health
                score calculations.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className={isChurned ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
