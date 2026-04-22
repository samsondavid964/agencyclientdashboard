import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge — rounded pill for status, labels, and counts.
 *
 * Variant groups:
 *  Core       — default · secondary · destructive · outline
 *  Health     — healthy · warning · critical
 *  Lifecycle  — active · onboarding · paused · churned · top-performer
 *  Solid      — solid-success · solid-warning · solid-danger · solid-dark · solid-outline
 */
const badgeVariants = cva(
  [
    "inline-flex items-center justify-center rounded-full border",
    "px-2.5 py-0.5 text-xs font-semibold",
    "w-fit whitespace-nowrap shrink-0",
    "gap-1.5 [&>svg]:size-3 [&>svg]:pointer-events-none",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        /* ── Core ─────────────────────────────────────────────── */
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 dark:bg-destructive/70",
        outline:
          "border-border bg-background text-foreground [a&]:hover:bg-muted",

        /* ── Client Health · Semantic (soft tint) ─────────────── */
        healthy:
          "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
        critical:
          "border-transparent bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",

        /* ── Client Lifecycle ─────────────────────────────────── */
        active:
          "border-transparent bg-[hsl(var(--purple-100))] text-[hsl(var(--purple-700))]",
        onboarding:
          "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400",
        paused:
          "border-border bg-background text-foreground dark:text-muted-foreground",
        churned:
          "border-border bg-background text-muted-foreground",
        "top-performer":
          "border-transparent bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",

        /* ── Solid · High-Emphasis ─────────────────────────────── */
        "solid-success":
          "border-transparent bg-emerald-700 text-white dark:bg-emerald-600",
        "solid-warning":
          "border-transparent bg-amber-500 text-white",
        "solid-danger":
          "border-transparent bg-red-500 text-white",
        "solid-dark":
          "border-transparent bg-foreground text-background",
        "solid-outline":
          "border-border bg-background text-foreground",

        /* ── Legacy aliases (keep backwards compat) ──────────── */
        success:
          "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
        danger:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
        info:
          "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
        accent:
          "border-transparent bg-[hsl(var(--purple-100))] text-[hsl(var(--purple-700))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
