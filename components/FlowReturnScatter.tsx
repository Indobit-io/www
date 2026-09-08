"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usd } from "@/lib/fmt";

/**
 * The raw scatter behind the coefficient. Flow is on a signed-log axis because
 * a linear one collapses every point but the largest few into the origin.
 */
export default function FlowReturnScatter({
  points,
  lag,
}: {
  points: { flow: number; ret: number; ts: string }[];
  lag: number;
}) {
  const data = points
    .filter((p) => p.flow !== 0)
    .map((p) => ({
      x: Math.sign(p.flow) * Math.log10(1 + Math.abs(p.flow)),
      y: p.ret * 100,
      flow: p.flow,
      ts: p.ts,
    }));

  if (data.length < 5) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[13px] text-cmc-text-muted">
        Fewer than 5 hours with whale flow — nothing to plot.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
        <CartesianGrid stroke="#21262d" />
        <XAxis
          type="number"
          dataKey="x"
          name="Whale netflow"
          tick={{ fill: "#5c6370", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#21262d" }}
          tickFormatter={(v: number) => usd(Math.sign(v) * (10 ** Math.abs(v) - 1))}
          label={{
            value: "whale netflow (signed log scale)",
            position: "insideBottom",
            offset: -10,
            fill: "#5c6370",
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Return"
          tick={{ fill: "#5c6370", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <ReferenceLine x={0} stroke="#2b3240" />
        <ReferenceLine y={0} stroke="#2b3240" />
        <Tooltip
          cursor={{ stroke: "#3861fb", strokeDasharray: "3 3" }}
          contentStyle={{
            background: "#161b22",
            border: "1px solid #21262d",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(_v, _n, item) => {
            const d = item.payload as (typeof data)[number];
            return [
              `${usd(d.flow, { sign: true })} → ${d.y.toFixed(2)}% (${lag >= 0 ? "+" : ""}${lag}h)`,
              d.ts.slice(0, 16).replace("T", " "),
            ];
          }}
        />
        <Scatter data={data} fill="#3861fb" fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
