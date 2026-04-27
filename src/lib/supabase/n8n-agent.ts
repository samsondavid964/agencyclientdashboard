import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for the n8n Agent Data project.
 * Reads HTML reports from public.report_jobs. Service role bypasses RLS;
 * never import this module from "use client" code.
 */
export function createN8nAgentClient() {
  const url = process.env.N8N_AGENT_SUPABASE_URL;
  const serviceKey = process.env.N8N_AGENT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing N8N_AGENT_SUPABASE_URL or N8N_AGENT_SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
