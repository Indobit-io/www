export interface XrpPrice {
  idr: number;
  usd: number;
  fetched_at: string;
}

async function fetchFromCoinGecko(): Promise<{ idr: number; usd: number }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=idr,usd",
    { headers, next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  return { idr: data.ripple.idr, usd: data.ripple.usd };
}

async function fetchFromBinance(): Promise<{ idr: number; usd: number }> {
  // Get XRP/USDT from Binance, then USD/IDR from exchangerate-api
  const [xrpRes, fxRes] = await Promise.all([
    fetch("https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT", {
      next: { revalidate: 0 },
    }),
    fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } }),
  ]);
  if (!xrpRes.ok) throw new Error(`Binance ${xrpRes.status}`);
  if (!fxRes.ok) throw new Error(`FX rate ${fxRes.status}`);

  const xrpData = await xrpRes.json();
  const fxData = await fxRes.json();
  const usd = parseFloat(xrpData.price);
  const idrPerUsd = fxData.rates?.IDR ?? 16000;
  return { usd, idr: Math.round(usd * idrPerUsd) };
}

export async function fetchXrpPrice(): Promise<XrpPrice> {
  let last: Error | null = null;

  for (const fn of [fetchFromCoinGecko, fetchFromBinance]) {
    try {
      const { idr, usd } = await fn();
      return { idr, usd, fetched_at: new Date().toISOString() };
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw last ?? new Error("All price sources failed");
}
