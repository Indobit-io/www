import { NextResponse } from "next/server";
import { getLoans, createLoan } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const loans = await getLoans();
  return NextResponse.json(loans);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    name, principal_idr, term_months, start_date,
    xrp_qty, xrp_buy_price_idr, notes,
    monthly_interest_rate = 0.02,
  } = body;

  if (!name || !principal_idr || !term_months || !start_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const loan = await createLoan({
    name,
    asset: "XRP",
    principal_idr: Number(principal_idr),
    monthly_interest_rate: Number(monthly_interest_rate),
    term_months: Number(term_months),
    start_date,
    xrp_qty: Number(xrp_qty ?? 0),
    xrp_buy_price_idr: xrp_buy_price_idr ? Number(xrp_buy_price_idr) : null,
    notes: notes ?? null,
  });

  return NextResponse.json(loan, { status: 201 });
}
