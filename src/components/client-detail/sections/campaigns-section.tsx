import { format } from "date-fns";
import { Layers } from "lucide-react";
import { getCampaignMetrics, getCampaignTrend } from "@/lib/queries/cached";
import { CampaignBreakdown } from "@/components/client-detail/campaign-breakdown";
import { CampaignTrend } from "@/components/client-detail/campaign-trend";
import { AnimateIn } from "@/components/ui/animate-in";

interface CampaignsSectionProps {
  clientId: string;
  date: string;
}

export async function CampaignsSection({ clientId, date }: CampaignsSectionProps) {
  const [campaigns, campaignTrend] = await Promise.all([
    getCampaignMetrics(clientId, date),
    getCampaignTrend(clientId, date, 30),
  ]);

  return (
    <>
      <AnimateIn>
        <section aria-labelledby="campaign-deep-dive-heading">
          <header className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="campaign-deep-dive-heading"
                className="text-lg font-semibold text-foreground"
              >
                Campaign Deep Dive
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(date + "T00:00:00"), "MMMM d, yyyy")}
              </p>
            </div>
          </header>
          <CampaignBreakdown campaigns={campaigns} />
        </section>
      </AnimateIn>

      <AnimateIn delay={75}>
        <CampaignTrend data={campaignTrend} />
      </AnimateIn>
    </>
  );
}
