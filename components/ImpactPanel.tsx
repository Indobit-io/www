"use client";

import type { MarketImpact } from "@/lib/model";

const DIRECTION_ICON = {
  up: "▲",
  down: "▼",
  flat: "—",
};

const MAG_DOTS = (n: number) => "●".repeat(Math.min(n, 3)) + "○".repeat(Math.max(0, 3 - n));

interface ImpactCardProps {
  impact: MarketImpact;
}

function ImpactCard({ impact }: ImpactCardProps) {
  const dirColor =
    impact.direction === "up"
      ? impact.color
      : impact.direction === "down"
      ? "#ff3333"
      : "#3d6b3d";

  return (
    <div className="border border-terminal-border bg-terminal-surface rounded p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] tracking-widest text-terminal-text-muted">
          {impact.label.toUpperCase()}
        </span>
        <span
          className="font-mono text-[9px] tracking-widest"
          style={{ color: dirColor }}
        >
          {MAG_DOTS(impact.magnitude)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-sm font-bold" style={{ color: impact.color }}>
          {impact.value}
        </span>
        <span
          className="font-mono text-base font-bold leading-none"
          style={{ color: dirColor }}
        >
          {DIRECTION_ICON[impact.direction]}
        </span>
      </div>

      <p className="font-mono text-[9px] text-terminal-text-muted leading-relaxed">
        {impact.reason}
      </p>
    </div>
  );
}

interface ImpactPanelProps {
  impacts: MarketImpact[];
}

export function ImpactPanel({ impacts }: ImpactPanelProps) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted">
        MARKET IMPACTS
      </div>
      <div className="grid grid-cols-2 gap-2">
        {impacts.map((imp) => (
          <ImpactCard key={imp.metricId} impact={imp} />
        ))}
      </div>
    </div>
  );
}
