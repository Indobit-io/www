"use client";

import Link from "next/link";
import { idr, pct, pnlColor } from "@/lib/fmt";
import type { LoanScheduleRow } from "@/lib/calc";

interface Props {
  rows: LoanScheduleRow[];
  loanId: number;
}

export function MonthlyTable({ rows, loanId }: Props) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-cmc-border text-xs font-semibold text-cmc-text-muted uppercase tracking-wide">
            <th className="text-left py-3 pr-3 whitespace-nowrap">Bln</th>
            <th className="text-left py-3 pr-3 whitespace-nowrap">Periode</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Harga XRP</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Nilai Portfolio</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Return</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Net P&L</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Sisa Hutang</th>
            <th className="text-right py-3">Bayar/Bln</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasPast = row.xrpPriceIdr != null;
            return (
              <tr
                key={row.monthNumber}
                className="border-b border-cmc-border/50 hover:bg-cmc-surface-2/50 transition-colors"
              >
                <td className="py-3 pr-3 text-cmc-text-muted text-xs">{row.monthNumber}</td>
                <td className="py-3 pr-3 text-cmc-text-secondary whitespace-nowrap">{row.monthLabel}</td>
                <td className="py-3 pr-3 text-right">
                  {hasPast ? (
                    <span className="text-cmc-text font-medium">{idr(row.xrpPriceIdr)}</span>
                  ) : (
                    <Link
                      href={`/loans/${loanId}/entry?month=${row.monthNumber}`}
                      className="text-cmc-blue hover:text-blue-400 transition-colors text-xs font-medium"
                    >
                      + Catat
                    </Link>
                  )}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-text">
                  {hasPast ? idr(row.portfolioValueIdr) : <span className="text-cmc-border">—</span>}
                </td>
                <td className={`py-3 pr-3 text-right font-medium ${pnlColor(row.monthlyReturn)}`}>
                  {row.monthlyReturn != null ? pct(row.monthlyReturn) : <span className="text-cmc-border">—</span>}
                </td>
                <td className={`py-3 pr-3 text-right font-semibold ${pnlColor(row.netPnl)}`}>
                  {row.netPnl != null ? idr(row.netPnl, true) : <span className="text-cmc-border">—</span>}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-text-secondary">
                  {idr(row.remainingPrincipal, true)}
                </td>
                <td className="py-3 text-right text-cmc-yellow font-medium">
                  {idr(row.totalPayment, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-cmc-border text-xs text-cmc-text-muted">
            <td colSpan={7} className="py-2.5 pr-3 font-semibold uppercase tracking-wide">Total Bunga</td>
            <td className="py-2.5 text-right text-cmc-red font-semibold">
              {idr(rows[0]?.interestPayment ? rows[0].interestPayment * rows.length : 0, true)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
