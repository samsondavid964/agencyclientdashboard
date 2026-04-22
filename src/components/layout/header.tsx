"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Bell, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { usePageTitle } from "@/components/layout/page-title-provider";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userInitials?: string;
  avatarUrl?: string | null;
  alertCount?: number;
  isAdmin?: boolean;
  onAddClient?: () => void;
}

export function Header({
  userInitials,
  avatarUrl,
  alertCount = 0,
  isAdmin = false,
  onAddClient,
}: HeaderProps) {
  const { toggle, isOpen } = useSidebar();
  const { title } = usePageTitle();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const handler = () => setScrolled(main.scrollTop > 0);
    main.addEventListener("scroll", handler, { passive: true });
    return () => main.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b bg-background/95 backdrop-blur-md px-4 lg:px-6 transition-[border-color,box-shadow] duration-200",
        scrolled ? "border-border shadow-sm" : "border-transparent"
      )}
    >
      <div className="flex h-[72px] items-center justify-between gap-4">
        {/* Left section: hamburger + breadcrumb + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden shrink-0"
            onClick={toggle}
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>

          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-foreground truncate">
              {title}
            </h1>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Alert bell */}
          <Link
            href="/alerts"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={alertCount > 0 ? `Alerts (${alertCount} unread)` : "Alerts"}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                {alertCount}
              </span>
            )}
          </Link>

          {/* Add Client button (admin only) */}
          {isAdmin && (
            <Link href="/clients/new">
              <Button
                className="h-9 rounded-lg bg-primary px-3.5 text-white hover:bg-primary/90"
                onClick={onAddClient}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add Client
              </Button>
            </Link>
          )}

          {/* User avatar */}
          <Link
            href="/profile"
            aria-label="Your profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-700 text-xs font-display font-bold text-white overflow-hidden shrink-0 transition-opacity hover:opacity-90"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              userInitials || <User className="h-4 w-4" aria-hidden="true" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
