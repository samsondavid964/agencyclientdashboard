import { cn } from "@/lib/utils"

/**
 * Skeleton variants. Each variant applies a sensible default shape so callers
 * don't have to re-specify `h-X w-Y rounded-*` for common placeholders.
 * Any className passed in overrides the variant defaults.
 */
export type SkeletonVariant =
  | "line"
  | "heading"
  | "avatar"
  | "chip"
  | "bar"
  | "card"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
}

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  line: "h-4 w-full rounded",
  heading: "h-6 w-1/2 rounded",
  avatar: "h-10 w-10 rounded-full",
  chip: "h-6 w-16 rounded-full",
  bar: "h-9 w-full rounded-lg",
  card: "h-32 w-full rounded-xl",
}

function Skeleton({
  variant = "line",
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        // Quiet pulse: soft muted fill + slower opacity breathe.
        // Static when the user prefers reduced motion.
        "bg-muted/60 animate-skeleton-pulse motion-reduce:animate-none",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
