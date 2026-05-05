"use client";

import { useMemo } from "react";
import type { FlowNode, FlowEdge, NodeId } from "@/lib/model";

// Node layout positions (viewBox 400 × 520)
const NODE_POSITIONS: Record<NodeId, { x: number; y: number }> = {
  fed:      { x: 200, y:  42 },
  treasury: { x: 340, y: 120 },
  banks:    { x:  60, y: 150 },
  rrp:      { x:  42, y: 270 },
  mmf:      { x: 175, y: 255 },
  bonds:    { x: 330, y: 240 },
  equities: { x: 245, y: 360 },
  economy:  { x:  95, y: 380 },
  gold:     { x: 360, y: 430 },
  crypto:   { x: 175, y: 465 },
};

const NODE_W = 84;
const NODE_H = 44;
const VB_W = 410;
const VB_H = 530;

function nodeCenter(id: NodeId) {
  const p = NODE_POSITIONS[id];
  return { cx: p.x, cy: p.y };
}

// Returns an SVG cubic-bezier path string from center of `from` to center of `to`
function edgePath(from: NodeId, to: NodeId): string {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  // Control points offset perpendicular to the line
  const mx = (a.cx + b.cx) / 2;
  const my = (a.cy + b.cy) / 2;
  const bend = Math.sqrt(dx * dx + dy * dy) * 0.2;
  // Perpendicular nudge
  const nx = -dy / Math.sqrt(dx * dx + dy * dy + 0.001) * bend;
  const ny =  dx / Math.sqrt(dx * dx + dy * dy + 0.001) * bend;
  return `M ${a.cx} ${a.cy} Q ${mx + nx} ${my + ny} ${b.cx} ${b.cy}`;
}

// Animation duration inversely proportional to intensity
function animDuration(intensity: number): string {
  const sec = lerp(3.5, 0.8, intensity);
  return `${sec.toFixed(2)}s`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function strokeWidth(intensity: number): number {
  return lerp(0.5, 3.5, intensity);
}

function nodeGlow(color: string, heat: number): string {
  if (heat < 0.2) return "none";
  const alpha = Math.round(heat * 200).toString(16).padStart(2, "0");
  return `drop-shadow(0 0 ${Math.round(heat * 8)}px ${color}${alpha})`;
}

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  liquidityScore: number;
}

export function FlowDiagram({ nodes, edges, liquidityScore }: FlowDiagramProps) {
  const nodeMap = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full h-full"
      style={{ maxHeight: "100%" }}
      aria-label="Global money flow diagram"
    >
      <defs>
        {/* Animated dash for each unique color/intensity */}
        {edges.map((edge) => {
          const dashLen = lerp(6, 14, edge.intensity);
          const gapLen = lerp(20, 8, edge.intensity);
          return (
            <style key={edge.id}>{`
              @keyframes flow-${edge.id} {
                from { stroke-dashoffset: ${dashLen + gapLen}; }
                to   { stroke-dashoffset: 0; }
              }
              .flow-${edge.id} {
                animation: flow-${edge.id} ${animDuration(edge.intensity)} linear infinite;
              }
            `}</style>
          );
        })}

        {/* Arrow marker per edge */}
        {edges.map((edge) => (
          <marker
            key={`arrow-${edge.id}`}
            id={`arrow-${edge.id}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={edge.intensity < 0.15 ? "#1a3a1a" : edge.color} opacity={0.8} />
          </marker>
        ))}
      </defs>

      {/* ── Edges (background layer) ─────────────────────────────────── */}
      {edges.map((edge) => {
        const path = edgePath(edge.from, edge.to);
        const sw = strokeWidth(edge.intensity);
        const dashLen = lerp(6, 14, edge.intensity);
        const gapLen = lerp(20, 8, edge.intensity);
        const opacity = lerp(0.12, 0.85, edge.intensity);

        return (
          <g key={edge.id}>
            {/* Static base line */}
            <path
              d={path}
              fill="none"
              stroke={edge.intensity < 0.15 ? "#0f1f0f" : edge.color}
              strokeWidth={sw * 0.4}
              opacity={0.3}
            />
            {/* Animated flowing dash */}
            {edge.intensity > 0.08 && (
              <path
                d={path}
                fill="none"
                stroke={edge.color}
                strokeWidth={sw}
                strokeDasharray={`${dashLen} ${gapLen}`}
                opacity={opacity}
                className={`flow-${edge.id}`}
                markerEnd={`url(#arrow-${edge.id})`}
              />
            )}
          </g>
        );
      })}

      {/* ── Nodes ───────────────────────────────────────────────────── */}
      {nodes.map((node) => {
        const { x, y } = NODE_POSITIONS[node.id];
        const x0 = x - NODE_W / 2;
        const y0 = y - NODE_H / 2;
        const borderOpacity = lerp(0.25, 1.0, node.heat);
        const bgOpacity = lerp(0.04, 0.14, node.heat);
        const glowPx = Math.round(node.heat * 10);

        return (
          <g key={node.id} style={{ filter: `drop-shadow(0 0 ${glowPx}px ${node.color}44)` }}>
            {/* Node background */}
            <rect
              x={x0}
              y={y0}
              width={NODE_W}
              height={NODE_H}
              rx={4}
              fill={node.color}
              fillOpacity={bgOpacity}
              stroke={node.color}
              strokeOpacity={borderOpacity}
              strokeWidth={1}
            />
            {/* Label */}
            <text
              x={x}
              y={y - 8}
              textAnchor="middle"
              fill={node.color}
              fillOpacity={lerp(0.5, 1.0, node.heat)}
              fontSize="8"
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="700"
              letterSpacing="0.05em"
            >
              {node.label.toUpperCase()}
            </text>
            {/* Sublabel or live value */}
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fill={node.value ? node.color : "#3d6b3d"}
              fillOpacity={node.value ? lerp(0.6, 1, node.heat) : 0.6}
              fontSize="7.5"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {node.value ?? node.sublabel}
            </text>
            {/* Heat dot */}
            {node.heat > 0.5 && (
              <circle
                cx={x + NODE_W / 2 - 5}
                cy={y - NODE_H / 2 + 5}
                r={2.5}
                fill={node.color}
                opacity={node.heat}
              >
                <animate
                  attributeName="opacity"
                  values={`${node.heat};${node.heat * 0.3};${node.heat}`}
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        );
      })}

      {/* ── Liquidity score bar ──────────────────────────────────────── */}
      <g transform={`translate(10, ${VB_H - 16})`}>
        <text x={0} y={0} fill="#3d6b3d" fontSize="7" fontFamily="'IBM Plex Mono', monospace">
          TIGHT
        </text>
        <rect x={28} y={-7} width={140} height={5} rx={2} fill="#0f1f0f" />
        <rect
          x={28}
          y={-7}
          width={140}
          height={5}
          rx={2}
          fill="url(#liqGrad)"
          opacity={0.3}
        />
        <defs>
          <linearGradient id="liqGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ff3333" />
            <stop offset="50%" stopColor="#7ab87a" />
            <stop offset="100%" stopColor="#00ff41" />
          </linearGradient>
        </defs>
        {/* Indicator */}
        <circle
          cx={28 + ((liquidityScore + 1) / 2) * 140}
          cy={-4.5}
          r={4}
          fill={liquidityScore > 0.2 ? "#00ff41" : liquidityScore < -0.2 ? "#ff3333" : "#ffb300"}
          style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
        />
        <text x={176} y={0} fill="#3d6b3d" fontSize="7" fontFamily="'IBM Plex Mono', monospace">
          LOOSE
        </text>
      </g>
    </svg>
  );
}
