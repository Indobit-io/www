"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { CumulativePoint } from "@/lib/analytics";

interface Props {
  points: CumulativePoint[];
}

function fmtAxis(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" });
}

function TooltipContent({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; stroke?: string; payload: CumulativePoint }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-cmc-surface-2 border border-cmc-border px-3 py-2.5 rounded-xl text-xs space-y-1.5 shadow-xl">
      <div className="text-cmc-text-muted font-medium mb-2">{fmtDate(payload[0].payload.t)}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color ?? p.stroke }} className="font-medium">{p.name}</span>
          <span className="text-cmc-text font-semibold">
            Rp {Math.round(Number(p.value)).toLocaleString("id-ID")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CumulativePnlChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-cmc-text-muted border border-dashed border-cmc-border rounded-xl">
        Belum ada penjualan
      </div>
    );
  }

  const data = points.map((p) => ({
    ...p,
    "Cash": p.cash,
    "Realized P/L": p.realizedPnl,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="t"
          tickFormatter={fmtDate}
          tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
          axisLine={{ stroke: "#21262d" }}
          tickLine={false}
          minTickGap={56}
        />
        <YAxis
          tickFormatter={fmtAxis}
          tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<TooltipContent />} />
        <ReferenceLine y={0} stroke="#21262d" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="Cash"
          stroke="#f0b90b"
          fill="#f0b90b14"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Realized P/L"
          stroke="#3861fb"
          strokeWidth={2}
          dot={{ r: 3, fill: "#3861fb", stroke: "#161b22", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
