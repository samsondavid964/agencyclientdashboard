"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pendingText?: ReactNode;
}

/**
 * Submit button that binds to the nearest `<form action={...}>` via
 * `useFormStatus()` and shows a spinner while the Server Action is pending.
 *
 * Must live inside a `<form>` with an `action` prop — otherwise `useFormStatus`
 * will always report `pending: false`.
 */
export function SubmitButton({
  children,
  pendingText = "Please wait…",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
      className={["transition-all duration-150", props.className].filter(Boolean).join(" ")}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
