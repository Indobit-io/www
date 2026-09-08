import { NextResponse, type NextRequest } from "next/server";
import { movers } from "@/lib/analysis";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const hours = Number(req.nextUrl.searchParams.get("hours") ?? 24);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const rows = await movers({
    hours: Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 720) : 24,
    limit: Number.isFinite(limit) ? limit : 50,
  });
  return NextResponse.json({ hours, count: rows.length, movers: rows });
}
