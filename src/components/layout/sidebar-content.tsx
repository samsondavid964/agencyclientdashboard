"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GitCompare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { useSidebar } from "./sidebar-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/compare", label: "Compare", icon: GitCompare },
] as const;

const ADMIN_NAV_ITEMS = [
  { href: "/settings/team", label: "Settings", icon: Settings },
] as const;

interface SidebarContentProps {
  userName: string;
  userEmail: string;
  userInitials: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

/** Animated aside shell — handles collapse width transition on desktop */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const { isCollapsed, onMouseEnter, onMouseLeave } = useSidebar();

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-white/[0.06] transition-[width] duration-200 ease-in-out lg:flex",
        isCollapsed ? "w-16" : "w-[260px]"
      )}
      aria-label="Sidebar"
    >
      {children}
    </aside>
  );
}

export function SidebarBrand({ forceExpanded = false }: { forceExpanded?: boolean }) {
  const { isCollapsed } = useSidebar();
  const showText = forceExpanded || !isCollapsed;

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
        <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="rounded-lg"
        />
      </div>
      <AnimatePresence initial={false}>
        {showText && (
          <motion.div
            key="brand-text"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <span className="block text-[15px] font-bold tracking-tight text-white whitespace-nowrap">
              Ad Lab
            </span>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/30 whitespace-nowrap">
              Dashboard
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarNav({
  isAdmin,
  isMobile = false,
}: {
  isAdmin: boolean;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const { isCollapsed: _isCollapsed, togglePin: toggleCollapse } = useSidebar();
  // In mobile drawer the sidebar is always expanded
  const isCollapsed = isMobile ? false : _isCollapsed;

  return (
    <nav
      className="flex flex-1 flex-col px-2 pt-6"
      aria-label="Primary"
    >
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.p
            key="menu-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/50"
          >
            Menu
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/60 transition-[background-color,color] duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset",
                isCollapsed && "justify-center px-0",
                isActive && "nav-active text-white bg-white/[0.05]"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 text-white/40 transition-colors group-hover:text-emerald-400",
                  isActive && "text-emerald-400"
                )}
                aria-hidden="true"
              />
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    key={`label-${item.href}`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="truncate overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.p
                key="admin-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/50"
              >
                Administration
              </motion.p>
            )}
          </AnimatePresence>
          {isCollapsed && <div className="mt-8" />}

          <div className="flex flex-col gap-0.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/60 transition-[background-color,color] duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset",
                    isCollapsed && "justify-center px-0",
                    isActive && "nav-active text-white bg-white/[0.05]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 text-white/40 transition-colors group-hover:text-emerald-400",
                      isActive && "text-emerald-400"
                    )}
                    aria-hidden="true"
                  />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        key={`label-${item.href}`}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="truncate overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Spacer + collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="mt-auto pb-2 pt-4">
          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset",
              isCollapsed && "justify-center px-0"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </nav>
  );
}

export function SidebarThemeToggle({ isMobile = false }: { isMobile?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { isCollapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showExpanded = isMobile || !isCollapsed;

  const Icon = !mounted
    ? Sun
    : theme === "dark"
      ? Moon
      : theme === "light"
        ? Sun
        : Monitor;

  const nextTheme = !mounted
    ? "dark"
    : theme === "dark"
      ? "light"
      : theme === "light"
        ? "system"
        : "dark";

  const label = !mounted
    ? "Toggle theme"
    : `Theme: ${theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System"}. Switch theme.`;

  return (
    <div className={cn("px-3 py-2", !showExpanded && "flex justify-center")}>
      <button
        onClick={() => setTheme(nextTheme)}
        aria-label={label}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset w-full",
          !showExpanded && "justify-center w-auto px-2"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {showExpanded && (
          <span>
            {!mounted ? "Theme" : theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System"}
          </span>
        )}
      </button>
    </div>
  );
}

export function SidebarUserPanel({
  userName,
  userEmail,
  userInitials,
  avatarUrl,
  isMobile = false,
}: SidebarContentProps & { isMobile?: boolean }) {
  const { isCollapsed: _isCollapsed } = useSidebar();
  // In mobile drawer the sidebar is always expanded
  const isCollapsed = isMobile ? false : _isCollapsed;

  return (
    <div className="mt-auto">
      <div className="mx-5 h-px bg-white/[0.08]" />

      <div className={cn("p-4", isCollapsed && "px-2")}>
        <Link
          href="/settings/team"
          className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset",
            isCollapsed && "justify-center px-0"
          )}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={34}
              height={34}
              className="h-[34px] w-[34px] shrink-0 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
          ) : (
            <div
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-400 ring-2 ring-emerald-500/20"
              aria-hidden="true"
            >
              {userInitials}
            </div>
          )}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="truncate text-[13px] font-semibold text-white/90 whitespace-nowrap">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-white/35 whitespace-nowrap">
                  {userEmail}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="user-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="mt-1"
            >
              <div className="mx-1 mb-1 h-px bg-white/[0.06]" />
              <form action={logout} className="px-1">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-start gap-2 text-[12px] font-medium text-red-400/60 hover:bg-white/[0.05] hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Log out
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
