"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LagResult } from "@/lib/stats";
import { coef, pValue } from "@/lib/fmt";

/**
 * Correlation by lag. Bars are coloured only when they clear the
 * multiple-comparison threshold, so a scan over noise reads as a wall of grey
 * rather than a shape the eye wants to interpret.
 */
export default function LagChart({
  lags,
  alpha,
  bucketLabel = "h",
}: {
  lags: LagResult[];
  alpha: number;
  bucketLabel?: string;
}) {
  if (!lags.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[13px] text-cmc-text-muted">
        Not enough overlapping observations to scan lags.
      </div>
    );
  }

  const data = lags.map((l) => ({
    lag: l.lag,
    r: l.pearson,
    p: l.pValue,
    n: l.n,
    spearman: l.spearman,
    significant: l.pValue < alpha,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <XAxis
          dataKey="lag"
          tick={{ fill: "#5c6370", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#21262d" }}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}${bucketLabel}`}
        />
        <YAxis
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
          tick={{ fill: "#5c6370", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ReferenceLine y={0} stroke="#21262d" />
        <Tooltip
          cursor={{ fill: "#1c2230" }}
          contentStyle={{
            background: "#161b22",
            border: "1px solid #21262d",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(v) => `lag ${Number(v) > 0 ? "+" : ""}${v}${bucketLabel}`}
          formatter={(_value, _name, item) => {
            const d = item.payload as (typeof data)[number];
            return [
              `r ${coef(d.r)} · ρ ${coef(d.spearman)} · p ${pValue(d.p)} · n ${d.n}`,
              d.significant ? "significant" : "not significant",
            ];
          }}
        />
        <Bar dataKey="r" radius={[2, 2, 2, 2]}>
          {data.map((d) => (
            <Cell
              key={d.lag}
              fill={!d.significant ? "#2b3240" : d.r > 0 ? "#16c784" : "#ea3943"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
