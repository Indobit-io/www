import Link from "next/link";
import { idr, pct, pnlColor } from "@/lib/fmt";
import type { Loan } from "@/lib/db";
import type { LoanSummary } from "@/lib/calc";

interface Props {
  loan: Loan;
  summary: LoanSummary;
}

export function LoanCard({ loan, summary }: Props) {
  const progressPct = Math.round((summary.monthsElapsed / loan.term_months) * 100);

  return (
    <Link href={`/loans/${loan.id}`}>
      <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4 hover:border-terminal-green-muted transition-colors cursor-pointer space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-0.5">
              {loan.asset} LOAN
            </div>
            <h2 className="font-mono text-sm font-bold text-terminal-green tracking-wide">
              {loan.name}
            </h2>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-xs font-bold text-terminal-text-dim">
              {idr(loan.principal_idr, true)}
            </div>
            <div className="font-mono text-[9px] text-terminal-text-muted">
              {loan.term_months} bulan · {(Number(loan.monthly_interest_rate) * 100).toFixed(0)}%/bln
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between font-mono text-[9px] text-terminal-text-muted mb-1">
            <span>Bulan {summary.monthsElapsed}/{loan.term_months}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1 bg-terminal-border rounded-full overflow-hidden">
            <div
              className="h-full bg-terminal-green rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <div className="font-mono text-[9px] text-terminal-text-muted mb-0.5">NILAI</div>
            <div className="font-mono text-xs font-bold text-terminal-green">
              {idr(summary.currentPortfolioValue, true)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-terminal-text-muted mb-0.5">NET P&L</div>
            <div className={`font-mono text-xs font-bold ${pnlColor(summary.netPnl)}`}>
              {idr(summary.netPnl, true)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-terminal-text-muted mb-0.5">ROI</div>
            <div className={`font-mono text-xs font-bold ${pnlColor(summary.roi)}`}>
              {pct(summary.roi)}
            </div>
          </div>
        </div>

        {/* Break-even price */}
        {summary.breakEvenPriceIdr != null && summary.currentXrpPrice != null && (
          <div className="flex items-center justify-between font-mono text-[9px] pt-1 border-t border-terminal-border/40">
            <span className="text-terminal-text-muted">Break-even</span>
            <span className={
              summary.currentXrpPrice >= summary.breakEvenPriceIdr
                ? "text-terminal-green font-bold"
                : "text-terminal-amber"
            }>
              {idr(summary.breakEvenPriceIdr)} / XRP
              {summary.currentXrpPrice >= summary.breakEvenPriceIdr
                ? " ✓ AMAN"
                : ` (masih ${pct(((summary.breakEvenPriceIdr - summary.currentXrpPrice) / summary.currentXrpPrice) * 100)} lagi)`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
