"use client";

import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { MonthlyPnl } from "@/lib/analytics";

interface Props {
  monthly: MonthlyPnl[];
}

function fmtAxis(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

function TooltipContent({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: MonthlyPnl }>;
}) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="bg-cmc-surface-2 border border-cmc-border px-3 py-2.5 rounded-xl text-xs space-y-1.5 shadow-xl">
      <div className="text-cmc-text-muted font-medium">{fmtMonth(m.month)}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-cmc-text-muted">Realized P/L</span>
        <span className={`font-semibold ${m.realizedPnl >= 0 ? "text-cmc-green" : "text-cmc-red"}`}>
          Rp {Math.round(m.realizedPnl).toLocaleString("id-ID")}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-cmc-text-muted">Cash masuk</span>
        <span className="text-cmc-yellow font-semibold">
          Rp {Math.round(m.proceeds).toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
}

export function MonthlyPnlChart({ monthly }: Props) {
  if (monthly.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-cmc-text-muted border border-dashed border-cmc-border rounded-xl">
        Belum ada penjualan
      </div>
    );
  }

  const data = monthly.map((m) => ({ ...m, label: fmtMonth(m.month) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
          axisLine={{ stroke: "#21262d" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtAxis}
          tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "#1c223080" }} />
        <ReferenceLine y={0} stroke="#21262d" />
        <Bar dataKey="realizedPnl" name="Realized P/L" maxBarSize={28} isAnimationActive={false}>
          {data.map((m) => (
            <Cell
              key={m.month}
              fill={m.realizedPnl >= 0 ? "#16c784" : "#ea3943"}
              radius={
                (m.realizedPnl >= 0
                  ? [4, 4, 0, 0]
                  : [0, 0, 4, 4]) as unknown as number
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
