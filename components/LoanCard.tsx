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
  const isPositive = summary.netPnl != null && summary.netPnl >= 0;
  const isNegative = summary.netPnl != null && summary.netPnl < 0;

  return (
    <Link href={`/loans/${loan.id}`}>
      <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5 hover:border-cmc-blue/50 transition-all duration-200 cursor-pointer space-y-4 group">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-cmc-text-muted mb-1">
              {loan.asset} · {loan.term_months} bulan · {(Number(loan.monthly_interest_rate) * 100).toFixed(0)}%/bln
            </div>
            <h2 className="text-base font-semibold text-cmc-text group-hover:text-white transition-colors">
              {loan.name}
            </h2>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-cmc-text">
              {idr(loan.principal_idr, true)}
            </div>
            <div className="text-xs text-cmc-text-muted mt-0.5">pokok pinjaman</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-cmc-text-muted mb-1.5">
            <span>Bulan {summary.monthsElapsed} / {loan.term_months}</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-cmc-border rounded-full overflow-hidden">
            <div
              className="h-full bg-cmc-blue rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div>
            <div className="text-xs text-cmc-text-muted mb-0.5">Nilai</div>
            <div className="text-sm font-bold text-cmc-text">
              {idr(summary.currentPortfolioValue, true)}
            </div>
          </div>
          <div>
            <div className="text-xs text-cmc-text-muted mb-0.5">Net P&L</div>
            <div className={`text-sm font-bold ${pnlColor(summary.netPnl)}`}>
              {idr(summary.netPnl, true)}
            </div>
          </div>
          <div>
            <div className="text-xs text-cmc-text-muted mb-0.5">ROI</div>
            <div className={`text-sm font-bold ${pnlColor(summary.roi)}`}>
              {pct(summary.roi)}
            </div>
          </div>
        </div>

        {/* Break-even row */}
        {summary.breakEvenPriceIdr != null && summary.currentXrpPrice != null && (
          <div className="flex items-center justify-between text-xs pt-3 border-t border-cmc-border">
            <span className="text-cmc-text-muted">Break-even XRP</span>
            <span className={`font-semibold ${summary.currentXrpPrice >= summary.breakEvenPriceIdr ? "text-cmc-green" : "text-cmc-yellow"}`}>
              {idr(summary.breakEvenPriceIdr)}
              {summary.currentXrpPrice >= summary.breakEvenPriceIdr
                ? " ✓"
                : ` (${pct(((summary.breakEvenPriceIdr - summary.currentXrpPrice) / summary.currentXrpPrice) * 100)} lagi)`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
