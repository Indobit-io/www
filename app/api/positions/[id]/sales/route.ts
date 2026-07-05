import { NextResponse } from "next/server";
import { getPosition, getSales, upsertSale, deleteSale } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sales = await getSales(Number(id));
  return NextResponse.json(sales);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const positionId = Number(id);
  const body = await req.json();
  const { batch_number, sale_date, sell_price_idr, xrp_qty_sold, notes } = body;

  if (!batch_number || !sale_date || !sell_price_idr || xrp_qty_sold == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const position = await getPosition(positionId);
  if (!position) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (Number(batch_number) < 1 || Number(batch_number) > position.total_batches) {
    return NextResponse.json(
      { error: `Batch harus antara 1 dan ${position.total_batches}` },
      { status: 400 }
    );
  }

  // Selling more than what's left (excluding this batch, since upsert may replace it) is invalid.
  const sales = await getSales(positionId);
  const soldElsewhere = sales
    .filter((s) => s.batch_number !== Number(batch_number))
    .reduce((sum, s) => sum + s.xrp_qty_sold, 0);
  const available = position.xrp_qty - soldElsewhere;
  if (Number(xrp_qty_sold) > available + 1e-9) {
    return NextResponse.json(
      { error: `Jumlah melebihi sisa XRP (${available})` },
      { status: 400 }
    );
  }

  const sale = await upsertSale(positionId, {
    batch_number: Number(batch_number),
    sale_date,
    sell_price_idr: Number(sell_price_idr),
    xrp_qty_sold: Number(xrp_qty_sold),
    notes: notes ?? null,
  });

  return NextResponse.json(sale, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { batch_number } = await req.json();
  await deleteSale(Number(id), Number(batch_number));
  return NextResponse.json({ ok: true });
}
