"use client";

import type { Regime } from "@/lib/regime";

interface RiskRegimeCardProps {
  regime: Regime;
}

const SCORE_LABEL: Record<string, string> = {
  "RISK-OFF": "Stress",
  CAUTION: "Caution",
  NEUTRAL: "Neutral",
  "RISK-ON": "Positive",
  "NO DATA": "—",
};

export function RiskRegimeCard({ regime }: RiskRegimeCardProps) {
  // Score bar: -1 → 0 → +1, mapped to 0–100%
  const barPct = Math.round(((regime.score + 1) / 2) * 100);

  return (
    <div
      className="border rounded p-4"
      style={{ borderColor: regime.color + "40", backgroundColor: regime.color + "08" }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-[9px] font-mono tracking-widest text-terminal-text-muted mb-1">
            RISK REGIME
          </div>
          <div
            className="text-2xl font-mono font-bold tracking-wide"
            style={{ color: regime.color }}
          >
            {regime.label}
          </div>
        </div>

        {/* Signal counts */}
        <div className="flex gap-3 text-right flex-shrink-0">
          {regime.alertCount > 0 && (
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-terminal-red">
                {regime.alertCount}
              </div>
              <div className="text-[9px] font-mono text-terminal-text-muted">
                ALERT
              </div>
            </div>
          )}
          {regime.warnCount > 0 && (
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-terminal-amber">
                {regime.warnCount}
              </div>
              <div className="text-[9px] font-mono text-terminal-text-muted">
                WARN
              </div>
            </div>
          )}
          {regime.infoCount > 0 && (
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-terminal-green">
                {regime.infoCount}
              </div>
              <div className="text-[9px] font-mono text-terminal-text-muted">
                INFO
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] font-mono text-terminal-text-muted mb-1">
          <span>RISK-OFF</span>
          <span>{SCORE_LABEL[regime.label]}</span>
          <span>RISK-ON</span>
        </div>
        <div className="relative h-1.5 w-full bg-terminal-border rounded-full overflow-hidden">
          {/* Background gradient track */}
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background: "linear-gradient(to right, #ff3333, #ffb300, #00ff41)",
            }}
          />
          {/* Indicator notch */}
          <div
            className="absolute top-0 h-full w-1 rounded-full transition-all duration-700"
            style={{
              left: `calc(${barPct}% - 2px)`,
              backgroundColor: regime.color,
              boxShadow: `0 0 6px ${regime.color}`,
            }}
          />
        </div>
      </div>

      {/* Description + drivers */}
      <p className="text-xs text-terminal-text-dim leading-relaxed mb-2">
        {regime.desc}
      </p>

      {regime.drivers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[9px] font-mono text-terminal-text-muted">
            KEY:
          </span>
          {regime.drivers.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[9px] tracking-widest border px-1.5 py-0.5 rounded"
              style={{ borderColor: regime.color + "60", color: regime.color }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
