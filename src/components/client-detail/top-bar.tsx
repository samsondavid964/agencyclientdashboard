"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  FileText,
  ShoppingBag,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientLogoUpload } from "@/components/client-detail/client-logo-upload";
import { DateRangePicker } from "@/components/client-detail/date-range-picker";
import { toPillStatus } from "@/components/ui/status-pill";
import type { Client } from "@/lib/types/database";

interface TopBarProps {
  client: Client;
  isAdmin: boolean;
  selectedDate: string;
  rangeDays: number | null;
  customStart: string | null;
  hasReport: boolean;
  children?: React.ReactNode; // Slot for admin action buttons
}

function formatGoogleAdsId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits || id;
}

// Protocol allowlist prevents javascript:, data:, vbscript:, file:, etc. from
// being injected via the stored store_url field.
function safeStoreUrl(raw: string | null): string | null {
  if (!raw) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function TopBar({
  client,
  isAdmin,
  selectedDate,
  rangeDays,
  customStart,
  hasReport,
  children,
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dashboardHref, setDashboardHref] = useState<string>("/");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = document.referrer;
    if (!ref) return;
    try {
      const refUrl = new URL(ref);
      if (refUrl.origin === window.location.origin) {
        setDashboardHref(refUrl.pathname + refUrl.search);
      }
    } catch {
      // ignore malformed referrer
    }
  }, []);

  const handleReturnToLatest = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    params.delete("start");
    params.delete("range");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleCopyAdsId = async () => {
    try {
      await navigator.clipboard.writeText(client.google_ads_id);
      toast.success("Copied!");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const isHistorical = selectedDate !== yesterdayStr || customStart !== null;
  const formattedSelectedDate = format(selectedDateObj, "MMM d, yyyy");

  const resolvedStoreUrl = safeStoreUrl(client.store_url);
  const adsDigits = client.google_ads_id.replace(/\D/g, "");

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/95 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div role="status" aria-live="polite" className="sr-only">
        Viewing date: {format(selectedDateObj, "MMMM d, yyyy")}
      </div>
      <div className="space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href={dashboardHref} className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground" aria-current="page">
            {client.store_name || client.client_name}
          </span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <ClientLogoUpload
              clientId={client.id}
              currentLogoUrl={client.logo_url}
              clientName={client.client_name}
              isAdmin={isAdmin}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {client.store_name || client.client_name}
                </h1>
                <Badge
                  variant={toPillStatus(client.client_status) as BadgeVariant}
                  className="capitalize"
                >
                  {client.client_status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {client.store_name ? (
                  <span>{client.client_name}</span>
                ) : client.company_name ? (
                  <span>{client.company_name}</span>
                ) : null}
                {(client.store_name || client.company_name) && (
                  <span className="text-muted-foreground/40">|</span>
                )}
                <span className="font-mono text-xs inline-flex items-center gap-0.5">
                  Google Ads: {formatGoogleAdsId(client.google_ads_id)}
                  <button
                    type="button"
                    onClick={handleCopyAdsId}
                    className="ml-1 rounded-sm text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Copy Google Ads ID"
                  >
                    <ClipboardCopy className="h-3 w-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://ads.google.com/aw/campaigns?__c=${adsDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Google Ads"
            >
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <ExternalLink className="h-3.5 w-3.5" />
                Google Ads
              </Button>
            </a>
            {hasReport && (
              <Link
                href={`/clients/${client.id}/report`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View latest weekly report in a new tab"
              >
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <FileText className="h-3.5 w-3.5" />
                  Latest report
                </Button>
              </Link>
            )}
            {client.gmc_id && (
              <a
                href={`https://merchants.google.com/mc/overview?a=${client.gmc_id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Merchant Center"
              >
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  GMC
                </Button>
              </a>
            )}
            {resolvedStoreUrl && (
              <a
                href={resolvedStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open store"
              >
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <Store className="h-3.5 w-3.5" />
                  Store
                </Button>
              </a>
            )}

            <DateRangePicker
              endDate={selectedDate}
              rangeDays={rangeDays}
              customStart={customStart}
            />

            {isAdmin && children}
          </div>
        </div>
      </div>

      {isHistorical && (
        <div className="mt-3 flex flex-col gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/30 dark:text-amber-300">
          <span>
            {customStart
              ? `Viewing custom range · ${format(new Date(customStart + "T00:00:00"), "MMM d, yyyy")} – ${formattedSelectedDate}`
              : `Viewing historical data · ${formattedSelectedDate}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReturnToLatest}
            className="h-7 border-amber-300 bg-transparent text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            Return to latest
          </Button>
        </div>
      )}
    </div>
  );
}
