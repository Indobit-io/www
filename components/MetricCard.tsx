"use client";

import { useState } from "react";
import { MetricChart } from "./MetricChart";
import { RangeBar } from "./RangeBar";
import { METRIC_CONFIG, type MetricId } from "@/lib/config";

interface MetricCardProps {
  metricId: MetricId;
  current: number | null;
  history: Array<{ timestamp: string; value: number }>;
  updated: string | null;
}

function formatValue(value: number, metricId: MetricId): string {
  const config = METRIC_CONFIG[metricId];
  const decimals = config.decimals ?? 2;
  if (metricId === "sp500" || metricId === "gold" || metricId === "btc") {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  }
  return value.toFixed(decimals);
}

function formatDate(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}

function getValueColor(value: number, metricId: MetricId): string {
  if (metricId === "vix") {
    if (value > 30) return "text-terminal-red";
    if (value > 20) return "text-terminal-amber";
    return "text-terminal-green";
  }
  if (metricId === "rrp") {
    if (value < 100) return "text-terminal-red";
    if (value < 500) return "text-terminal-amber";
    return "text-terminal-green";
  }
  if (metricId === "yield_10y" || metricId === "yield_2y") {
    if (value > 4.5) return "text-terminal-amber";
    if (value > 5) return "text-terminal-red";
    return "text-terminal-green";
  }
  if (metricId === "yield_curve") {
    if (value < -50) return "text-terminal-red";
    if (value < 0) return "text-terminal-amber";
    return "text-terminal-green";
  }
  if (metricId === "cpi") {
    if (value > 5) return "text-terminal-red";
    if (value > 3) return "text-terminal-amber";
    return "text-terminal-green";
  }
  const config = METRIC_CONFIG[metricId];
  const pct = (value - config.low) / (config.high - config.low);
  if (pct > 0.8) return "text-terminal-amber";
  return "text-terminal-green";
}

function computePercentile(current: number, history: number[]): number {
  if (history.length === 0) return 50;
  const below = history.filter((v) => v <= current).length;
  return Math.round((below / history.length) * 100);
}

function getChartColor(metricId: MetricId, current: number | null): string {
  if (current === null) return "#00ff41";
  const color = getValueColor(current, metricId);
  if (color === "text-terminal-red") return "#ff3333";
  if (color === "text-terminal-amber") return "#ffb300";
  return "#00ff41";
}

export function MetricCard({
  metricId,
  current,
  history,
  updated,
}: MetricCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = METRIC_CONFIG[metricId];
  const historyValues = history.map((h) => h.value);
  const valueColor =
    current !== null
      ? getValueColor(current, metricId)
      : "text-terminal-text-muted";
  const chartColor = getChartColor(metricId, current);

  const percentile =
    current !== null && historyValues.length > 1
      ? computePercentile(current, historyValues)
      : null;

  let change: number | null = null;
  let changeDir: "up" | "down" | "flat" = "flat";
  if (historyValues.length >= 2) {
    change = historyValues[historyValues.length - 1] - historyValues[0];
    if (change > 0.0001) changeDir = "up";
    else if (change < -0.0001) changeDir = "down";
  }

  const displayValue =
    current !== null
      ? config.unit === "$" || config.unit === "$/oz" || config.unit === "$/bbl"
        ? `$${formatValue(current, metricId)}`
        : metricId === "yield_curve"
        ? `${current > 0 ? "+" : ""}${current}bps`
        : `${formatValue(current, metricId)}${config.unit}`
      : "—";

  return (
    <div
      className={`border border-terminal-border bg-terminal-surface rounded p-3 cursor-pointer hover:border-terminal-green-muted transition-colors duration-200 group ${expanded ? "col-span-full" : ""}`}
      onClick={() => setExpanded((e) => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((x) => !x)}
      aria-expanded={expanded}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[9px] text-terminal-text-muted font-mono tracking-widest uppercase truncate">
            {config.category}
          </div>
          <div className="text-xs text-terminal-text-dim font-mono truncate mt-0.5">
            {config.label}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className={`text-xl font-mono font-bold leading-none ${valueColor}`}>
            {displayValue}
          </div>
          <div className="flex items-center justify-end gap-2 mt-0.5">
            {change !== null && (
              <span
                className={`text-[10px] font-mono ${
                  changeDir === "up"
                    ? "text-terminal-green"
                    : changeDir === "down"
                    ? "text-terminal-red"
                    : "text-terminal-text-muted"
                }`}
              >
                {changeDir === "up" ? "▲" : changeDir === "down" ? "▼" : "—"}
                {Math.abs(change).toFixed(config.decimals ?? 2)}
              </span>
            )}
            {percentile !== null && (
              <span
                className={`text-[9px] font-mono px-1 rounded border ${
                  percentile > 85
                    ? "border-amber-900 text-terminal-amber"
                    : percentile < 15
                    ? "border-terminal-green-muted text-terminal-green"
                    : "border-terminal-border text-terminal-text-muted"
                }`}
                title={`${percentile}th percentile of recent history`}
              >
                P{percentile}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-2">
        <MetricChart
          data={history}
          unit={config.unit}
          decimals={config.decimals}
          color={chartColor}
          expanded={expanded}
          currentValue={current}
        />
      </div>

      {/* Range bar */}
      {current !== null && (
        <div className="mb-2">
          <RangeBar value={current} low={config.low} high={config.high} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-[9px] text-terminal-text-muted font-mono">
          {updated ? formatDate(updated) : "—"}
        </div>
        <div className="text-[9px] text-terminal-text-muted font-mono group-hover:text-terminal-green transition-colors">
          {expanded ? "▲ collapse" : "▼ expand"}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-terminal-border">
          <p className="text-xs text-terminal-text-dim leading-relaxed mb-3">
            {config.desc}
          </p>
          <div className="flex flex-wrap gap-4 text-[10px] font-mono text-terminal-text-muted">
            <span>RANGE {config.low}–{config.high} {config.unit}</span>
            <span>HISTORY {historyValues.length}pts</span>
            {percentile !== null && (
              <span className={percentile > 85 || percentile < 15 ? "text-terminal-amber" : ""}>
                {percentile}th PERCENTILE
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
