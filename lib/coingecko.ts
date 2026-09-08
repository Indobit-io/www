// CoinGecko: the token universe (which tokens exist, their contract address on
// each chain, market cap ranking) and the price series the correlation runs
// against. Works keyless on the public tier; COINGECKO_API_KEY raises limits.

const PUBLIC_BASE = "https://api.coingecko.com/api/v3";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3";

/**
 * Minimum spacing between calls. The public tier is roughly 5-15 calls/min and
 * a demo key gets 30/min, so the default paces for the demo tier. Spacing calls
 * up front is far cheaper than discovering the limit through 429s: a blind
 * retry ladder burns tens of seconds per token and starves everything behind it.
 */
const MIN_INTERVAL_MS = Number(process.env.COINGECKO_MIN_INTERVAL_MS ?? 2500);

/** Raised when a deadline would be blown; callers stop rather than continue. */
export class DeadlineExceeded extends Error {
  constructor() {
    super("CoinGecko: run deadline reached");
    this.name = "DeadlineExceeded";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;
let callCount = 0;

export function callsMade(): number {
  return callCount;
}

/** Serializes every outbound call and spaces them by MIN_INTERVAL_MS. */
function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    callCount++;
    return fn();
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

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

/**
 * A single GET, rate limited and bounded. `deadline` (epoch ms) is a hard stop:
 * rather than sleeping past it and letting the platform kill the whole function
 * mid-write, the call gives up and lets the caller report partial progress.
 */
async function get<T>(
  path: string,
  params: Record<string, string | number> = {},
  deadline?: number
): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  );
  const url = `${base()}${path}${qs.toString() ? `?${qs}` : ""}`;
  const ATTEMPTS = 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (deadline && Date.now() >= deadline) throw new DeadlineExceeded();
    try {
      return await schedule(async () => {
        const res = await fetch(url, { headers: headers(), cache: "no-store" });
        if (res.status === 429) {
          // CoinGecko tells us how long to wait; guessing is worse.
          const retryAfter = Number(res.headers.get("retry-after"));
          const err = new Error("CoinGecko rate limited (429)") as Error & { retryAfterMs?: number };
          err.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined;
          throw err;
        }
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status} on ${path}`);
        return (await res.json()) as T;
      });
    } catch (err) {
      if (err instanceof DeadlineExceeded) throw err;
      lastErr = err;
      // Never sleep after the final attempt — that is pure dead time.
      if (attempt === ATTEMPTS - 1) break;

      const hinted = (err as { retryAfterMs?: number }).retryAfterMs;
      const backoff = hinted ?? 2000 * 2 ** attempt;
      if (deadline && Date.now() + backoff >= deadline) throw new DeadlineExceeded();
      await sleep(backoff);
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
export async function marketChart(
  coingeckoId: string,
  days: number,
  deadline?: number
): Promise<PricePoint[]> {
  const data = await get<{ prices: [number, number][] }>(
    `/coins/${coingeckoId}/market_chart`,
    { vs_currency: "usd", days },
    deadline
  );
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
