// Display formatters. Everything is USD — the on-chain world is priced in it.

export function usd(value: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = opts.sign && value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  if (abs === 0) return "$0";
  return `${sign}$${abs.toPrecision(3)}`;
}

/**
 * Asset prices, unlike flow totals, need precision rather than compactness:
 * "$8.0K" is a useless way to render an ETH price, and a memecoin needs
 * significant figures far to the right of the decimal point.
 */
export function price(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  if (abs >= 0.01) return `$${value.toFixed(4)}`;
  if (abs === 0) return "$0";
  return `$${value.toPrecision(3)}`;
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function qty(value: number | null | undefined, symbol?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 6;
  const formatted = value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function pct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Correlation coefficients get 3 decimals and an explicit sign. */
export function coef(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(3)}`;
}

export function pValue(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return "—";
  if (p < 0.0001) return "<0.0001";
  return p.toFixed(4);
}

export function addr(address: string, size: 4 | 6 = 6): string {
  if (!address) return "—";
  if (address.length <= 2 + size * 2) return address;
  return `${address.slice(0, 2 + size)}…${address.slice(-4)}`;
}

export function ago(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const then = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function dateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toISOString().replace("T", " ").slice(0, 16) + "Z";
}

/** Tailwind text colour keyed to sign. */
export function signColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return "text-cmc-text-secondary";
  }
  return value > 0 ? "text-cmc-green" : "text-cmc-red";
}

/**
 * Colour for a correlation strength. Deliberately conservative: anything under
 * |0.2| is grey, because in this domain it is noise.
 */
export function strengthColor(r: number, significant: boolean): string {
  if (!significant || Math.abs(r) < 0.2) return "text-cmc-text-muted";
  if (Math.abs(r) < 0.4) return "text-cmc-yellow";
  return r > 0 ? "text-cmc-green" : "text-cmc-red";
}

export function strengthLabel(r: number, significant: boolean): string {
  const a = Math.abs(r);
  if (!significant) return "not significant";
  if (a < 0.2) return "negligible";
  if (a < 0.4) return "weak";
  if (a < 0.6) return "moderate";
  return "strong";
}
