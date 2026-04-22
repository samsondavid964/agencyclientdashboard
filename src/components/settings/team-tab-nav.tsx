"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Team Members", href: "/settings/team" },
  { label: "Workload", href: "/settings/team/workload" },
  { label: "Activity", href: "/settings/team/activity" },
] as const;

export function TeamTabNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Team settings tabs"
      className="flex gap-1 rounded-lg bg-muted p-1"
    >
      {TABS.map((tab) => {
        // Exact match for the root tab, prefix match for sub-tabs
        const isActive =
          tab.href === "/settings/team"
            ? pathname === "/settings/team"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground"
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
