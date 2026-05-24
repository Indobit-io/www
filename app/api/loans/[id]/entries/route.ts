import { NextResponse } from "next/server";
import { getEntries, upsertEntry, deleteEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entries = await getEntries(Number(id));
  return NextResponse.json(entries);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { month_number, entry_date, xrp_price_idr, xrp_qty_held, notes } = body;

  if (!month_number || !entry_date || !xrp_price_idr || xrp_qty_held == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry = await upsertEntry(Number(id), {
    month_number: Number(month_number),
    entry_date,
    xrp_price_idr: Number(xrp_price_idr),
    xrp_qty_held: Number(xrp_qty_held),
    notes: notes ?? null,
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { month_number } = await req.json();
  await deleteEntry(Number(id), Number(month_number));
  return NextResponse.json({ ok: true });
}
