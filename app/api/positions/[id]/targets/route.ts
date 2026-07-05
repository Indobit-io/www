import { NextResponse } from "next/server";
import { getPosition, getTargets, upsertTarget, deleteTarget } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const targets = await getTargets(Number(id));
  return NextResponse.json(targets);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const positionId = Number(id);
  const body = await req.json();
  const batchNumber = Number(body.batch_number);
  const targetPrice = Number(body.target_price_idr);

  if (!batchNumber || !targetPrice || targetPrice <= 0) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const position = await getPosition(positionId);
  if (!position) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (batchNumber < 1 || batchNumber > position.total_batches) {
    return NextResponse.json(
      { error: `Batch harus antara 1 dan ${position.total_batches}` },
      { status: 400 }
    );
  }

  const target = await upsertTarget(positionId, batchNumber, targetPrice);
  return NextResponse.json(target, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { batch_number } = await req.json();
  await deleteTarget(Number(id), Number(batch_number));
  return NextResponse.json({ ok: true });
}
