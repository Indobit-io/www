import { NextResponse, type NextRequest } from "next/server";
import { correlateToken } from "@/lib/analysis";
import { hasDatabase, tokenBySymbol } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const sp = req.nextUrl.searchParams;

  let tokenId = Number(sp.get("token_id"));
  if (!Number.isFinite(tokenId) || tokenId <= 0) {
    const symbol = sp.get("symbol");
    if (!symbol) {
      return NextResponse.json({ error: "Pass ?symbol= or ?token_id=" }, { status: 400 });
    }
    const token = await tokenBySymbol(symbol);
    if (!token) return NextResponse.json({ error: `Unknown token "${symbol}"` }, { status: 404 });
    tokenId = token.id;
  }

  const report = await correlateToken(tokenId, {
    windowDays: Number(sp.get("days") ?? 30),
    includeHubs: sp.get("hubs") !== "0",
    maxLag: Number(sp.get("max_lag") ?? 6),
  });
  if (!report) return NextResponse.json({ error: "Unknown token" }, { status: 404 });

  // The bucket series is large; only send it when asked for.
  if (sp.get("series") !== "1") {
    const { buckets, ...rest } = report;
    return NextResponse.json({ ...rest, bucketCount: buckets.length });
  }
  return NextResponse.json(report);
}
