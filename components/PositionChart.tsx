"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { BatchRow } from "@/lib/calc";

interface Props {
  rows: BatchRow[];
  purchaseCost: number;
}

function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}jt`;
  return `${(v / 1_000).toFixed(2)}k`;
}

function TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; stroke?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-cmc-surface-2 border border-cmc-border px-3 py-2.5 rounded-xl text-xs space-y-1.5 shadow-xl">
      <div className="text-cmc-text-muted font-medium mb-2">Batch {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color ?? p.stroke }} className="font-medium">{p.name}</span>
          <span className="text-cmc-text font-semibold">
            Rp {Number(p.value).toLocaleString("id-ID")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PositionChart({ rows, purchaseCost }: Props) {
  // One point per executed sale: cash accumulated + crypto valued at that batch's sell price
  const data = rows
    .filter((r) => r.saleId != null)
    .map((r) => {
      const cryptoValue = r.qtyRemainingAfter * (r.sellPriceIdr ?? 0);
      return {
        batch: String(r.batchNumber),
        "Cash": r.cumulativeCashIdr,
        "Nilai Kripto": cryptoValue,
        "Total": r.cumulativeCashIdr + cryptoValue,
      };
    });

  if (data.length < 1) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-cmc-text-muted border border-dashed border-cmc-border rounded-xl">
        Belum ada penjualan
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="batch"
          tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
          axisLine={{ stroke: "#21262d" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<TooltipContent />} />
        <ReferenceLine y={purchaseCost} stroke="#21262d" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="Cash"
          stroke="#f0b90b"
          fill="#f0b90b18"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Nilai Kripto"
          stroke="#16c784"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="2 4"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Total"
          stroke="#3861fb"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#3861fb", stroke: "#161b22", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
