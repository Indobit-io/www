"use client";

import { idr, xrp, pct, pnlColor } from "@/lib/fmt";
import { useXrpPrice } from "./useXrpPrice";

interface Props {
  qtyRemaining: number;
  cashIdr: number;
  realizedPnl: number;
  purchaseCost: number;
  buyPriceIdr: number;
  initialXrpPrice: number | null;
}

function Metric({ label, value, color, sub, large }: {
  label: string; value: string; color: string; sub?: string; large?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
      <div className={`font-bold ${large ? "text-lg" : "text-sm"} ${color}`}>{value}</div>
      {sub && <div className="text-xs text-cmc-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function LiveStatus({
  qtyRemaining, cashIdr, realizedPnl, purchaseCost, buyPriceIdr, initialXrpPrice,
}: Props) {
  const { price: xrpPrice, polledAt, error } = useXrpPrice(initialXrpPrice);

  const cryptoValue = xrpPrice != null ? xrpPrice * qtyRemaining : null;
  const totalValue = cryptoValue != null ? cashIdr + cryptoValue : null;
  const unrealizedPnl = xrpPrice != null ? qtyRemaining * (xrpPrice - buyPriceIdr) : null;
  const totalPnl = unrealizedPnl != null ? realizedPnl + unrealizedPnl : null;
  const roi =
    totalPnl != null && purchaseCost > 0 ? (totalPnl / purchaseCost) * 100 : null;

  return (
    <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted">
          Status Terkini
        </div>
        <div className="flex items-center gap-1.5 text-xs text-cmc-text-muted">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${error ? "bg-cmc-red" : "bg-cmc-green animate-pulse"}`} />
          <span>{error ? "Offline" : "Live"}</span>
          {polledAt && !error && (
            <span className="opacity-50">· {polledAt.toLocaleTimeString("id-ID")}</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Metric
          label="Total Portofolio (live)"
          value={idr(totalValue)}
          color="text-cmc-text"
          sub={`modal ${idr(purchaseCost, true)}`}
          large
        />
        <Metric
          label="Total P/L (live)"
          value={idr(totalPnl, true)}
          color={pnlColor(totalPnl)}
          sub={pct(roi)}
          large
        />
        <Metric label="Cash (hasil jual)" value={idr(cashIdr, true)} color="text-cmc-yellow" />
        <Metric label="Nilai Kripto (live)" value={idr(cryptoValue, true)} color="text-cmc-green" />
        <Metric
          label="Realized P/L"
          value={idr(realizedPnl, true)}
          color={pnlColor(realizedPnl)}
        />
        <Metric
          label="Unrealized P/L (live)"
          value={idr(unrealizedPnl, true)}
          color={pnlColor(unrealizedPnl)}
          sub={xrp(qtyRemaining)}
        />
      </div>
    </div>
  );
}
