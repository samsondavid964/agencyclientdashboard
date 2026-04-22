"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Team Members", href: "/settings/team" },
  { label: "Workload", href: "/settings/team/workload" },
  { label: "Activity", href: "/settings/team/activity" },
];

export function TeamNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Team settings navigation"
      className="flex gap-1 rounded-lg bg-muted p-1 w-fit"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
