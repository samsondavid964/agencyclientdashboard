import { createClient } from "@/lib/supabase/server";
import type { AlertLog } from "@/lib/types/database";

export interface AlertWithClient extends AlertLog {
  client_name: string;
  store_name: string | null;
  mb_assigned: string | null;
}

export async function getAlertsByClient(
  clientId: string,
  limit: number = 30
): Promise<AlertLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_log")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return (data as AlertLog[]) ?? [];
}

export async function getAllAlerts(limit: number = 200): Promise<AlertWithClient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_log")
    .select("*, clients(client_name, store_name, mb_assigned)")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching all alerts:", error);
    return [];
  }

  return (
    (data ?? []).map((row) => {
      const { clients, ...rest } = row as typeof row & {
        clients: {
          client_name: string;
          store_name: string | null;
          mb_assigned: string | null;
        } | null;
      };
      return {
        ...rest,
        client_name: clients?.client_name ?? "Unknown",
        store_name: clients?.store_name ?? null,
        mb_assigned: clients?.mb_assigned ?? null,
      };
    }) as AlertWithClient[]
  );
}
