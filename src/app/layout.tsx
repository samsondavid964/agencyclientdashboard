import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { PageTitleProvider } from "@/components/layout/page-title-provider";
import { PageTransition } from "@/components/layout/page-transition";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ad Lab Dashboard",
    template: "%s · Ad Lab Dashboard",
  },
  description: "Internal Google Ads performance dashboard for Ad Lab",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check for Supabase auth cookie to determine if user is logged in.
  // This is a lightweight check — no Supabase client needed.
  const cookieStore = await cookies();
  const hasSession = cookieStore.getAll().some((c) =>
    c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${spaceGrotesk.variable} h-full font-sans antialiased`}
        style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
      >
        {/* WCAG skip-to-main-content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>

        <ThemeProvider>
          <TooltipProvider delayDuration={0}>
            {hasSession ? (
              <SidebarProvider>
                <PageTitleProvider>
                  <DashboardShell>{children}</DashboardShell>
                </PageTitleProvider>
              </SidebarProvider>
            ) : (
              <main className="min-h-full bg-background">
                {children}
              </main>
            )}
          </TooltipProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  // Dynamic imports so Sidebar/Header only load when authenticated
  const { Sidebar, getSidebarUserData } = await import("@/components/layout/sidebar");
  const { Header } = await import("@/components/layout/header");
  const { MobileSidebar } = await import("@/components/layout/mobile-sidebar");
  const { getAlertCountForDate } = await import("@/lib/queries/clients");
  const { format, subDays } = await import("date-fns");

  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const [userData, alertCount] = await Promise.all([
    getSidebarUserData(),
    getAlertCountForDate(yesterday),
  ]);

  return (
    <div className="flex h-full">
      <Sidebar />
      <MobileSidebar {...userData} />
      <div className="flex flex-1 flex-col transition-[padding-left] duration-200 ease-in-out lg:pl-[var(--sidebar-width)]">
        <Suspense fallback={<div className="h-[72px] border-b bg-background" />}>
          <Header
            userInitials={userData.userInitials}
            avatarUrl={userData.avatarUrl}
            isAdmin={userData.isAdmin}
            alertCount={alertCount}
          />
        </Suspense>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-8 dark:bg-background scroll-pt-20"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
