import { NextResponse } from "next/server";
import { fetchXrpPrice, type XrpPrice } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

// Cache so rapid client polls don't hammer external APIs
let cache: { price: XrpPrice; at: number } | null = null;
const CACHE_TTL_MS = 1_500;

export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.price, { headers });
  }
  try {
    const price = await fetchXrpPrice();
    cache = { price, at: Date.now() };
    return NextResponse.json(price, { headers });
  } catch (err) {
    if (cache) return NextResponse.json(cache.price, { headers }); // serve stale on error
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch price" },
      { status: 500, headers }
    );
  }
}
