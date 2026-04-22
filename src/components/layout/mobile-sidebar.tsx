"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-provider";
import {
  SidebarBrand,
  SidebarNav,
  SidebarThemeToggle,
  SidebarUserPanel,
} from "./sidebar-content";

interface MobileSidebarProps {
  userName: string;
  userEmail: string;
  userInitials: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function MobileSidebar({
  userName,
  userEmail,
  userInitials,
  avatarUrl,
  isAdmin,
}: MobileSidebarProps) {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shadow-2xl lg:hidden"
          >
            {/* Header */}
            <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
              <SidebarBrand forceExpanded />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/40 hover:bg-white/[0.08] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:ring-inset"
                onClick={close}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <SidebarNav isAdmin={isAdmin} isMobile />

            <SidebarThemeToggle isMobile />

            <SidebarUserPanel
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              avatarUrl={avatarUrl}
              isAdmin={isAdmin}
              isMobile
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
