"use client";

import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimateIn({ children, className, delay = 0 }: AnimateInProps) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out-expo",
        inView
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3",
        className
      )}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
