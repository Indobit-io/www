"use client";

import Link from "next/link";
import { idr, xrp, pct, pnlColor, date } from "@/lib/fmt";
import type { BatchRow } from "@/lib/calc";

interface Props {
  rows: BatchRow[];
  positionId: number;
}

export function BatchTable({ rows, positionId }: Props) {
  const totalProceeds = rows.reduce((s, r) => s + (r.proceedsIdr ?? 0), 0);
  const totalPnl = rows.reduce((s, r) => s + (r.pnlIdr ?? 0), 0);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-cmc-border text-xs font-semibold text-cmc-text-muted uppercase tracking-wide">
            <th className="text-left py-3 pr-3 whitespace-nowrap">Batch</th>
            <th className="text-left py-3 pr-3 whitespace-nowrap">Tanggal</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Harga Jual</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">XRP Dijual</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Cash Masuk</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">P/L</th>
            <th className="text-right py-3 whitespace-nowrap">Sisa XRP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const sold = row.saleId != null;
            return (
              <tr
                key={row.batchNumber}
                className="border-b border-cmc-border/50 hover:bg-cmc-surface-2/50 transition-colors"
              >
                <td className="py-3 pr-3 text-cmc-text-muted text-xs">{row.batchNumber}</td>
                <td className="py-3 pr-3 text-cmc-text-secondary whitespace-nowrap">
                  {sold ? date(row.saleDate) : <span className="text-cmc-border">—</span>}
                </td>
                <td className="py-3 pr-3 text-right">
                  {sold ? (
                    <span className="text-cmc-text font-medium">{idr(row.sellPriceIdr)}</span>
                  ) : (
                    <Link
                      href={`/positions/${positionId}/sell?batch=${row.batchNumber}`}
                      className="text-cmc-blue hover:text-blue-400 transition-colors text-xs font-medium"
                    >
                      + Jual
                    </Link>
                  )}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-text">
                  {sold ? (
                    xrp(row.qtySold, 0)
                  ) : row.suggestedQty != null ? (
                    <span className="text-cmc-text-muted text-xs">≈ {xrp(row.suggestedQty, 0)}</span>
                  ) : (
                    <span className="text-cmc-border">—</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-yellow font-medium">
                  {sold ? idr(row.proceedsIdr, true) : <span className="text-cmc-border">—</span>}
                </td>
                <td className={`py-3 pr-3 text-right font-semibold ${pnlColor(row.pnlIdr)}`}>
                  {sold ? (
                    <>
                      {idr(row.pnlIdr, true)}
                      {row.pnlPct != null && (
                        <span className="ml-1 text-xs font-medium">{pct(row.pnlPct)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-cmc-border">—</span>
                  )}
                </td>
                <td className="py-3 text-right text-cmc-text-secondary">
                  {sold ? xrp(row.qtyRemainingAfter, 0) : <span className="text-cmc-border">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-cmc-border text-xs">
            <td colSpan={4} className="py-2.5 pr-3 font-semibold uppercase tracking-wide text-cmc-text-muted">
              Total Terjual
            </td>
            <td className="py-2.5 pr-3 text-right text-cmc-yellow font-semibold">
              {idr(totalProceeds, true)}
            </td>
            <td className={`py-2.5 pr-3 text-right font-semibold ${pnlColor(totalPnl)}`}>
              {idr(totalPnl, true)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
