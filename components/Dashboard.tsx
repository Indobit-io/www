"use client";

import { useState, useMemo } from "react";
import { FlowDiagram } from "./FlowDiagram";
import { ParameterPanel } from "./ParameterPanel";
import { ImpactPanel } from "./ImpactPanel";
import { SignalsPanel } from "./SignalsPanel";
import { computeModel, DEFAULT_PARAMS, type MacroParams } from "@/lib/model";
import type { MetricId } from "@/lib/config";
import type { SignalEvent } from "@/lib/db";

interface DashboardProps {
  liveValues: Partial<Record<MetricId, number>>;
  signalEvents: SignalEvent[];
  lastUpdate: string;
  statusDot: "green" | "yellow" | "red";
}

const STATUS_CLASSES = {
  green: "bg-terminal-green shadow-[0_0_6px_#00ff41]",
  yellow: "bg-terminal-amber",
  red: "bg-terminal-red animate-pulse",
};

export function Dashboard({
  liveValues,
  signalEvents,
  lastUpdate,
  statusDot,
}: DashboardProps) {
  // Initialise params from live values, fall back to defaults
  const liveParams: MacroParams = {
    fedRate: liveValues["fed_rate"] ?? DEFAULT_PARAMS.fedRate,
    qeSize: liveValues["fed_bs"] ?? DEFAULT_PARAMS.qeSize,
    inflation: liveValues["cpi"] ?? DEFAULT_PARAMS.inflation,
    riskAppetite: DEFAULT_PARAMS.riskAppetite,
  };

  const [params, setParams] = useState<MacroParams>(liveParams);
  const [activeTab, setActiveTab] = useState<"flow" | "impacts" | "signals">("flow");

  const model = useMemo(
    () => computeModel(params, liveValues as Record<string, number>),
    [params, liveValues]
  );

  const isModified =
    Math.abs(params.fedRate - liveParams.fedRate) > 0.01 ||
    Math.abs(params.qeSize - liveParams.qeSize) > 0.05 ||
    Math.abs(params.inflation - liveParams.inflation) > 0.05 ||
    Math.abs(params.riskAppetite - liveParams.riskAppetite) > 0.01;

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-terminal-green font-mono text-xs opacity-50 flex-shrink-0">▌</span>
            <div className="min-w-0">
              <h1 className="font-mono text-xs font-bold text-terminal-green tracking-wider truncate">
                GLOBAL LIQUIDITY FLOW
              </h1>
              <div className="font-mono text-[9px] text-terminal-text-muted truncate">
                interactive money movement tracker
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isModified && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-terminal-amber border border-amber-900">
                SCENARIO
              </span>
            )}
            <div
              className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
              style={{
                color: model.regimeColor,
                borderColor: model.regimeColor + "40",
                background: model.regimeColor + "10",
              }}
            >
              {model.regimeLabel}
            </div>
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_CLASSES[statusDot]}`} />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">

        {/* ── Desktop layout: side-by-side ──────────────────────────── */}
        <div className="hidden lg:grid lg:grid-cols-[300px_1fr] lg:gap-6">

          {/* Left: Parameters + Impacts */}
          <div className="space-y-6">
            <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
              <ParameterPanel
                params={params}
                onChange={setParams}
                liveParams={liveParams}
              />
            </div>

            <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
              <ImpactPanel impacts={model.impacts} />
            </div>

            {/* Regime description */}
            <div
              className="rounded-lg p-3 border font-mono text-xs text-terminal-text-dim leading-relaxed"
              style={{
                borderColor: model.regimeColor + "30",
                background: model.regimeColor + "08",
              }}
            >
              <div className="text-[9px] tracking-widest mb-1" style={{ color: model.regimeColor }}>
                LIQUIDITY REGIME
              </div>
              {model.regimeDesc}
            </div>

            <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
              <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-3">
                SIGNALS
              </div>
              <SignalsPanel values={liveValues} signalEvents={signalEvents} />
            </div>
          </div>

          {/* Right: Flow Diagram */}
          <div className="space-y-4">
            <div
              className="border rounded-lg overflow-hidden bg-terminal-surface"
              style={{ borderColor: model.regimeColor + "30" }}
            >
              <div
                className="px-4 py-2 border-b font-mono text-[9px] tracking-widest flex items-center justify-between"
                style={{
                  borderColor: model.regimeColor + "20",
                  color: model.regimeColor,
                }}
              >
                <span>MONEY FLOW MAP</span>
                <span className="opacity-60 text-terminal-text-muted normal-case font-normal">
                  ← adjust parameters to reshape flows
                </span>
              </div>
              <div className="p-2" style={{ height: "600px" }}>
                <FlowDiagram
                  nodes={model.nodes}
                  edges={model.edges}
                  liquidityScore={model.liquidityScore}
                />
              </div>
            </div>

            <div className="border border-terminal-border rounded-lg p-3 font-mono text-[9px] text-terminal-text-muted">
              <span className="text-terminal-text-dim">LAST DATA: </span>
              {lastUpdate}
              <span className="ml-3 opacity-50">— sources: FRED · YAHOO · COINGECKO · DEFILLAMA</span>
            </div>
          </div>
        </div>

        {/* ── Mobile layout: tabbed ─────────────────────────────────── */}
        <div className="lg:hidden space-y-3">

          {/* Regime strip */}
          <div
            className="rounded-lg p-3 border font-mono text-xs flex items-center justify-between"
            style={{
              borderColor: model.regimeColor + "30",
              background: model.regimeColor + "08",
              color: model.regimeColor,
            }}
          >
            <span className="text-[9px] tracking-widest">{model.regimeLabel}</span>
            <span className="text-[9px] text-terminal-text-muted font-normal">
              {model.regimeDesc.slice(0, 60)}…
            </span>
          </div>

          {/* Tab bar */}
          <div className="flex border border-terminal-border rounded-lg overflow-hidden">
            {(["flow", "impacts", "signals"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 font-mono text-[10px] tracking-widest transition-colors ${
                  activeTab === tab
                    ? "bg-terminal-green text-terminal-bg"
                    : "text-terminal-text-muted hover:text-terminal-green"
                }`}
              >
                {tab === "flow" ? "FLOW MAP" : tab === "impacts" ? "IMPACTS" : "SIGNALS"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "flow" && (
            <div className="space-y-3">
              <div
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: model.regimeColor + "30" }}
              >
                <div style={{ height: "380px" }} className="p-2 bg-terminal-surface">
                  <FlowDiagram
                    nodes={model.nodes}
                    edges={model.edges}
                    liquidityScore={model.liquidityScore}
                  />
                </div>
              </div>

              <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
                <ParameterPanel
                  params={params}
                  onChange={setParams}
                  liveParams={liveParams}
                />
              </div>
            </div>
          )}

          {activeTab === "impacts" && (
            <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
              <ImpactPanel impacts={model.impacts} />
            </div>
          )}

          {activeTab === "signals" && (
            <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
              <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-3">
                LIVE SIGNALS
              </div>
              <SignalsPanel values={liveValues} signalEvents={signalEvents} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
