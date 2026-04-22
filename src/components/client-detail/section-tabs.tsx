"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Table,
  Bell,
  NotebookPen,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_VALUES = ["overview", "campaigns", "metrics", "history", "workspace"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return v !== null && (TAB_VALUES as readonly string[]).includes(v);
}

interface SectionTabsProps {
  overview: React.ReactNode;
  campaigns: React.ReactNode;
  metrics: React.ReactNode;
  history: React.ReactNode;
  workspace: React.ReactNode;
}

export function SectionTabs({
  overview,
  campaigns,
  metrics,
  history,
  workspace,
}: SectionTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: TabValue = isTabValue(rawTab) ? rawTab : "overview";

  const handleChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <Tabs value={activeTab} onValueChange={handleChange} className="w-full">
      <div className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 lg:-mx-8 lg:px-8">
        <TabsList className="h-11 w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0 text-muted-foreground">
          <TabsTrigger
            value="overview"
            className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Table className="h-4 w-4" aria-hidden="true" />
            Metrics
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="workspace"
            className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            Workspace
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:ring-0">
        {overview}
      </TabsContent>
      <TabsContent value="campaigns" className="mt-0 space-y-6 focus-visible:ring-0">
        {campaigns}
      </TabsContent>
      <TabsContent value="metrics" className="mt-0 space-y-6 focus-visible:ring-0">
        {metrics}
      </TabsContent>
      <TabsContent value="history" className="mt-0 space-y-6 focus-visible:ring-0">
        {history}
      </TabsContent>
      <TabsContent value="workspace" className="mt-0 space-y-6 focus-visible:ring-0">
        {workspace}
      </TabsContent>
    </Tabs>
  );
}
