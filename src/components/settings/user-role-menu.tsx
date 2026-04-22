"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Shield, User as UserIcon } from "lucide-react";
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
import { setUserRole } from "@/lib/actions/auth";

type Role = "admin" | "member";

interface UserRoleMenuProps {
  userId: string;
  userEmail: string;
  currentRole: Role;
  isSelf: boolean;
}

export function UserRoleMenu({
  userId,
  userEmail,
  currentRole,
  isSelf,
}: UserRoleMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (nextRole: Role) => {
    if (nextRole === currentRole) return;
    setPendingRole(nextRole);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingRole) return;
    startTransition(async () => {
      const result = await setUserRole(userId, pendingRole);
      if (result?.success) {
        toast.success(result.message ?? "Role updated.");
      } else {
        toast.error(result?.message ?? "Failed to update role.");
      }
      setConfirmOpen(false);
      setPendingRole(null);
    });
  };

  const isDemotion = pendingRole === "member";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-8 px-2"
            disabled={isSelf}
            aria-label={isSelf ? "You cannot change your own role" : "Change role"}
          >
            Change
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleSelect("admin")}
            disabled={currentRole === "admin"}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Promote to admin
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSelect("member")}
            disabled={currentRole === "member"}
            className={currentRole === "admin" ? "text-red-600" : ""}
          >
            <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Demote to member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDemotion ? "Demote to member?" : "Promote to admin?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isDemotion
                ? `${userEmail} will lose admin privileges, including access to client management and team settings.`
                : `${userEmail} will gain full admin access, including client management and the ability to invite and promote other users.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className={isDemotion ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isPending ? "Updating…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
