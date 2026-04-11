"use client";

import { generateSignals } from "@/lib/signals";
import type { MetricId } from "@/lib/config";

interface SignalsPanelProps {
  values: Partial<Record<MetricId, number>>;
}

const LEVEL_STYLES = {
  info: {
    border: "border-terminal-green-muted",
    tag: "text-terminal-green",
    dot: "bg-terminal-green",
    text: "text-terminal-text-dim",
  },
  warn: {
    border: "border-amber-900",
    tag: "text-terminal-amber",
    dot: "bg-terminal-amber",
    text: "text-terminal-text-dim",
  },
  alert: {
    border: "border-red-900",
    tag: "text-terminal-red",
    dot: "bg-terminal-red",
    text: "text-terminal-text-dim",
  },
};

export function SignalsPanel({ values }: SignalsPanelProps) {
  const signals = generateSignals(values);

  if (signals.length === 0) {
    return (
      <div className="text-terminal-text-muted font-mono text-xs px-1">
        — no signals —
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {signals.map((signal) => {
        const style = LEVEL_STYLES[signal.level];
        return (
          <div
            key={signal.id}
            className={`border ${style.border} bg-terminal-surface rounded px-3 py-2 flex items-start gap-2`}
          >
            <div
              className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${style.dot}`}
            />
            <div className="min-w-0">
              <span
                className={`font-mono text-[10px] font-bold tracking-widest ${style.tag}`}
              >
                {signal.tag}
              </span>
              <p className={`text-xs mt-0.5 leading-snug ${style.text}`}>
                {signal.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
