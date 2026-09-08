import { NextResponse, type NextRequest } from "next/server";
import { getWhale, hasDatabase, recentTransfers, setWhaleLabel, whaleTokenBreakdown } from "@/lib/db";
import { WHALE_WINDOW_DAYS } from "@/lib/ingest";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ address: string }> }) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const { address } = await ctx.params;
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Not a 20-byte hex address" }, { status: 400 });
  }
  const whale = await getWhale(address);
  if (!whale) return NextResponse.json({ error: "Address is not in the tracked set" }, { status: 404 });

  const [tokens, transfers] = await Promise.all([
    whaleTokenBreakdown(address, WHALE_WINDOW_DAYS),
    recentTransfers({ address, limit: 100 }),
  ]);
  return NextResponse.json({ whale, tokens, transfers });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ address: string }> }) {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  const { address } = await ctx.params;
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Not a 20-byte hex address" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { label?: unknown };
  const raw = typeof body.label === "string" ? body.label.trim() : "";
  await setWhaleLabel(address, raw ? raw.slice(0, 80) : null);
  return NextResponse.json({ ok: true, address: address.toLowerCase(), label: raw || null });
}
