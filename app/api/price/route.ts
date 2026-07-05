import { NextResponse } from "next/server";
import { isSupportedAsset } from "@/lib/coingecko";
import { getCachedPrice } from "@/lib/price-cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  const asset = new URL(req.url).searchParams.get("asset") ?? "XRP";

  if (!isSupportedAsset(asset)) {
    return NextResponse.json({ error: `Unsupported asset: ${asset}` }, { status: 400, headers });
  }

  try {
    const price = await getCachedPrice(asset);
    return NextResponse.json(price, { headers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch price" },
      { status: 500, headers }
    );
  }
}
