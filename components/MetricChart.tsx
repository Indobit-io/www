"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DataPoint {
  timestamp: string;
  value: number;
}

interface MetricChartProps {
  data: DataPoint[];
  unit?: string;
  decimals?: number;
  color?: string;
  expanded?: boolean;
  currentValue?: number | null;
}

// Minimal tooltip styled to the terminal aesthetic
function ChartTooltip({
  active,
  payload,
  unit,
  decimals,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit?: string;
  decimals?: number;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const decimalsToUse = decimals ?? 2;
  return (
    <div className="bg-terminal-bg border border-terminal-border px-2 py-1 font-mono text-[10px] text-terminal-green shadow-lg">
      {unit === "$" || unit === "$/oz" || unit === "$/bbl"
        ? `$${val.toLocaleString("en-US", { maximumFractionDigits: decimalsToUse })}`
        : `${val.toFixed(decimalsToUse)}${unit ?? ""}`}
    </div>
  );
}

function formatXTick(ts: string): string {
  try {
    return format(parseISO(ts), "MMM d");
  } catch {
    return ts.slice(0, 10);
  }
}

function formatYTick(val: number, decimals: number): string {
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(decimals);
}

export function MetricChart({
  data,
  unit = "",
  decimals = 2,
  color = "#00ff41",
  expanded = false,
  currentValue,
}: MetricChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center font-mono text-[10px] text-terminal-text-muted border border-dashed border-terminal-border rounded"
        style={{ height: expanded ? 160 : 52 }}
      >
        NO DATA
      </div>
    );
  }

  const height = expanded ? 160 : 52;

  // Compute domain with a little padding
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const pad = (maxVal - minVal) * 0.1 || Math.abs(minVal) * 0.05 || 0.1;
  const domainMin = minVal - pad;
  const domainMax = maxVal + pad;

  // Thin out x-axis ticks for small charts
  const tickCount = expanded ? Math.min(data.length, 6) : 0;
  const tickIndexes =
    tickCount > 0
      ? Array.from({ length: tickCount }, (_, i) =>
          Math.round((i / (tickCount - 1)) * (data.length - 1))
        )
      : [];
  const xTicks = tickIndexes.map((i) => data[i].timestamp);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 4, left: 0, bottom: expanded ? 16 : 0 }}
      >
        <defs>
          <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {expanded && (
          <XAxis
            dataKey="timestamp"
            ticks={xTicks}
            tickFormatter={formatXTick}
            tick={{ fill: "#3d6b3d", fontSize: 9, fontFamily: "IBM Plex Mono" }}
            axisLine={{ stroke: "#1a3a1a" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
        )}

        {expanded && (
          <YAxis
            domain={[domainMin, domainMax]}
            tickFormatter={(v) => formatYTick(v, decimals)}
            tick={{ fill: "#3d6b3d", fontSize: 9, fontFamily: "IBM Plex Mono" }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
        )}

        <Tooltip
          content={<ChartTooltip unit={unit} decimals={decimals} />}
          cursor={{ stroke: "#1a3a1a", strokeWidth: 1 }}
        />

        {expanded && currentValue != null && (
          <ReferenceLine
            y={currentValue}
            stroke={color}
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
        )}

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={expanded ? 1.5 : 1.2}
          fill={`url(#fill-${color.replace("#", "")})`}
          dot={false}
          activeDot={{
            r: 3,
            fill: color,
            stroke: "#0a0f0a",
            strokeWidth: 1,
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
