"use client";

import type { MacroParams } from "@/lib/model";

interface ParamSliderProps {
  label: string;
  sublabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  color: string;
  onChange: (v: number) => void;
}

function ParamSlider({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  format,
  color,
  onChange,
}: ParamSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-terminal-text-muted">
            {label}
          </span>
          <span className="ml-2 font-mono text-[9px] text-terminal-text-muted opacity-60">
            {sublabel}
          </span>
        </div>
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {format(value)}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 appearance-none cursor-pointer rounded-full outline-none"
          style={{
            background: `linear-gradient(to right, ${color}88 0%, ${color} ${pct}%, #1a3a1a ${pct}%, #1a3a1a 100%)`,
          }}
        />
      </div>
    </div>
  );
}

interface ParameterPanelProps {
  params: MacroParams;
  onChange: (params: MacroParams) => void;
  liveParams?: Partial<MacroParams>;
}

export function ParameterPanel({
  params,
  onChange,
  liveParams,
}: ParameterPanelProps) {
  const set = (key: keyof MacroParams, value: number) =>
    onChange({ ...params, [key]: value });

  const riskColor =
    params.riskAppetite > 0.2
      ? "#00ff41"
      : params.riskAppetite < -0.2
      ? "#ff3333"
      : "#ffb300";

  const rateColor = params.fedRate > 5 ? "#ff3333" : params.fedRate < 2 ? "#00ff41" : "#ffb300";
  const qeColor = params.qeSize > 7.5 ? "#00ff41" : params.qeSize < 6 ? "#ff6b35" : "#ffb300";
  const inflColor =
    params.inflation > 4 ? "#ff3333" : params.inflation < 2.5 ? "#00ff41" : "#ffb300";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[9px] tracking-widest text-terminal-text-muted">
          SCENARIO PARAMETERS
        </span>
        {liveParams && (
          <button
            onClick={() => onChange(liveParams as MacroParams)}
            className="font-mono text-[9px] px-2 py-0.5 border border-terminal-border text-terminal-text-muted hover:border-terminal-green hover:text-terminal-green rounded transition-colors"
          >
            RESET LIVE
          </button>
        )}
      </div>

      <ParamSlider
        label="FED RATE"
        sublabel="funds target"
        value={params.fedRate}
        min={0}
        max={10}
        step={0.25}
        format={(v) => `${v.toFixed(2)}%`}
        color={rateColor}
        onChange={(v) => set("fedRate", v)}
      />

      <ParamSlider
        label="BALANCE SHEET"
        sublabel="QE / QT"
        value={params.qeSize}
        min={4}
        max={10}
        step={0.1}
        format={(v) => `$${v.toFixed(1)}T`}
        color={qeColor}
        onChange={(v) => set("qeSize", v)}
      />

      <ParamSlider
        label="INFLATION"
        sublabel="CPI YoY"
        value={params.inflation}
        min={0}
        max={10}
        step={0.1}
        format={(v) => `${v.toFixed(1)}%`}
        color={inflColor}
        onChange={(v) => set("inflation", v)}
      />

      <ParamSlider
        label="RISK APPETITE"
        sublabel="off ↔ on"
        value={params.riskAppetite}
        min={-1}
        max={1}
        step={0.05}
        format={(v) =>
          v > 0.2 ? `RISK-ON +${v.toFixed(2)}` : v < -0.2 ? `RISK-OFF ${v.toFixed(2)}` : "NEUTRAL"
        }
        color={riskColor}
        onChange={(v) => set("riskAppetite", v)}
      />

      {/* QE/QT indicator */}
      <div className="flex gap-2 pt-1">
        <div
          className="flex-1 text-center py-1 rounded font-mono text-[9px] tracking-widest border transition-all duration-300"
          style={
            params.qeSize >= 7.0
              ? { borderColor: "#00ff4140", color: "#00ff41", background: "#00ff4108" }
              : { borderColor: "#ff6b3540", color: "#ff6b35", background: "#ff6b3508" }
          }
        >
          {params.qeSize >= 7.0 ? "◆ QE MODE" : "◇ QT MODE"}
        </div>
        <div
          className="flex-1 text-center py-1 rounded font-mono text-[9px] tracking-widest border transition-all duration-300"
          style={
            params.fedRate <= 3
              ? { borderColor: "#00ff4140", color: "#00ff41", background: "#00ff4108" }
              : params.fedRate >= 5
              ? { borderColor: "#ff333340", color: "#ff3333", background: "#ff333308" }
              : { borderColor: "#ffb30040", color: "#ffb300", background: "#ffb30008" }
          }
        >
          {params.fedRate <= 3 ? "● DOVISH" : params.fedRate >= 5 ? "● HAWKISH" : "● NEUTRAL"}
        </div>
      </div>
    </div>
  );
}
