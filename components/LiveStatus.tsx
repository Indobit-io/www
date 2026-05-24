"use client";

import { useState, useEffect } from "react";
import { idr, xrp, pct, pnlColor } from "@/lib/fmt";

interface Props {
  xrpQty: number;
  remainingPrincipal: number;
  realizedPnl: number | null;
  roi: number | null;
  totalPaidSoFar: number;
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

export function LiveStatus({ xrpQty, remainingPrincipal, realizedPnl, roi, totalPaidSoFar, initialXrpPrice }: Props) {
  const [xrpPrice, setXrpPrice] = useState<number | null>(initialXrpPrice);
  const [polledAt, setPolledAt] = useState<Date | null>(null);

  useEffect(() => {
    function poll() {
      fetch("/api/xrp-price", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          setPolledAt(new Date());
          if (data.idr) setXrpPrice(data.idr);
        })
        .catch(() => {});
    }

    poll(); // fetch immediately on mount
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const portfolioValue = xrpPrice != null ? xrpPrice * xrpQty : null;
  const netPosition = portfolioValue != null ? portfolioValue - remainingPrincipal : null;

  return (
    <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted">
          Status Terkini
        </div>
        <div className="flex items-center gap-1.5 text-xs text-cmc-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-cmc-green animate-pulse inline-block" />
          <span>Live</span>
          {polledAt && (
            <span className="text-cmc-text-muted/60">
              · {polledAt.toLocaleTimeString("id-ID")}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Metric label="Nilai Portfolio (live)" value={idr(portfolioValue)} color="text-cmc-green" large />
        <Metric label="Realized P&L" value={idr(realizedPnl, true)} color={pnlColor(realizedPnl)} sub={pct(roi)} large />
        <Metric label="Sisa Hutang" value={idr(remainingPrincipal, true)} color="text-cmc-red" />
        <Metric label="Total Dibayar" value={idr(totalPaidSoFar, true)} color="text-cmc-yellow" />
        <Metric label="Posisi vs Hutang" value={idr(netPosition, true)} color={pnlColor(netPosition)} />
        <Metric label="XRP Dipegang" value={xrp(xrpQty)} color="text-cmc-text-secondary" />
      </div>
    </div>
  );
}
