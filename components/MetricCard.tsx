"use client";

import { useState } from "react";
import { Sparkline } from "./Sparkline";
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
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}

function getValueColor(value: number, metricId: MetricId): string {
  const config = METRIC_CONFIG[metricId];
  const pct = (value - config.low) / (config.high - config.low);

  // For VIX: high is bad (red), low is good (green)
  if (metricId === "vix") {
    if (value > 30) return "text-terminal-red";
    if (value > 20) return "text-terminal-amber";
    return "text-terminal-green";
  }
  // For RRP: near-zero is a warning
  if (metricId === "rrp") {
    if (value < 100) return "text-terminal-red";
    if (value < 500) return "text-terminal-amber";
    return "text-terminal-green";
  }
  // For yield_10y: high yield = tighter
  if (metricId === "yield_10y") {
    if (value > 4.5) return "text-terminal-amber";
    if (value > 5) return "text-terminal-red";
    return "text-terminal-green";
  }
  // Default: use range position
  if (pct > 0.8) return "text-terminal-amber";
  return "text-terminal-green";
}

export function MetricCard({ metricId, current, history, updated }: MetricCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = METRIC_CONFIG[metricId];
  const sparkData = history.map((h) => h.value);
  const valueColor = current !== null ? getValueColor(current, metricId) : "text-terminal-text-muted";

  // Compute change from first to last in history
  let change: number | null = null;
  let changeDir: "up" | "down" | "flat" = "flat";
  if (sparkData.length >= 2) {
    const first = sparkData[0];
    const last = sparkData[sparkData.length - 1];
    change = last - first;
    if (change > 0) changeDir = "up";
    else if (change < 0) changeDir = "down";
  }

  return (
    <div
      className={`border border-terminal-border bg-terminal-surface rounded p-3 cursor-pointer hover:border-terminal-green-muted transition-colors duration-200 ${expanded ? "col-span-full sm:col-span-2" : ""}`}
      onClick={() => setExpanded((e) => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((x) => !x)}
      aria-expanded={expanded}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[10px] text-terminal-text-muted font-mono tracking-widest uppercase truncate">
            {config.category}
          </div>
          <div className="text-xs text-terminal-text-dim font-mono truncate mt-0.5">
            {config.label}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {current !== null ? (
            <div className={`text-xl font-mono font-bold ${valueColor} leading-none`}>
              {config.unit === "$" || config.unit === "$/oz" || config.unit === "$/bbl"
                ? `$${formatValue(current, metricId)}`
                : `${formatValue(current, metricId)}${config.unit}`}
            </div>
          ) : (
            <div className="text-xl font-mono text-terminal-text-muted">—</div>
          )}
          {change !== null && (
            <div
              className={`text-[10px] font-mono mt-0.5 ${
                changeDir === "up"
                  ? "text-terminal-green"
                  : changeDir === "down"
                  ? "text-terminal-red"
                  : "text-terminal-text-muted"
              }`}
            >
              {changeDir === "up" ? "▲" : changeDir === "down" ? "▼" : "—"}{" "}
              {Math.abs(change).toFixed(config.decimals ?? 2)}{" "}
              <span className="text-terminal-text-muted">(52pt)</span>
            </div>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <div className="mb-2">
        <Sparkline
          data={sparkData}
          width={expanded ? 320 : 160}
          height={expanded ? 60 : 36}
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
          UPD {formatDate(updated)}
        </div>
        <div className="text-[9px] text-terminal-text-muted font-mono">
          {expanded ? "▲ collapse" : "▼ expand"}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-terminal-border">
          <p className="text-xs text-terminal-text-dim leading-relaxed mb-2">
            {config.desc}
          </p>
          <div className="flex gap-4 text-[10px] font-mono text-terminal-text-muted">
            <span>RANGE {config.low} – {config.high} {config.unit}</span>
            <span>POINTS {sparkData.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
