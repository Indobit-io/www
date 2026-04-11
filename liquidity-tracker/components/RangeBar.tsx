"use client";

interface RangeBarProps {
  value: number;
  low: number;
  high: number;
  color?: string;
}

export function RangeBar({ value, low, high, color = "#00ff41" }: RangeBarProps) {
  const pct = Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));

  // Color zones: low=green, mid=amber, high=red
  let barColor = color;
  if (pct > 80) barColor = "#ff3333";
  else if (pct > 60) barColor = "#ffb300";

  return (
    <div className="w-full">
      <div className="relative h-1 w-full rounded-full bg-terminal-border overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-terminal-text-muted font-mono">LO</span>
        <span className="text-[9px] text-terminal-text-muted font-mono">HI</span>
      </div>
    </div>
  );
}
