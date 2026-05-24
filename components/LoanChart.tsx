"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { LoanScheduleRow } from "@/lib/calc";

interface Props {
  rows: LoanScheduleRow[];
  principalIdr: number;
}

function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
  return `${(v / 1_000).toFixed(0)}k`;
}

function TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-terminal-bg border border-terminal-border px-3 py-2 font-mono text-[10px] space-y-1">
      <div className="text-terminal-text-muted mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: Rp {Number(p.value).toLocaleString("id-ID")}
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
      <div className="flex items-center justify-center h-40 font-mono text-[10px] text-terminal-text-muted border border-dashed border-terminal-border rounded">
        belum ada data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fill: "#3d6b3d", fontSize: 9, fontFamily: "IBM Plex Mono" }}
          axisLine={{ stroke: "#1a3a1a" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: "#3d6b3d", fontSize: 9, fontFamily: "IBM Plex Mono" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<TooltipContent />} />
        <Legend
          wrapperStyle={{ fontSize: 9, fontFamily: "IBM Plex Mono", color: "#3d6b3d" }}
        />
        <ReferenceLine y={principalIdr} stroke="#1a3a1a" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="Portfolio"
          stroke="#00ff41"
          strokeWidth={2}
          dot={{ r: 3, fill: "#00ff41", stroke: "#0a0f0a" }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Sisa Hutang"
          stroke="#ff3333"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 3"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="Total Dibayar"
          stroke="#ffb300"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="2 4"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
