import {
  getWorkspaceNotes,
  getWorkspaceTasks,
  getWorkspaceActivity,
} from "@/lib/queries/client-workspace";
import { Workspace } from "@/components/client-detail/workspace/workspace";
import { AnimateIn } from "@/components/ui/animate-in";

interface WorkspaceSectionProps {
  clientId: string;
  canWrite: boolean;
  currentUserId: string;
  currentUserEmail: string;
  isAdmin: boolean;
}

export async function WorkspaceSection({
  clientId,
  canWrite,
  currentUserId,
  currentUserEmail,
  isAdmin,
}: WorkspaceSectionProps) {
  const [notes, tasks, activities] = await Promise.all([
    getWorkspaceNotes(clientId),
    getWorkspaceTasks(clientId),
    getWorkspaceActivity(clientId),
  ]);

  return (
    <AnimateIn>
      <Workspace
        clientId={clientId}
        notes={notes}
        tasks={tasks}
        activities={activities}
        canWrite={canWrite}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        isAdmin={isAdmin}
      />
    </AnimateIn>
  );
}
