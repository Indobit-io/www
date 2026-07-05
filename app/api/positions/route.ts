import { NextResponse } from "next/server";
import { getPositions, createPosition } from "@/lib/db";
import { isSupportedAsset } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  const positions = await getPositions();
  return NextResponse.json(positions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    name, asset = "XRP", xrp_qty, buy_price_idr, total_batches = 6,
    start_date, notes,
  } = body;

  if (!name || !xrp_qty || !buy_price_idr || !start_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (Number(total_batches) < 1) {
    return NextResponse.json({ error: "total_batches must be at least 1" }, { status: 400 });
  }
  if (!isSupportedAsset(asset)) {
    return NextResponse.json({ error: `Aset tidak didukung: ${asset}` }, { status: 400 });
  }

  const position = await createPosition({
    name,
    asset,
    xrp_qty: Number(xrp_qty),
    buy_price_idr: Number(buy_price_idr),
    total_batches: Number(total_batches),
    start_date,
    notes: notes ?? null,
  });

  return NextResponse.json(position, { status: 201 });
}
