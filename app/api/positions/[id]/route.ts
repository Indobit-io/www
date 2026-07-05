import { NextResponse } from "next/server";
import { getPosition, getSales, updatePosition, deletePosition, type Position } from "@/lib/db";
import { isSupportedAsset } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await getPosition(Number(id));
  if (!position) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(position);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const positionId = Number(id);
  const body = await req.json();

  // Only whitelisted columns may be updated — body keys are interpolated
  // into the SQL SET clause in updatePosition.
  const patch: Partial<Omit<Position, "id" | "created_at">> = {};
  if (body.name != null) {
    if (!String(body.name).trim()) {
      return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    }
    patch.name = String(body.name);
  }
  if (body.asset != null) {
    if (!isSupportedAsset(body.asset)) {
      return NextResponse.json({ error: `Aset tidak didukung: ${body.asset}` }, { status: 400 });
    }
    patch.asset = body.asset;
  }
  if (body.xrp_qty != null) {
    const v = Number(body.xrp_qty);
    if (!(v > 0)) return NextResponse.json({ error: "Jumlah koin harus > 0" }, { status: 400 });
    patch.xrp_qty = v;
  }
  if (body.buy_price_idr != null) {
    const v = Number(body.buy_price_idr);
    if (!(v > 0)) return NextResponse.json({ error: "Harga beli harus > 0" }, { status: 400 });
    patch.buy_price_idr = v;
  }
  if (body.total_batches != null) {
    const v = Number(body.total_batches);
    if (!Number.isInteger(v) || v < 1) {
      return NextResponse.json({ error: "Jumlah batch minimal 1" }, { status: 400 });
    }
    patch.total_batches = v;
  }
  if (body.start_date != null) patch.start_date = String(body.start_date);
  if ("notes" in body) patch.notes = body.notes ? String(body.notes) : null;

  const existing = await getPosition(positionId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sales = await getSales(positionId);

  // Shrinking the plan below already-sold batches would orphan sales rows
  if (patch.total_batches != null && sales.length > 0) {
    const maxSoldBatch = Math.max(...sales.map((s) => s.batch_number));
    if (patch.total_batches < maxSoldBatch) {
      return NextResponse.json(
        { error: `Batch ${maxSoldBatch} sudah terjual — jumlah batch minimal ${maxSoldBatch}` },
        { status: 400 }
      );
    }
  }

  // Shrinking qty below what's already sold would make remaining negative
  if (patch.xrp_qty != null) {
    const qtySold = sales.reduce((s, sale) => s + sale.xrp_qty_sold, 0);
    if (patch.xrp_qty < qtySold) {
      return NextResponse.json(
        { error: `Sudah terjual ${qtySold} — jumlah beli tidak boleh lebih kecil` },
        { status: 400 }
      );
    }
  }

  const position = await updatePosition(positionId, patch);
  return NextResponse.json(position);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePosition(Number(id));
  return NextResponse.json({ ok: true });
}
