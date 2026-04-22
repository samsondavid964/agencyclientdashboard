const EM_DASH = "\u2014";

export function formatCurrency(
  value: number | null | undefined,
  options?: { compact?: boolean }
): string {
  if (value == null) return EM_DASH;
  if (options?.compact) {
    if (Math.abs(value) >= 1_000_000)
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    if (Math.abs(value) >= 1_000)
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    // < $1 000 — no decimals, locale thousands separator
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value == null) return EM_DASH;
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPercentRaw(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value == null) return EM_DASH;
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(
  value: number | null | undefined,
  options?: { compact?: boolean; decimals?: number }
): string {
  if (value == null) return EM_DASH;
  if (options?.compact) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: options?.decimals ?? 0,
  }).format(value);
}

export function formatRoas(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + "x";
}

export function formatScore(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  return Math.round(value).toString();
}
