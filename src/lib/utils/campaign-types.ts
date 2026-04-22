const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  SEARCH: "Search",
  PERFORMANCE_MAX: "PMax",
  SHOPPING: "Shopping",
  DISPLAY: "Display",
  VIDEO: "Video",
  DEMAND_GEN: "Demand Gen",
};

export function getCampaignTypeLabel(type: string | null | undefined): string {
  if (!type) return "Other";
  return CAMPAIGN_TYPE_LABELS[type] ?? "Other";
}

export function getCampaignStatusColor(
  status: string | null | undefined
): string {
  switch (status) {
    case "ENABLED":
      return "bg-emerald-100 text-emerald-700";
    case "PAUSED":
      return "bg-gray-100 text-gray-600";
    case "REMOVED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
