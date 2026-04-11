import type { FetchResult } from "./fred";

const SYMBOL_MAP: Record<string, string> = {
  "^GSPC": "sp500",
  "^VIX": "vix",
  "DX-Y.NYB": "dxy",
  "GC=F": "gold",
  "BZ=F": "oil",
};

async function fetchSymbol(symbol: string): Promise<FetchResult> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LiquidityTracker/1.0; +https://github.com)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo ${symbol}: HTTP ${res.status}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(`Yahoo ${symbol}: no result in response`);
  }

  // Use regularMarketPrice from meta as the most reliable field
  const price: number =
    result.meta?.regularMarketPrice ??
    result.indicators?.quote?.[0]?.close?.slice(-1)?.[0];

  if (price == null || isNaN(price)) {
    throw new Error(`Yahoo ${symbol}: could not extract price`);
  }

  return {
    metricId: SYMBOL_MAP[symbol],
    value: price,
    source: `Yahoo/${symbol}`,
  };
}

export async function fetchAllYahoo(): Promise<FetchResult[]> {
  const symbols = Object.keys(SYMBOL_MAP);
  const results = await Promise.allSettled(symbols.map(fetchSymbol));

  const successful: FetchResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      console.error(`Yahoo ${symbols[i]} failed:`, result.reason?.message);
    }
  }
  return successful;
}
