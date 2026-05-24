"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { LoanScheduleRow } from "@/lib/calc";

interface Props {
  rows: LoanScheduleRow[];
  principalIdr: number;
}

function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}jt`;
  return `${(v / 1_000).toFixed(2)}k`;
}

function TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-cmc-surface-2 border border-cmc-border px-3 py-2.5 rounded-xl text-xs space-y-1.5 shadow-xl">
      <div className="text-cmc-text-muted font-medium mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="text-cmc-text font-semibold">
            Rp {Number(p.value).toLocaleString("id-ID")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LoanChart({ rows, principalIdr }: Props) {
  const data = rows
    .filter((r) => r.portfolioValueIdr != null)
    .map((r) => ({
      month: r.monthLabel,
      "Portfolio": r.portfolioValueIdr,
      "Sisa Hutang": r.remainingPrincipal,
      "Total Dibayar": r.cumulativePaid,
    }));

  if (data.length < 1) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-cmc-text-muted border border-dashed border-cmc-border rounded-xl">
        Belum ada data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="month"
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
        <ReferenceLine y={principalIdr} stroke="#21262d" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="Portfolio"
          stroke="#16c784"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#16c784", stroke: "#161b22", strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Sisa Hutang"
          stroke="#ea3943"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Total Dibayar"
          stroke="#f0b90b"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="2 4"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
