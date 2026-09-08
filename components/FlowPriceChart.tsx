"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { price, usd } from "@/lib/fmt";

export interface FlowPricePoint {
  ts: string;
  net_usd: number;
  price_usd: number;
}

/** Whale netflow as bars against the token price as a line, hour by hour. */
export default function FlowPriceChart({ data }: { data: FlowPricePoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[13px] text-cmc-text-muted">
        Not enough history to plot.
      </div>
    );
  }

  const rows = data.map((d) => ({
    ...d,
    label: d.ts.slice(5, 13).replace("T", " "),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#21262d" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#5c6370", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#21262d" }}
          minTickGap={40}
        />
        <YAxis
          yAxisId="flow"
          tick={{ fill: "#5c6370", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => usd(v)}
        />
        <YAxis
          yAxisId="price"
          orientation="right"
          domain={["auto", "auto"]}
          tick={{ fill: "#5c6370", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={(v: number) => price(v)}
        />
        <ReferenceLine yAxisId="flow" y={0} stroke="#2b3240" />
        <Tooltip
          contentStyle={{
            background: "#161b22",
            border: "1px solid #21262d",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : Number(value);
            return [name === "Price" ? price(v) : usd(v, { sign: true }), String(name ?? "")];
          }}
        />
        <Bar yAxisId="flow" dataKey="net_usd" name="Whale netflow" fill="#3861fb" opacity={0.75} />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="price_usd"
          name="Price"
          stroke="#f0b90b"
          strokeWidth={1.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
