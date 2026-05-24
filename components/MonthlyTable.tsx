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
      <table className="w-full font-mono text-[10px] border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-terminal-border text-terminal-text-muted text-[9px] tracking-widest">
            <th className="text-left py-2 pr-3 whitespace-nowrap">BLN</th>
            <th className="text-left py-2 pr-3 whitespace-nowrap">PERIODE</th>
            <th className="text-right py-2 pr-3 whitespace-nowrap">HARGA XRP</th>
            <th className="text-right py-2 pr-3 whitespace-nowrap">NILAI PORTOFOLIO</th>
            <th className="text-right py-2 pr-3 whitespace-nowrap">RETURN</th>
            <th className="text-right py-2 pr-3 whitespace-nowrap">NET P&L</th>
            <th className="text-right py-2 pr-3 whitespace-nowrap">SISA HUTANG</th>
            <th className="text-right py-2">BAYAR/BLN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasPast = row.xrpPriceIdr != null;
            return (
              <tr
                key={row.monthNumber}
                className="border-b border-terminal-border/40 hover:bg-terminal-surface/50 transition-colors"
              >
                <td className="py-2 pr-3 text-terminal-text-muted">{row.monthNumber}</td>
                <td className="py-2 pr-3 text-terminal-text-dim whitespace-nowrap">{row.monthLabel}</td>
                <td className="py-2 pr-3 text-right">
                  {hasPast ? (
                    <span className="text-terminal-green">
                      {idr(row.xrpPriceIdr)}
                    </span>
                  ) : (
                    <Link
                      href={`/loans/${loanId}/entry?month=${row.monthNumber}`}
                      className="text-terminal-text-muted hover:text-terminal-green transition-colors underline underline-offset-2"
                    >
                      + catat
                    </Link>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  {hasPast ? idr(row.portfolioValueIdr) : <span className="text-terminal-border">—</span>}
                </td>
                <td className={`py-2 pr-3 text-right ${pnlColor(row.monthlyReturn)}`}>
                  {row.monthlyReturn != null ? pct(row.monthlyReturn) : <span className="text-terminal-border">—</span>}
                </td>
                <td className={`py-2 pr-3 text-right font-bold ${pnlColor(row.netPnl)}`}>
                  {row.netPnl != null ? idr(row.netPnl, true) : <span className="text-terminal-border">—</span>}
                </td>
                <td className="py-2 pr-3 text-right text-terminal-text-dim">
                  {idr(row.remainingPrincipal, true)}
                </td>
                <td className="py-2 text-right text-terminal-amber">
                  {idr(row.totalPayment, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-terminal-border text-terminal-text-muted text-[9px]">
            <td colSpan={7} className="py-2 pr-3">TOTAL BUNGA</td>
            <td className="py-2 text-right text-terminal-red">
              {idr(rows[0]?.interestPayment ? rows[0].interestPayment * rows.length : 0, true)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
