import type { FetchResult } from "./fred";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
// Fallback: DeFiLlama stablecoins API (more reliable)
const DEFILLAMA_STABLECOINS = "https://stablecoins.llama.fi/stablecoins";

async function fetchBitcoinPrice(): Promise<FetchResult> {
  const url = `${COINGECKO_BASE}/simple/price?ids=bitcoin&vs_currencies=usd`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko BTC: HTTP ${res.status}`);
  }

  const json = await res.json();
  const price = json?.bitcoin?.usd;
  if (price == null || isNaN(price)) {
    throw new Error("CoinGecko BTC: no price in response");
  }

  return {
    metricId: "btc",
    value: price,
    source: "CoinGecko/bitcoin",
  };
}

async function fetchStablecoinMarketCap(): Promise<FetchResult> {
  // Try DeFiLlama first (more reliable, no rate limits)
  try {
    const res = await fetch(DEFILLAMA_STABLECOINS, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const json = await res.json();
      const peggedAssets: Array<{ circulating?: { peggedUSD?: number } }> =
        json?.peggedAssets ?? [];

      let totalUSD = 0;
      for (const asset of peggedAssets) {
        totalUSD += asset.circulating?.peggedUSD ?? 0;
      }

      if (totalUSD > 0) {
        return {
          metricId: "stablecoins",
          value: totalUSD / 1e9, // Convert to billions
          source: "DeFiLlama/stablecoins",
        };
      }
    }
  } catch (e) {
    console.warn("DeFiLlama stablecoins failed, trying CoinGecko:", e);
  }

  // Fallback: CoinGecko /global
  const globalUrl = `${COINGECKO_BASE}/global`;
  const res = await fetch(globalUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko global: HTTP ${res.status}`);
  }

  const json = await res.json();
  const stablecoinMarketCap =
    json?.data?.total_market_cap?.usdt ?? // rough proxy
    json?.data?.total_volume?.usdt;

  // Better: look for stablecoin market cap percentage
  const totalMcap = json?.data?.total_market_cap?.usd ?? 0;
  const stablecoinPct =
    json?.data?.market_cap_percentage?.usdt ??
    json?.data?.market_cap_percentage?.usdc ??
    0;

  if (totalMcap > 0) {
    // Sum USDT + USDC + BUSD + DAI percentages as rough stablecoin estimate
    const mcapPcts = json?.data?.market_cap_percentage ?? {};
    const stableIds = ["usdt", "usdc", "busd", "dai", "tusd", "frax"];
    let pctSum = 0;
    for (const id of stableIds) {
      pctSum += mcapPcts[id] ?? 0;
    }
    const estimatedMcapBillions = (totalMcap * (pctSum / 100)) / 1e9;

    if (estimatedMcapBillions > 0) {
      return {
        metricId: "stablecoins",
        value: estimatedMcapBillions,
        source: "CoinGecko/global",
      };
    }
  }

  throw new Error("Could not fetch stablecoin market cap from any source");
}

export async function fetchAllCoinGecko(): Promise<FetchResult[]> {
  const results = await Promise.allSettled([
    fetchBitcoinPrice(),
    fetchStablecoinMarketCap(),
  ]);

  const successful: FetchResult[] = [];
  const labels = ["BTC", "Stablecoins"];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      console.error(
        `CoinGecko ${labels[i]} failed:`,
        result.reason?.message
      );
    }
  }
  return successful;
}
