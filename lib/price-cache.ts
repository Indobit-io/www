// Server-side price cache so rapid client polls don't hammer external APIs.

import { fetchAssetPrice, type AssetPrice, type AssetSymbol } from "./coingecko";

const cache = new Map<AssetSymbol, { price: AssetPrice; at: number }>();
const CACHE_TTL_MS = 1_500;

export async function getCachedPrice(asset: AssetSymbol): Promise<AssetPrice> {
  const hit = cache.get(asset);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.price;

  try {
    const price = await fetchAssetPrice(asset);
    cache.set(asset, { price, at: Date.now() });
    return price;
  } catch (err) {
    if (hit) return hit.price; // serve stale on error
    throw err;
  }
}
