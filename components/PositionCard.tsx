import Link from "next/link";
import { idr, qty, pct, pnlColor } from "@/lib/fmt";
import type { Position } from "@/lib/db";
import type { PositionSummary, LiveValuation } from "@/lib/calc";

interface Props {
  position: Position;
  summary: PositionSummary;
  live: LiveValuation | null;
}

export function PositionCard({ position, summary, live }: Props) {
  const progressPct = Math.round((summary.batchesSold / position.total_batches) * 100);

  return (
    <Link href={`/positions/${position.id}`}>
      <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5 hover:border-cmc-blue/50 transition-all duration-200 cursor-pointer space-y-4 group">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-cmc-text-muted mb-1">
              {qty(position.xrp_qty, 0, position.asset)} @ {idr(position.buy_price_idr)}
            </div>
            <h2 className="text-base font-semibold text-cmc-text group-hover:text-white transition-colors">
              {position.name}
            </h2>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-cmc-text">
              {idr(summary.purchaseCost, true)}
            </div>
            <div className="text-xs text-cmc-text-muted mt-0.5">modal beli</div>
          </div>
        </div>

        {/* Sell progress */}
        <div>
          <div className="flex justify-between text-xs text-cmc-text-muted mb-1.5">
            <span>Batch {summary.batchesSold} / {position.total_batches} terjual</span>
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
            <div className="text-xs text-cmc-text-muted mb-0.5">Cash</div>
            <div className="text-sm font-bold text-cmc-yellow">
              {idr(summary.cashIdr, true)}
            </div>
          </div>
          <div>
            <div className="text-xs text-cmc-text-muted mb-0.5">Nilai Kripto</div>
            <div className="text-sm font-bold text-cmc-green">
              {live ? idr(live.cryptoValueIdr, true) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-cmc-text-muted mb-0.5">Total P/L</div>
            <div className={`text-sm font-bold ${pnlColor(live?.totalPnl ?? summary.realizedPnl)}`}>
              {live ? idr(live.totalPnl, true) : idr(summary.realizedPnl, true)}
              {live?.roiPct != null && (
                <span className="ml-1 text-xs font-medium">{pct(live.roiPct)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Break-even row */}
        {summary.breakEvenPriceIdr != null && (
          <div className="flex items-center justify-between text-xs pt-3 border-t border-cmc-border">
            <span className="text-cmc-text-muted">Break-even sisa {position.asset}</span>
            <span className="font-semibold text-cmc-text-secondary">
              {idr(summary.breakEvenPriceIdr)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
