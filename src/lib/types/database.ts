// TypeScript types matching the Supabase schema (post-migration 008+009+010)

export interface Client {
  id: string;
  client_name: string;
  company_name: string | null;
  store_name: string | null;
  google_ads_id: string;
  gmc_id: string | null;
  monthly_budget: number;
  roas_target: number;
  store_url: string | null;
  industry: string | null;
  website_platform: string | null;
  account_manager: string | null;
  mb_assigned: string | null;
  csm_assigned: string | null;
  clickup_folder_url: string | null;
  slack_channel_url: string | null;
  logo_url: string | null;
  client_status: "active" | "onboarding" | "paused" | "churned";
  onboarding_date: string | null;
  notes: string | null;
  alert_threshold_weighted: number;
  alert_threshold_dimension: number;
  created_at: string;
  updated_at: string;
}

export interface DailyMetric {
  id: string;
  client_id: string;
  date: string;
  impressions: number | null;
  clicks: number | null;
  cost: number | null;
  conversions: number | null;
  conversion_value: number | null;
  all_conversions: number | null;
  all_conversion_value: number | null;
  search_impression_share: number | null;
  search_budget_lost_is: number | null;
  ctr: number | null;
  cpc: number | null;
  roas: number | null;
  cpa: number | null;
  aov: number | null;
  estimated_orders: number | null;
  estimated_revenue: number | null;
  mtd_cost: number | null;
  budget_pacing_pct: number | null;
  expected_pacing_pct: number | null;
  pacing_variance: number | null;
  created_at: string;
}

export interface HealthScore {
  id: string;
  client_id: string;
  date: string;
  spend_pacing_score: number | null;
  cpa_score: number | null;
  conv_quality_score: number | null;
  weighted_total: number | null;
  data_status: "scored" | "no_data" | "inactive";
  created_at: string;
}

export interface CampaignMetric {
  id: string;
  client_id: string;
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  campaign_type: string | null;
  date: string;
  impressions: number | null;
  clicks: number | null;
  cost: number | null;
  conversions: number | null;
  conversion_value: number | null;
  all_conversions: number | null;
  all_conversion_value: number | null;
  search_impression_share: number | null;
  search_budget_lost_is: number | null;
  ctr: number | null;
  cpc: number | null;
  roas: number | null;
  cpa: number | null;
  aov: number | null;
  estimated_orders: number | null;
  estimated_revenue: number | null;
}

export interface InvitedEmail {
  id: string;
  email: string;
  role: "admin" | "member";
  invited_by_user_id: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface AlertLog {
  id: string;
  client_id: string;
  date: string;
  weighted_total: number | null;
  spend_pacing_score: number | null;
  cpa_score: number | null;
  conv_quality_score: number | null;
  triggered_reasons: string[] | null;
  response_notes: string | null;
  responded_by: string | null;
  created_at: string;
}

// --- Query result types ---

export interface HomepageClient {
  id: string;
  client_name: string;
  company_name: string | null;
  store_name: string | null;
  logo_url: string | null;
  mb_assigned: string | null;
  client_status: string;
  today_spend: number | null;
  mtd_cost: number | null;
  avg_7d_score: number | null;
  prev_7d_score: number | null;
  history_days: number;
  // Optional: RPC `get_homepage_clients` may not yet project this.
  // Represents the most-recent data_status from daily_health_scores.
  data_status?: "scored" | "no_data" | "inactive" | null;
  roas: number | null;
  cpa: number | null;
  conversions: number | null;
}

export interface DuplicateClientInfo {
  id: string;
  client_name: string;
  store_name: string | null;
  company_name: string | null;
}

export interface HomepageSummary {
  totalActive: number;
  activeClients: number;
  avgHealthScore: number | null;
  avgHealthScoreDelta: number | null;
  belowSeventy: number;
  clientsBelow70: number;
  alertsToday: number;
}

export interface HealthTrendRow {
  date: string;
  weighted_total: number | null;
  spend_pacing_score: number | null;
  cpa_score: number | null;
  conv_quality_score: number | null;
  pacing_variance: number | null;
  cpa: number | null;
  roas: number | null;
  aov: number | null;
  data_status: "scored" | "no_data" | "inactive" | null;
}

export interface MetricsTableRow {
  date: string;
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  conversions: number | null;
  conversion_value: number | null;
  roas: number | null;
  cpa: number | null;
  aov: number | null;
  mtd_cost: number | null;
  pacing_variance: number | null;
  search_impression_share: number | null;
  search_budget_lost_is: number | null;
  weighted_total: number | null;
  spend_pacing_score: number | null;
  cpa_score: number | null;
  conv_quality_score: number | null;
  data_status: "scored" | "no_data" | "inactive" | null;
}

// --- CSM workspace (migration 027) ---

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "slack"
  | "status_change"
  | "note"
  | "task"
  | "alert_response"
  | "other";

export interface ClientActivityLog {
  id: string;
  client_id: string;
  user_id: string | null;
  user_email: string | null;
  activity_type: ActivityType;
  summary: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  author_user_id: string | null;
  author_email: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  assigned_user_id: string | null;
  assigned_email: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Form action state
export interface ActionState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
  requiresConfirmation?: boolean;
  duplicateClients?: DuplicateClientInfo[];
}
