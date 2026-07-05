"use client";

import { idr, xrp, pct } from "@/lib/fmt";
import type { PositionSummary } from "@/lib/calc";
import { useXrpPrice } from "./useXrpPrice";

interface Props {
  summary: PositionSummary;
  totalBatches: number;
  initialXrpPrice: number | null;
}

function Metric({ label, value, color, sub }: {
  label: string; value: string; color: string; sub?: string;
}) {
  return (
    <div>
      <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
      <div className={`font-bold text-sm ${color}`}>{value}</div>
      {sub && <div className="text-xs text-cmc-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function SellProgress({ summary, totalBatches, initialXrpPrice }: Props) {
  const { price: currentXrpPrice } = useXrpPrice(initialXrpPrice);

  const isBelowBreakEven =
    currentXrpPrice != null &&
    summary.breakEvenPriceIdr != null &&
    currentXrpPrice < summary.breakEvenPriceIdr;

  return (
    <div
      className="border rounded-2xl p-5"
      style={{
        borderColor: isBelowBreakEven ? "#f0b90b30" : "#16c78430",
        background: isBelowBreakEven ? "#f0b90b08" : "#16c78408",
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
        Progress Penjualan
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Metric label="Harga XRP Saat Ini" value={idr(currentXrpPrice)} color="text-cmc-green" />
        <Metric
          label="Break-Even Sisa XRP"
          value={summary.breakEvenPriceIdr != null ? idr(summary.breakEvenPriceIdr) : "Modal balik ✓"}
          color={
            summary.breakEvenPriceIdr == null
              ? "text-cmc-green"
              : currentXrpPrice != null && currentXrpPrice >= summary.breakEvenPriceIdr
                ? "text-cmc-green"
                : "text-cmc-yellow"
          }
        />
        <Metric
          label="Rata-rata Harga Jual"
          value={idr(summary.avgSellPriceIdr)}
          color="text-cmc-yellow"
          sub={`${xrp(summary.qtySold, 0)} terjual`}
        />
        <Metric
          label="Progress"
          value={`Batch ${summary.batchesSold}/${totalBatches}`}
          color="text-cmc-text-secondary"
          sub={`sisa ${xrp(summary.qtyRemaining, 0)}`}
        />
      </div>

      <div className="mt-4">
        <div className="h-1.5 bg-cmc-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(summary.batchesSold / totalBatches) * 100}%`,
              background: isBelowBreakEven ? "#f0b90b" : "#16c784",
            }}
          />
        </div>
      </div>

      {summary.breakEvenPriceIdr != null && currentXrpPrice != null && (
        <p className="text-xs text-cmc-text-muted mt-3 leading-relaxed">
          {currentXrpPrice >= summary.breakEvenPriceIdr
            ? `✓ Jika sisa XRP dijual di harga sekarang, seluruh modal beli sudah kembali.`
            : `Sisa XRP perlu dijual rata-rata di ${idr(summary.breakEvenPriceIdr)} (naik ${pct(((summary.breakEvenPriceIdr - currentXrpPrice) / currentXrpPrice) * 100)}) agar modal beli kembali penuh.`}
        </p>
      )}
      {summary.breakEvenPriceIdr == null && summary.qtySold > 0 && (
        <p className="text-xs text-cmc-text-muted mt-3 leading-relaxed">
          ✓ Cash dari penjualan sudah menutup seluruh modal beli. Sisa XRP adalah profit murni.
        </p>
      )}
    </div>
  );
}
