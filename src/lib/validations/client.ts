import { z } from "zod";

// Client-side schema (used with react-hook-form + zodResolver)
// Number fields are typed as number since the form uses valueAsNumber
export const clientFormSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  company_name: z.string().min(1, "Company name is required"),
  store_name: z.string().min(1, "Store name is required"),
  google_ads_id: z
    .string()
    .min(1, "Google Ads ID is required")
    .regex(/^\d{3}-\d{3}-\d{4}$/, "Format: xxx-xxx-xxxx"),
  gmc_id: z.string(),
  industry: z.string(),
  website_platform: z.string(),
  store_url: z.string().refine((val) => val === "" || val.startsWith("http"), {
    message: "Must be a valid URL starting with http",
  }),
  monthly_budget: z
    .number({ message: "Must be a number" })
    .positive("Must be positive"),
  roas_target: z
    .number({ message: "Must be a number" })
    .positive("Must be positive"),
  account_manager: z.string(),
  mb_assigned: z.string().refine((val) => val === "" || val.includes("@"), {
    message: "Must be a valid email",
  }),
  csm_assigned: z.string().refine((val) => val === "" || val.includes("@"), {
    message: "Must be a valid email",
  }),
  slack_channel_url: z
    .string()
    .refine((val) => val === "" || val.startsWith("http"), {
      message: "Must be a valid URL",
    }),
  clickup_folder_url: z
    .string()
    .refine((val) => val === "" || val.startsWith("http"), {
      message: "Must be a valid URL",
    }),
  client_status: z.enum(["active", "onboarding", "paused", "churned"], {
    message: "Status is required",
  }),
  onboarding_date: z.string(),
  notes: z.string(),
  alert_threshold_weighted: z
    .number({ message: "Must be a number" })
    .int("Must be an integer")
    .min(0, "Must be between 0 and 100")
    .max(100, "Must be between 0 and 100"),
  alert_threshold_dimension: z
    .number({ message: "Must be a number" })
    .int("Must be an integer")
    .min(0, "Must be between 0 and 100")
    .max(100, "Must be between 0 and 100"),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

// Server-side schema (used in Server Actions with FormData)
// Uses z.coerce.number() to convert string form data to numbers
export const clientServerSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  company_name: z.string().min(1, "Company name is required"),
  store_name: z.string().min(1, "Store name is required"),
  google_ads_id: z
    .string()
    .min(1, "Google Ads ID is required")
    .regex(/^\d{3}-\d{3}-\d{4}$/, "Format: xxx-xxx-xxxx"),
  gmc_id: z.string(),
  industry: z.string(),
  website_platform: z.string(),
  store_url: z.string().refine((val) => val === "" || val.startsWith("http"), {
    message: "Must be a valid URL starting with http",
  }),
  monthly_budget: z.coerce
    .number({ message: "Must be a number" })
    .positive("Must be positive"),
  roas_target: z.coerce
    .number({ message: "Must be a number" })
    .positive("Must be positive"),
  account_manager: z.string(),
  mb_assigned: z.string().refine((val) => val === "" || val.includes("@"), {
    message: "Must be a valid email",
  }),
  csm_assigned: z.string().refine((val) => val === "" || val.includes("@"), {
    message: "Must be a valid email",
  }),
  slack_channel_url: z
    .string()
    .refine((val) => val === "" || val.startsWith("http"), {
      message: "Must be a valid URL",
    }),
  clickup_folder_url: z
    .string()
    .refine((val) => val === "" || val.startsWith("http"), {
      message: "Must be a valid URL",
    }),
  client_status: z.enum(["active", "onboarding", "paused", "churned"], {
    message: "Status is required",
  }),
  onboarding_date: z.string(),
  notes: z.string(),
  alert_threshold_weighted: z.coerce
    .number({ message: "Must be a number" })
    .int("Must be an integer")
    .min(0, "Must be between 0 and 100")
    .max(100, "Must be between 0 and 100")
    .optional()
    .default(60),
  alert_threshold_dimension: z.coerce
    .number({ message: "Must be a number" })
    .int("Must be an integer")
    .min(0, "Must be between 0 and 100")
    .max(100, "Must be between 0 and 100")
    .optional()
    .default(40),
});

export const clientStatusSchema = z.enum([
  "active",
  "onboarding",
  "paused",
  "churned",
]);

export const WEBSITE_PLATFORMS = [
  "Shopify",
  "WooCommerce",
  "Magento",
  "BigCommerce",
  "Other",
] as const;

export const CLIENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "paused", label: "Paused" },
  { value: "churned", label: "Churned" },
] as const;

export const logActionSchema = z.object({
  alert_id: z.string().min(1, "Alert ID is required"),
  response_notes: z
    .string()
    .min(1, "Action notes cannot be empty")
    .max(5000, "Notes must be 5000 characters or fewer"),
});
