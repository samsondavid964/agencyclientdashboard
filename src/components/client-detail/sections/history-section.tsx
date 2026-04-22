import { getAlertsByClient } from "@/lib/queries/alerts";
import { AlertHistory } from "@/components/client-detail/alert-history";
import { AnimateIn } from "@/components/ui/animate-in";

interface HistorySectionProps {
  clientId: string;
  isAdmin: boolean;
  userEmail: string;
  clientMbAssigned: string | null;
}

export async function HistorySection({
  clientId,
  isAdmin,
  userEmail,
  clientMbAssigned,
}: HistorySectionProps) {
  const alerts = await getAlertsByClient(clientId, 30);

  return (
    <AnimateIn>
      <AlertHistory
        alerts={alerts}
        isAdmin={isAdmin}
        userEmail={userEmail}
        clientMbAssigned={clientMbAssigned}
      />
    </AnimateIn>
  );
}
