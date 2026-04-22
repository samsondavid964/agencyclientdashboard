"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface SidebarContextValue {
  /** Mobile drawer open state */
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** Whether the sidebar is visually collapsed (narrow rail) */
  isCollapsed: boolean;
  /** Whether the user has pinned the sidebar open */
  isPinned: boolean;
  togglePin: () => void;
  /** Hover handlers for the desktop rail */
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
  isCollapsed: true,
  isPinned: false,
  togglePin: () => {},
  onMouseEnter: () => {},
  onMouseLeave: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-pinned") === "true";
  });

  // Collapsed = not pinned AND not hovered
  const isCollapsed = !isPinned && !isHovered;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      localStorage.setItem("sidebar-pinned", String(!prev));
      return !prev;
    });
  }, []);

  const onMouseEnter = useCallback(() => setIsHovered(true), []);
  const onMouseLeave = useCallback(() => setIsHovered(false), []);

  // Sync CSS variable for sidebar width (used by the main content offset)
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "3.05rem" : "15rem"
    );
  }, [isCollapsed]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle,
        close,
        isCollapsed,
        isPinned,
        togglePin,
        onMouseEnter,
        onMouseLeave,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
