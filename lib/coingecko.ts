// Live prices with CoinGecko primary + Binance+FX fallback, multi-asset.

export interface AssetPrice {
  asset: AssetSymbol;
  idr: number;
  usd: number;
  fetched_at: string;
}

export const SUPPORTED_ASSETS = {
  XRP: { label: "XRP (Ripple)", coingeckoId: "ripple", binanceSymbol: "XRPUSDT" },
  BTC: { label: "BTC (Bitcoin)", coingeckoId: "bitcoin", binanceSymbol: "BTCUSDT" },
  ETH: { label: "ETH (Ethereum)", coingeckoId: "ethereum", binanceSymbol: "ETHUSDT" },
  SOL: { label: "SOL (Solana)", coingeckoId: "solana", binanceSymbol: "SOLUSDT" },
  BNB: { label: "BNB", coingeckoId: "binancecoin", binanceSymbol: "BNBUSDT" },
  ADA: { label: "ADA (Cardano)", coingeckoId: "cardano", binanceSymbol: "ADAUSDT" },
  DOGE: { label: "DOGE (Dogecoin)", coingeckoId: "dogecoin", binanceSymbol: "DOGEUSDT" },
} as const;

export type AssetSymbol = keyof typeof SUPPORTED_ASSETS;

export function isSupportedAsset(asset: string): asset is AssetSymbol {
  return asset in SUPPORTED_ASSETS;
}

function coingeckoHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }
  return headers;
}

async function fetchFromCoinGecko(asset: AssetSymbol): Promise<{ idr: number; usd: number }> {
  const { coingeckoId } = SUPPORTED_ASSETS[asset];
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=idr,usd`,
    { headers: coingeckoHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const row = data[coingeckoId];
  if (!row?.idr || !row?.usd) throw new Error("CoinGecko: empty response");
  return { idr: row.idr, usd: row.usd };
}

async function fetchFromBinance(asset: AssetSymbol): Promise<{ idr: number; usd: number }> {
  // Get ASSET/USDT from Binance, then USD/IDR from exchangerate-api
  const { binanceSymbol } = SUPPORTED_ASSETS[asset];
  const [tickerRes, fxRes] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, { cache: "no-store" }),
    fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" }),
  ]);
  if (!tickerRes.ok) throw new Error(`Binance ${tickerRes.status}`);
  if (!fxRes.ok) throw new Error(`FX rate ${fxRes.status}`);

  const tickerData = await tickerRes.json();
  const fxData = await fxRes.json();
  const usd = parseFloat(tickerData.price);
  const idrPerUsd = fxData.rates?.IDR ?? 16000;
  return { usd, idr: Math.round(usd * idrPerUsd) };
}

export async function fetchAssetPrice(asset: AssetSymbol): Promise<AssetPrice> {
  let last: Error | null = null;

  for (const fn of [fetchFromCoinGecko, fetchFromBinance]) {
    try {
      const { idr, usd } = await fn(asset);
      return { asset, idr, usd, fetched_at: new Date().toISOString() };
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw last ?? new Error("All price sources failed");
}

// Back-compat alias for the original XRP-only API
export type XrpPrice = AssetPrice;
export const fetchXrpPrice = () => fetchAssetPrice("XRP");

export interface PricePoint {
  t: number; // unix ms
  price: number; // IDR
}

// Historical prices from CoinGecko market_chart (no Binance fallback — history
// is a nice-to-have, callers must tolerate failure).
export async function fetchPriceHistory(asset: AssetSymbol, days: number): Promise<PricePoint[]> {
  const { coingeckoId } = SUPPORTED_ASSETS[asset];
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=idr&days=${days}`,
    { headers: coingeckoHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const prices: [number, number][] = data.prices ?? [];

  // Downsample to ≤ ~300 points so the client payload stays small
  const maxPoints = 300;
  const step = Math.max(1, Math.ceil(prices.length / maxPoints));
  const points = prices
    .filter((_, i) => i % step === 0 || i === prices.length - 1)
    .map(([t, price]) => ({ t, price }));
  return points;
}
