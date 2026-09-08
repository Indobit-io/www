import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase, listWhales } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const sp = req.nextUrl.searchParams;
  const { rows, total } = await listWhales({
    limit: Number(sp.get("limit") ?? 100),
    offset: Number(sp.get("offset") ?? 0),
    kind: sp.get("kind") ?? undefined,
    search: sp.get("q") ?? undefined,
  });
  return NextResponse.json({ total, count: rows.length, whales: rows });
}
