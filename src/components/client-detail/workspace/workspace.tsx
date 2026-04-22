"use client";

import { Activity, FileText, CheckSquare, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeed } from "@/components/client-detail/workspace/activity-feed";
import { LogActivityForm } from "@/components/client-detail/workspace/log-activity-form";
import { NoteForm } from "@/components/client-detail/workspace/note-form";
import { NotesList } from "@/components/client-detail/workspace/notes-list";
import { TaskForm } from "@/components/client-detail/workspace/task-form";
import { TasksList } from "@/components/client-detail/workspace/tasks-list";
import type { WorkspaceNote, WorkspaceTask, WorkspaceActivity } from "@/lib/queries/client-workspace";

interface WorkspaceProps {
  clientId: string;
  notes: WorkspaceNote[];
  tasks: WorkspaceTask[];
  activities: WorkspaceActivity[];
  canWrite: boolean;
  currentUserEmail: string;
  isAdmin: boolean;
}

export function Workspace({
  clientId,
  notes,
  tasks,
  activities,
  canWrite,
  currentUserEmail,
  isAdmin,
}: WorkspaceProps) {
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="rounded-xl border bg-card shadow-sm" id="workspace">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
            <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Client Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Notes, tasks and activity log
            </p>
          </div>
        </div>

        {/* Read-only notice */}
        {!canWrite && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Read only
          </div>
        )}
      </div>

      <div className="px-6 pb-6">
        <Tabs defaultValue="activity">
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Tasks
              {openTaskCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {openTaskCount} open
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Activity tab ── */}
          <TabsContent value="activity">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <ActivityFeed activities={activities} />
              {canWrite && (
                <aside className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Log Activity
                  </h4>
                  <LogActivityForm clientId={clientId} canWrite={canWrite} />
                </aside>
              )}
            </div>
          </TabsContent>

          {/* ── Notes tab ── */}
          <TabsContent value="notes">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <NotesList
                notes={notes}
                clientId={clientId}
                canWrite={canWrite}
                currentUserEmail={currentUserEmail}
                isAdmin={isAdmin}
              />
              {canWrite && (
                <aside className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New Note
                  </h4>
                  <NoteForm clientId={clientId} canWrite={canWrite} />
                </aside>
              )}
            </div>
          </TabsContent>

          {/* ── Tasks tab ── */}
          <TabsContent value="tasks">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <TasksList
                tasks={tasks}
                clientId={clientId}
                canWrite={canWrite}
                currentUserEmail={currentUserEmail}
                isAdmin={isAdmin}
              />
              {canWrite && (
                <aside className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New Task
                  </h4>
                  <TaskForm clientId={clientId} canWrite={canWrite} />
                </aside>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
