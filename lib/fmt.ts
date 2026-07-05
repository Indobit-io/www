// Formatting helpers for IDR, percentages, and XRP amounts

export function idr(value: number | null | undefined, compact = false): string {
  if (value == null) return "—";
  if (compact && Math.abs(value) >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2)}jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function qty(
  value: number | null | undefined,
  decimals = 4,
  symbol = "XRP"
): string {
  if (value == null) return "—";
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${symbol}`;
}

// Back-compat alias
export const xrp = qty;

export function pct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function date(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function pnlColor(value: number | null | undefined): string {
  if (value == null) return "text-cmc-text-muted";
  if (value > 0) return "text-cmc-green";
  if (value < 0) return "text-cmc-red";
  return "text-cmc-text-secondary";
}
