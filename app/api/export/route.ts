import { NextResponse } from "next/server";
import { getPositions, getAllSales, getAllTargets } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") ?? "json";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    // Flat sales ledger: one row per executed batch, P/L included
    const sales = await getAllSales();
    const header = [
      "posisi", "aset", "batch", "tanggal_jual", "harga_beli_idr",
      "harga_jual_idr", "qty_dijual", "cash_masuk_idr", "pnl_idr", "catatan",
    ];
    const lines = sales.map((s) => {
      const proceeds = s.xrp_qty_sold * s.sell_price_idr;
      const pnl = proceeds - s.xrp_qty_sold * s.buy_price_idr;
      return [
        s.position_name, s.asset, s.batch_number,
        new Date(s.sale_date).toISOString().slice(0, 10), s.buy_price_idr,
        s.sell_price_idr, s.xrp_qty_sold, Math.round(proceeds), Math.round(pnl),
        s.notes,
      ].map(csvCell).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="penjualan-${stamp}.csv"`,
      },
    });
  }

  // Full JSON backup
  const [positions, sales, targets] = await Promise.all([
    getPositions(), getAllSales(), getAllTargets(),
  ]);
  return new NextResponse(
    JSON.stringify({ exported_at: new Date().toISOString(), positions, sales, targets }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="crypto-sell-tracker-${stamp}.json"`,
      },
    }
  );
}
