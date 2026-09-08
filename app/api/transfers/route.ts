import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase, recentTransfers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const sp = req.nextUrl.searchParams;
  const transfers = await recentTransfers({
    limit: Number(sp.get("limit") ?? 100),
    tokenId: sp.get("token_id") ? Number(sp.get("token_id")) : undefined,
    address: sp.get("address") ?? undefined,
    minUsd: sp.get("min_usd") ? Number(sp.get("min_usd")) : undefined,
    whalesOnly: sp.get("whales") === "1",
  });
  return NextResponse.json({ count: transfers.length, transfers });
}
