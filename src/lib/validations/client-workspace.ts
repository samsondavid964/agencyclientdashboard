import { z } from "zod";

export const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "slack",
  "status_change",
  "note",
  "task",
  "alert_response",
  "other",
] as const;

export const logActivitySchema = z.object({
  client_id: z.string().uuid("Invalid client id"),
  activity_type: z.enum(ACTIVITY_TYPES, { message: "Invalid activity type" }),
  summary: z
    .string()
    .min(1, "Summary is required")
    .max(2000, "Summary must be 2000 characters or fewer"),
});

export const createNoteSchema = z.object({
  client_id: z.string().uuid("Invalid client id"),
  body: z
    .string()
    .min(1, "Note body is required")
    .max(10000, "Note must be 10000 characters or fewer"),
  pinned: z.coerce.boolean().optional().default(false),
});

export const updateNoteSchema = z.object({
  body: z
    .string()
    .min(1, "Note body is required")
    .max(10000, "Note must be 10000 characters or fewer"),
});

export const createTaskSchema = z.object({
  client_id: z.string().uuid("Invalid client id"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title must be 500 characters or fewer"),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .optional()
    .default(""),
  assigned_email: z
    .string()
    .refine((val) => val === "" || val.includes("@"), {
      message: "Must be a valid email",
    })
    .optional()
    .default(""),
  due_date: z
    .string()
    .refine(
      (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
      { message: "Must be a valid date (YYYY-MM-DD)" }
    )
    .optional()
    .default(""),
});

export type LogActivityValues = z.infer<typeof logActivitySchema>;
export type CreateNoteValues = z.infer<typeof createNoteSchema>;
export type CreateTaskValues = z.infer<typeof createTaskSchema>;
