import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase, listTokens } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const trackedOnly = req.nextUrl.searchParams.get("tracked") !== "0";
  const tokens = await listTokens({ trackedOnly });
  return NextResponse.json({ count: tokens.length, tokens });
}
