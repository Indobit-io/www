import { NextResponse } from "next/server";
import { fetchPriceHistory, isSupportedAsset, type PricePoint } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 30, 90];

// History barely moves — cache 5 minutes per asset+range
const cache = new Map<string, { points: PricePoint[]; at: number }>();
const CACHE_TTL_MS = 5 * 60_000;

export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  const url = new URL(req.url);
  const asset = url.searchParams.get("asset") ?? "XRP";
  const days = Number(url.searchParams.get("days") ?? 30);

  if (!isSupportedAsset(asset)) {
    return NextResponse.json({ error: `Unsupported asset: ${asset}` }, { status: 400, headers });
  }
  if (!ALLOWED_DAYS.includes(days)) {
    return NextResponse.json({ error: `days harus salah satu dari ${ALLOWED_DAYS.join(", ")}` }, { status: 400, headers });
  }

  const key = `${asset}:${days}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.points, { headers });
  }

  try {
    const points = await fetchPriceHistory(asset, days);
    cache.set(key, { points, at: Date.now() });
    return NextResponse.json(points, { headers });
  } catch (err) {
    if (hit) return NextResponse.json(hit.points, { headers }); // serve stale on error
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch history" },
      { status: 502, headers }
    );
  }
}
