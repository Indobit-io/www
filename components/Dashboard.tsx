"use client";

import { idr } from "@/lib/fmt";
import type { Position } from "@/lib/db";
import { valueAtPrice, type PositionSummary } from "@/lib/calc";
import { PositionCard } from "./PositionCard";
import { useXrpPrice } from "./useXrpPrice";

interface Props {
  items: { position: Position; summary: PositionSummary }[];
  initialXrpPrice: number | null;
}

export function Dashboard({ items, initialXrpPrice }: Props) {
  const { price } = useXrpPrice(initialXrpPrice);

  const withLive = items.map(({ position, summary }) => ({
    position,
    summary,
    live: price != null ? valueAtPrice(summary, position.buy_price_idr, price) : null,
  }));

  const totals = withLive.reduce(
    (acc, { summary, live }) => ({
      cost: acc.cost + summary.purchaseCost,
      cash: acc.cash + summary.cashIdr,
      value: acc.value + summary.cashIdr + (live?.cryptoValueIdr ?? 0),
    }),
    { cost: 0, cash: 0, value: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Aggregate summary */}
      {withLive.length > 1 && (
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-4 grid grid-cols-3 gap-4">
          {[
            { label: "Total Modal", value: idr(totals.cost, true), color: "text-cmc-text" },
            { label: "Total Cash", value: idr(totals.cash, true), color: "text-cmc-yellow" },
            {
              label: "Total Nilai",
              value: price != null ? idr(totals.value, true) : "—",
              color: "text-cmc-green",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
              <div className={`text-sm font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {withLive.map(({ position, summary, live }) => (
          <PositionCard key={position.id} position={position} summary={summary} live={live} />
        ))}
      </div>
    </div>
  );
}
