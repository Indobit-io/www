// CoinGecko: the token universe (which tokens exist, their contract address on
// each chain, market cap ranking) and the price series the correlation runs
// against. Works keyless on the public tier; COINGECKO_API_KEY raises limits.

const PUBLIC_BASE = "https://api.coingecko.com/api/v3";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3";

function base(): string {
  return process.env.COINGECKO_PRO === "1" ? PRO_BASE : PUBLIC_BASE;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) {
    h[process.env.COINGECKO_PRO === "1" ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = key;
  }
  return h;
}

async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  );
  const url = `${base()}${path}${qs.toString() ? `?${qs}` : ""}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: headers(), cache: "no-store" });
      if (res.status === 429) throw new Error("CoinGecko rate limited (429)");
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status} on ${path}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      // Public tier is ~10-30 calls/min; back off generously.
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("CoinGecko request failed");
}

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
}

/** Top coins by market cap. `perPage` maxes out at 250 per call. */
export async function topMarkets(perPage = 250, page = 1): Promise<MarketCoin[]> {
  return get<MarketCoin[]>("/coins/markets", {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: perPage,
    page,
    sparkline: "false",
    price_change_percentage: "24h",
  });
}

export interface CoinListEntry {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string | null>;
}

/**
 * Every coin with its contract address per chain. One call, a few MB — this is
 * how contract addresses get resolved instead of being hardcoded.
 */
export async function coinListWithPlatforms(): Promise<CoinListEntry[]> {
  return get<CoinListEntry[]>("/coins/list", { include_platform: "true" });
}

export interface PricePoint {
  ts: Date;
  price: number;
}

/**
 * Historical prices. CoinGecko picks granularity from the range: 1 day gives
 * ~5-minute points, 2-90 days gives hourly, beyond that daily. The correlation
 * buckets hourly, so keep `days` in the 2-90 window.
 */
export async function marketChart(coingeckoId: string, days: number): Promise<PricePoint[]> {
  const data = await get<{ prices: [number, number][] }>(`/coins/${coingeckoId}/market_chart`, {
    vs_currency: "usd",
    days,
  });
  return (data.prices ?? []).map(([ms, price]) => ({ ts: new Date(ms), price }));
}

/** Spot prices for many coins in one call. */
export async function simplePrices(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const out: Record<string, number> = {};
  // The URL has a practical length limit; chunk the id list.
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const data = await get<Record<string, { usd?: number }>>("/simple/price", {
      ids: chunk.join(","),
      vs_currencies: "usd",
    });
    for (const [id, row] of Object.entries(data)) {
      if (typeof row.usd === "number") out[id] = row.usd;
    }
  }
  return out;
}
