"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subDays, differenceInDays } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  /** The "as-of" end date as YYYY-MM-DD */
  endDate: string;
  /** Preset days (7|14|28|90) if a preset is active, or null if custom range */
  rangeDays: number | null;
  /** Custom start date as YYYY-MM-DD; only set when range is custom */
  customStart: string | null;
}

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 28 days", days: 28 },
  { label: "Last 90 days", days: 90 },
] as const;

function toLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function formatShort(date: Date): string {
  return format(date, "MMM d");
}

export function DateRangePicker({
  endDate,
  rangeDays,
  customStart,
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const endDateObj = toLocalDate(endDate);

  // Derive the initial calendar selection from props
  const initialRange: DateRange = customStart
    ? { from: toLocalDate(customStart), to: endDateObj }
    : rangeDays != null
    ? { from: subDays(endDateObj, rangeDays - 1), to: endDateObj }
    : { from: endDateObj, to: endDateObj };

  const [open, setOpen] = useState(false);
  // Local draft state — only committed on "Apply" for custom ranges
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(initialRange);

  // Reset draft when popover opens, so it reflects current props
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftRange(initialRange);
    }
    setOpen(nextOpen);
  };

  // ── URL helpers ──────────────────────────────────────────────────────────

  function setPresetRange(days: number) {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", yesterday);
    params.set("range", String(days));
    params.delete("start");
    router.push(`${pathname}?${params.toString()}`);
  }

  function setCustomRange(startStr: string, endStr: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", endStr);
    params.set("start", startStr);
    params.delete("range");
    router.push(`${pathname}?${params.toString()}`);
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  const handlePresetClick = (days: number) => {
    setPresetRange(days);
    setOpen(false);
  };

  const handleApply = () => {
    if (!draftRange?.from) return;
    const toDate = draftRange.to ?? draftRange.from;
    setCustomRange(
      format(draftRange.from, "yyyy-MM-dd"),
      format(toDate, "yyyy-MM-dd"),
    );
    setOpen(false);
  };

  // ── Trigger label ────────────────────────────────────────────────────────

  const triggerLabel: string = (() => {
    if (rangeDays != null) {
      return `Last ${rangeDays} days · ending ${formatShort(endDateObj)}`;
    }
    if (customStart) {
      const startObj = toLocalDate(customStart);
      return `${formatShort(startObj)} – ${formatShort(endDateObj)}`;
    }
    return formatShort(endDateObj);
  })();

  // ── Draft day count for footer ───────────────────────────────────────────

  const draftDayCount: number | null = (() => {
    if (!draftRange?.from) return null;
    const to = draftRange.to ?? draftRange.from;
    return Math.abs(differenceInDays(to, draftRange.from)) + 1;
  })();

  // ── Active preset for highlight ──────────────────────────────────────────

  const activePresetDays = rangeDays;

  // ── Accessible announcement ──────────────────────────────────────────────

  const announcement: string = (() => {
    if (rangeDays != null) {
      return `Selected range: last ${rangeDays} days ending ${format(endDateObj, "MMMM d, yyyy")}`;
    }
    if (customStart) {
      return `Selected range: ${format(toLocalDate(customStart), "MMMM d, yyyy")} to ${format(endDateObj, "MMMM d, yyyy")}`;
    }
    return `Selected date: ${format(endDateObj, "MMMM d, yyyy")}`;
  })();

  return (
    <>
      {/* Live region for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-0.5 pl-2.5 pr-0.5">
        <span className="text-xs font-medium text-muted-foreground">Range</span>

        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Select date range"
              className="h-7 gap-1.5 rounded-full px-2.5 text-xs"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {triggerLabel}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto p-0"
            align="end"
            // Widen to fit side-by-side presets + 2-month calendar
            style={{ maxWidth: "none" }}
          >
            <div className="flex">
              {/* ── Preset sidebar ─────────────────────────────────────── */}
              <div className="flex w-[140px] shrink-0 flex-col gap-0.5 border-r border-border p-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.days}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-xs",
                      activePresetDays === preset.days &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() => handlePresetClick(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <div className="my-1 border-t border-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-xs",
                    activePresetDays === null && customStart !== null &&
                      "bg-accent text-accent-foreground",
                  )}
                  // Clicking "Custom" just focuses the user on the calendar —
                  // no URL change until Apply is pressed.
                  onClick={() => {
                    // Clear active preset highlight by resetting draft to
                    // single-day so the user can start a fresh selection.
                    setDraftRange({ from: endDateObj, to: undefined });
                  }}
                >
                  Custom
                </Button>
              </div>

              {/* ── Calendar + footer ──────────────────────────────────── */}
              <div className="flex flex-col">
                <Calendar
                  mode="range"
                  selected={draftRange}
                  onSelect={(range) => setDraftRange(range ?? undefined)}
                  numberOfMonths={2}
                  disabled={(d) => d > new Date()}
                  initialFocus
                />

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    {draftDayCount != null
                      ? `${draftDayCount} day${draftDayCount !== 1 ? "s" : ""} selected`
                      : "Select a range"}
                  </span>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    disabled={!draftRange?.from}
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
