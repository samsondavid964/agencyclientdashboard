"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { HomepageClient } from "@/lib/types/database";
import { formatCurrency, formatScore, formatRoas } from "@/lib/utils/formatting";
import { formatMBDisplay } from "@/lib/utils/display-name";
import {
  getHealthScoreColor,
  INSUFFICIENT_HISTORY_DAYS,
} from "@/lib/utils/health-score";
import { getInitials } from "@/lib/utils/initials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { reassignClientMB } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  client: HomepageClient;
  mediaBuyers?: string[];
  selectionMode?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Inline MB reassign popover
interface ReassignPopoverProps {
  clientId: string;
  currentMB: string | null;
  mediaBuyers: string[];
}

function ReassignPopover({ clientId, currentMB, mediaBuyers }: ReassignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentMB ?? "");
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await reassignClientMB(clientId, selected);
      if (result.success) {
        toast.success(result.message ?? "Reassigned.");
        setOpen(false);
      } else {
        toast.error(result.message ?? "Failed to reassign.");
      }
    });
  };

  if (mediaBuyers.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Reassign media buyer"
          className="relative z-10 ml-1 rounded p-0.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Reassign Media Buyer
        </p>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-full text-sm" aria-label="Select media buyer">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {mediaBuyers.map((mb) => (
              <SelectItem key={mb} value={mb}>
                {formatMBDisplay(mb)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 flex justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleConfirm}
            disabled={!selected || isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ClientCard({
  client,
  mediaBuyers = [],
  selectionMode = false,
  selected = false,
  onToggle,
}: ClientCardProps) {
  const score = client.avg_7d_score;
  const scoreColor = getHealthScoreColor(score);

  // Trend: show magnitude in points when we have enough history; otherwise
  // suppress categorical labels that are statistically meaningless at low N.
  const hasEnoughHistory = client.history_days >= INSUFFICIENT_HISTORY_DAYS;
  const delta =
    client.avg_7d_score != null && client.prev_7d_score != null
      ? client.avg_7d_score - client.prev_7d_score
      : null;
  const deltaRounded = delta != null ? Math.round(delta) : null;

  let trendNode: React.ReactNode = null;
  if (!hasEnoughHistory) {
    trendNode = (
      <span className="rounded-sm bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
        New account
      </span>
    );
  } else if (deltaRounded != null) {
    const isPositive = deltaRounded > 0;
    const isNegative = deltaRounded < 0;
    const tone = isPositive
      ? "text-emerald-600"
      : isNegative
      ? "text-red-600"
      : "text-gray-400";
    const sign = isPositive ? "+" : "";
    trendNode = (
      <span className={cn("text-[10px] font-medium tabular-nums", tone)}>
        {sign}
        {deltaRounded} pts
      </span>
    );
  }

  const displayName = client.store_name || client.client_name;
  const subtitle = client.store_name ? client.client_name : client.company_name;

  const clientInitials = getInitials(displayName);
  const avatarColorClass = getAvatarColor(displayName);

  const roasValue = client.roas;
  const hasRoas = roasValue != null;

  return (
    <div
      className={cn(
        "card-hover group relative rounded-xl border bg-card p-4 shadow-sm",
        "transition-[box-shadow,border-color,transform] duration-200",
        selectionMode && selected
          ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-md"
          : "hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800",
        selectionMode ? "cursor-pointer" : ""
      )}
      onClick={selectionMode ? onToggle : undefined}
      onKeyDown={
        selectionMode
          ? (e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
      tabIndex={selectionMode ? 0 : undefined}
    >
      {/* Selection checkbox: the single source of truth for selected state.
          Sits on top of the card via z-10 and is fully keyboard-focusable. */}
      {selectionMode && (
        <span className="absolute left-3 top-3 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.()}
            aria-label={`Select ${displayName}`}
            className="h-4 w-4 cursor-pointer rounded border-border accent-emerald-600"
          />
        </span>
      )}

      {/* Stretched navigation link — lives behind interactive children so the
          whole card is clickable without nesting <button>s inside an <a>. */}
      {!selectionMode && (
        <Link
          href={`/clients/${client.id}`}
          aria-label={`Open ${displayName}`}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      )}

      {/* Top row: Name (left) + Score (right) */}
      <div className={cn("flex items-start justify-between gap-2", selectionMode && "pl-5")}>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {displayName}
          </h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Score number + trend badge stacked on the right */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          {score != null ? (
            <span
              className={cn(
                "text-2xl font-bold tabular-nums leading-none",
                scoreColor.text
              )}
            >
              {formatScore(score)}
            </span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 text-lg text-muted-foreground">
              —
            </span>
          )}

          {/* Trend: magnitude in points, or "New account" when history < 14d */}
          {trendNode}
        </div>
      </div>

      {/* Logo / initials avatar — smaller, left-aligned */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg",
            client.logo_url ? "bg-muted" : avatarColorClass
          )}
        >
          {client.logo_url ? (
            <Image
              src={client.logo_url}
              alt={`${displayName} logo`}
              width={32}
              height={32}
              sizes="32px"
              className="h-8 w-8 object-cover"
            />
          ) : (
            <span className="text-xs font-semibold" aria-hidden="true">
              {clientInitials}
            </span>
          )}
        </div>

        {/* Zone label sits next to logo */}
        <span className={cn("text-xs font-semibold", scoreColor.text)}>
          {scoreColor.label}
        </span>
      </div>

      {/* Divider */}
      <div className="my-3 border-t" />

      {/* Bottom stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Spend */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            Spend
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(client.today_spend)}
          </p>
        </div>

        {/* ROAS (preferred) or MTD */}
        {hasRoas ? (
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              ROAS
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatRoas(roasValue)}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              MTD
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(client.mtd_cost, { compact: true })}
            </p>
          </div>
        )}

        {/* MTD (always shown when ROAS takes the top-right slot; spans both columns otherwise) */}
        {hasRoas && (
          <div className="col-span-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              MTD
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(client.mtd_cost, { compact: true })}
            </p>
          </div>
        )}
      </div>

      {/* MB assigned row (non-selection mode only) */}
      {!selectionMode && client.mb_assigned && (
        <div className="relative z-10 mt-2 flex items-center border-t pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 mr-1.5">
            MB:
          </p>
          <span className="text-xs text-muted-foreground truncate">
            {formatMBDisplay(client.mb_assigned)}
          </span>
          {mediaBuyers.length > 0 && (
            <ReassignPopover
              clientId={client.id}
              currentMB={client.mb_assigned}
              mediaBuyers={mediaBuyers}
            />
          )}
        </div>
      )}
    </div>
  );
}
