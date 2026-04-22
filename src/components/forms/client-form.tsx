"use client";

import { useRef, useEffect, useState, useActionState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  clientFormSchema,
  type ClientFormValues,
  WEBSITE_PLATFORMS,
  CLIENT_STATUSES,
} from "@/lib/validations/client";
import { createClientAction, updateClient } from "@/lib/actions/clients";
import type { ActionState, Client } from "@/lib/types/database";

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

const initialState: ActionState = {};

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const isEdit = !!client;
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // Bind updateClient with clientId for edit mode
  const boundAction = isEdit
    ? updateClient.bind(null, client.id)
    : createClientAction;

  const [state, formAction, isPending] = useActionState(boundAction, initialState);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      client_name: client?.client_name ?? "",
      company_name: client?.company_name ?? "",
      store_name: client?.store_name ?? "",
      google_ads_id: client?.google_ads_id ?? "",
      gmc_id: client?.gmc_id ?? "",
      industry: client?.industry ?? "",
      website_platform: client?.website_platform ?? "",
      store_url: client?.store_url ?? "",
      monthly_budget: client?.monthly_budget ?? 0,
      roas_target: client?.roas_target ?? 0,
      account_manager: client?.account_manager ?? "",
      mb_assigned: client?.mb_assigned ?? "",
      csm_assigned: client?.csm_assigned ?? "",
      slack_channel_url: client?.slack_channel_url ?? "",
      clickup_folder_url: client?.clickup_folder_url ?? "",
      client_status: client?.client_status ?? "onboarding",
      onboarding_date: client?.onboarding_date ?? new Date().toISOString().split("T")[0],
      notes: client?.notes ?? "",
      alert_threshold_weighted: client?.alert_threshold_weighted ?? 60,
      alert_threshold_dimension: client?.alert_threshold_dimension ?? 40,
    },
  });

  const { formState: { errors, isDirty } } = form;

  // Warn user if they try to navigate away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Map server errors to form fields
  useEffect(() => {
    if (state?.errors) {
      Object.entries(state.errors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          form.setError(field as keyof ClientFormValues, {
            message: messages[0],
          });
        }
      });
    }
    // Duplicate-confirmation is a soft warning rendered inline — not a toast.
    if (state?.message && !state?.success && !state?.requiresConfirmation) {
      toast.error(state.message);
    }
    if (state?.success) {
      toast.success(state.message || "Success!");
      onSuccess?.();
    }
    // Reset the confirm flag once the server accepts the confirmed submission.
    if (state?.success || !state?.requiresConfirmation) {
      // nothing — confirmDuplicate is reset below on new name changes
    }
  }, [state, form, onSuccess]);

  // If the user edits the client_name after a duplicate warning, reset the
  // confirmation flag so the check runs again on the next submit.
  const watchedName = form.watch("client_name");
  useEffect(() => {
    setConfirmDuplicate(false);
  }, [watchedName]);

  // Run client-side Zod validation then submit via the native form action.
  const handleSubmit = form.handleSubmit(async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fix the highlighted fields before saving.");
      const firstErrorField = Object.keys(form.formState.errors)[0];
      if (firstErrorField) form.setFocus(firstErrorField as keyof ClientFormValues);
      return;
    }
    formRef.current?.requestSubmit();
  });

  // Soft warning: ROAS target below 1.0 (create flow only).
  const roasTargetValue = form.watch("roas_target");
  const showRoasSubOneWarning =
    !isEdit &&
    typeof roasTargetValue === "number" &&
    roasTargetValue > 0 &&
    roasTargetValue < 1;

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-8">
      {/* Hidden confirmDuplicate flag — set to "true" once the user clicks
          "Create anyway" after seeing the duplicate warning. */}
      {!isEdit && (
        <input
          type="hidden"
          name="confirmDuplicate"
          value={confirmDuplicate ? "true" : "false"}
        />
      )}

      {/* Duplicate client-name confirmation (soft warning) */}
      {!isEdit && state?.requiresConfirmation && state.duplicateClients && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="flex-1 space-y-2.5">
              <div>
                <p className="text-sm font-semibold">
                  A client named &ldquo;{state.duplicateClients[0].client_name}&rdquo;
                  already exists
                </p>
                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                  Multiple stores under the same client is valid — but please
                  confirm this isn&apos;t an accidental duplicate.
                </p>
              </div>
              <ul className="space-y-1.5 rounded-md bg-amber-100/60 p-2.5 text-xs dark:bg-amber-950/40">
                {state.duplicateClients.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <Link
                      href={`/clients/${c.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
                    >
                      {c.client_name}
                    </Link>
                    <span className="text-amber-800/80 dark:text-amber-300/80">
                      {c.store_name ? `· ${c.store_name}` : ""}
                      {c.company_name ? ` · ${c.company_name}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-950/60"
                  onClick={() => {
                    setConfirmDuplicate(true);
                    // Re-submit after state flushes so the hidden input ships "true"
                    setTimeout(() => formRef.current?.requestSubmit(), 0);
                  }}
                  disabled={isPending}
                >
                  Create anyway
                </Button>
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/70">
                  Or edit the client name above to make it unique.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info — always visible */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Info</h3>
        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="store_name">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_name"
              aria-invalid={!!errors.store_name}
              aria-describedby={errors.store_name ? "store_name_error" : undefined}
              {...form.register("store_name")}
              placeholder="Acme Store"
            />
            <p className="text-xs text-muted-foreground">Primary display name — the store/brand shown across the dashboard</p>
            {errors.store_name && (
              <p id="store_name_error" role="alert" className="text-sm text-destructive">
                {errors.store_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company_name"
              aria-invalid={!!errors.company_name}
              aria-describedby={errors.company_name ? "company_name_error" : undefined}
              {...form.register("company_name")}
              placeholder="Acme Corporation"
            />
            <p className="text-xs text-muted-foreground">Legal entity name (e.g., &quot;Acme Corporation Ltd&quot;)</p>
            {errors.company_name && (
              <p id="company_name_error" role="alert" className="text-sm text-destructive">
                {errors.company_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">
              Contact Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client_name"
              aria-invalid={!!errors.client_name}
              aria-describedby={errors.client_name ? "client_name_error" : undefined}
              {...form.register("client_name")}
              placeholder="Jane Doe"
            />
            <p className="text-xs text-muted-foreground">Primary contact person for this account</p>
            {errors.client_name && (
              <p id="client_name_error" role="alert" className="text-sm text-destructive">
                {errors.client_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_ads_id">
              Google Ads ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="google_ads_id"
              aria-invalid={!!errors.google_ads_id}
              aria-describedby={errors.google_ads_id ? "google_ads_id_error" : undefined}
              {...form.register("google_ads_id")}
              placeholder="123-456-7890"
            />
            {errors.google_ads_id && (
              <p id="google_ads_id_error" role="alert" className="text-sm text-destructive">
                {errors.google_ads_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_budget">
              Monthly Budget <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="monthly_budget"
                className="pl-7"
                aria-invalid={!!errors.monthly_budget}
                aria-describedby={errors.monthly_budget ? "monthly_budget_error" : undefined}
                {...form.register("monthly_budget", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="10000.00"
              />
            </div>
            {errors.monthly_budget && (
              <p id="monthly_budget_error" role="alert" className="text-sm text-destructive">
                {errors.monthly_budget.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_status">
              Client Status <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="client_status"
              render={({ field }) => (
                <>
                  <input type="hidden" name={field.name} value={field.value ?? ""} />
                  <Select
                    value={field.value || undefined}
                    onValueChange={(val) =>
                      field.onChange(val as ClientFormValues["client_status"])
                    }
                  >
                    <SelectTrigger id="client_status" aria-label="Client Status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            />
          </div>
        </div>
      </div>

      {/* Targets & Budget — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Targets
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="roas_target">
                ROAS Target <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="roas_target"
                  className="pr-7"
                  aria-invalid={!!errors.roas_target}
                  aria-describedby={errors.roas_target ? "roas_target_error" : undefined}
                  {...form.register("roas_target", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="4.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">×</span>
              </div>
              {errors.roas_target && (
                <p id="roas_target_error" role="alert" className="text-sm text-destructive">
                  {errors.roas_target.message}
                </p>
              )}
              {showRoasSubOneWarning && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  <span>
                    A ROAS target below 1.0 means ad spend exceeds revenue.
                    Double-check this is intentional.
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding_date">Onboarding Date</Label>
              <Input
                id="onboarding_date"
                {...form.register("onboarding_date")}
                type="date"
              />
            </div>
          </div>
        </div>
      </details>

      {/* Store Details — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Store Details
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gmc_id">GMC ID</Label>
              <Input
                id="gmc_id"
                {...form.register("gmc_id")}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                {...form.register("industry")}
                placeholder="e.g., Fashion, Electronics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_platform">Website Platform</Label>
              <Controller
                control={form.control}
                name="website_platform"
                render={({ field }) => (
                  <>
                    <input type="hidden" name={field.name} value={field.value ?? ""} />
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="website_platform" aria-label="Website Platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {WEBSITE_PLATFORMS.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_url">Store URL</Label>
              <Input
                id="store_url"
                aria-invalid={!!errors.store_url}
                aria-describedby={errors.store_url ? "store_url_error" : undefined}
                {...form.register("store_url")}
                placeholder="https://store.example.com"
                type="url"
              />
              {errors.store_url && (
                <p id="store_url_error" role="alert" className="text-sm text-destructive">
                  {errors.store_url.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </details>

      {/* Team Assignment — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Team Assignment
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="account_manager">Account Manager</Label>
              <Input
                id="account_manager"
                {...form.register("account_manager")}
                placeholder="Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mb_assigned">Media Buyer (Email)</Label>
              <Input
                id="mb_assigned"
                aria-invalid={!!errors.mb_assigned}
                aria-describedby={errors.mb_assigned ? "mb_assigned_error" : undefined}
                {...form.register("mb_assigned")}
                type="email"
                placeholder="buyer@ad-lab.io"
              />
              {errors.mb_assigned && (
                <p id="mb_assigned_error" role="alert" className="text-sm text-destructive">
                  {errors.mb_assigned.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="csm_assigned">CSM (Email)</Label>
              <Input
                id="csm_assigned"
                aria-invalid={!!errors.csm_assigned}
                aria-describedby={errors.csm_assigned ? "csm_assigned_error" : undefined}
                {...form.register("csm_assigned")}
                type="email"
                placeholder="csm@ad-lab.io"
              />
              {errors.csm_assigned && (
                <p id="csm_assigned_error" role="alert" className="text-sm text-destructive">
                  {errors.csm_assigned.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </details>

      {/* Integrations — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Integrations
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t px-4 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slack_channel_url">Slack Webhook URL</Label>
              <Input
                id="slack_channel_url"
                aria-invalid={!!errors.slack_channel_url}
                aria-describedby={errors.slack_channel_url ? "slack_channel_url_error" : undefined}
                {...form.register("slack_channel_url")}
                placeholder="https://hooks.slack.com/..."
                type="url"
              />
              {errors.slack_channel_url && (
                <p id="slack_channel_url_error" role="alert" className="text-sm text-destructive">
                  {errors.slack_channel_url.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clickup_folder_url">ClickUp Folder URL</Label>
              <Input
                id="clickup_folder_url"
                aria-invalid={!!errors.clickup_folder_url}
                aria-describedby={errors.clickup_folder_url ? "clickup_folder_url_error" : undefined}
                {...form.register("clickup_folder_url")}
                placeholder="https://app.clickup.com/..."
                type="url"
              />
              {errors.clickup_folder_url && (
                <p id="clickup_folder_url_error" role="alert" className="text-sm text-destructive">
                  {errors.clickup_folder_url.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </details>

      {/* Alert Thresholds — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Alert Thresholds
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t px-4 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Slack alerts fire when the weighted score drops below the overall
            threshold, or any single dimension drops below the dimension
            threshold. Leave defaults unless this client needs stricter or
            looser monitoring (e.g. high-spend accounts).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alert_threshold_weighted">
                Weighted score threshold
              </Label>
              <Input
                id="alert_threshold_weighted"
                aria-invalid={!!errors.alert_threshold_weighted}
                aria-describedby={
                  errors.alert_threshold_weighted
                    ? "alert_threshold_weighted_error"
                    : undefined
                }
                {...form.register("alert_threshold_weighted", {
                  valueAsNumber: true,
                })}
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Default 60. Alerts when overall health &lt; this value.
              </p>
              {errors.alert_threshold_weighted && (
                <p
                  id="alert_threshold_weighted_error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.alert_threshold_weighted.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert_threshold_dimension">
                Per-dimension threshold
              </Label>
              <Input
                id="alert_threshold_dimension"
                aria-invalid={!!errors.alert_threshold_dimension}
                aria-describedby={
                  errors.alert_threshold_dimension
                    ? "alert_threshold_dimension_error"
                    : undefined
                }
                {...form.register("alert_threshold_dimension", {
                  valueAsNumber: true,
                })}
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="40"
              />
              <p className="text-xs text-muted-foreground">
                Default 40. Alerts when spend pacing, CPA, or conv quality &lt;
                this value.
              </p>
              {errors.alert_threshold_dimension && (
                <p
                  id="alert_threshold_dimension_error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.alert_threshold_dimension.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </details>

      {/* Notes — collapsible */}
      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          Notes
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Any additional notes about this client..."
              rows={3}
            />
          </div>
        </div>
      </details>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          aria-busy={isPending || undefined}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {isEdit ? "Save Changes" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
