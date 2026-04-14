import type { MetricId } from "./config";
import { generateSignals } from "./signals";

export type RegimeLabel =
  | "RISK-OFF"
  | "CAUTION"
  | "NEUTRAL"
  | "RISK-ON"
  | "NO DATA";

export interface Regime {
  label: RegimeLabel;
  score: number; // -1.0 (risk-off) to +1.0 (risk-on)
  color: string;
  desc: string;
  alertCount: number;
  warnCount: number;
  infoCount: number;
  drivers: string[]; // top signals driving the regime
}

const REGIME_COLOR: Record<RegimeLabel, string> = {
  "RISK-OFF": "#ff3333",
  CAUTION: "#ffb300",
  NEUTRAL: "#7ab87a",
  "RISK-ON": "#00ff41",
  "NO DATA": "#3d6b3d",
};

const REGIME_DESC: Record<RegimeLabel, string> = {
  "RISK-OFF":
    "Multiple stress indicators flashing. Capital seeking safety in bonds, gold, and cash.",
  CAUTION:
    "Elevated uncertainty. Risk assets under pressure, volatility rising.",
  NEUTRAL:
    "Mixed signals. No dominant directional bias across liquidity indicators.",
  "RISK-ON":
    "Benign conditions. Low volatility, ample liquidity, risk appetite elevated.",
  "NO DATA": "Insufficient data to classify regime.",
};

export function computeRegime(
  values: Partial<Record<MetricId, number>>
): Regime {
  const hasData = Object.keys(values).length > 3;
  if (!hasData) {
    return {
      label: "NO DATA",
      score: 0,
      color: REGIME_COLOR["NO DATA"],
      desc: REGIME_DESC["NO DATA"],
      alertCount: 0,
      warnCount: 0,
      infoCount: 0,
      drivers: [],
    };
  }

  const signals = generateSignals(values);
  const alertCount = signals.filter((s) => s.level === "alert").length;
  const warnCount = signals.filter((s) => s.level === "warn").length;
  const infoCount = signals.filter((s) => s.level === "info").length;

  // Score individual indicators (-1 bad → +1 good)
  const scores: number[] = [];

  const vix = values.vix;
  if (vix != null) {
    if (vix > 40) scores.push(-1);
    else if (vix > 30) scores.push(-0.7);
    else if (vix > 20) scores.push(-0.2);
    else if (vix < 13) scores.push(0.5); // complacency not pure positive
    else if (vix < 15) scores.push(0.8);
    else scores.push(0.2);
  }

  const yieldCurve = values.yield_curve;
  if (yieldCurve != null) {
    if (yieldCurve < -100) scores.push(-0.8);
    else if (yieldCurve < -50) scores.push(-0.5);
    else if (yieldCurve < 0) scores.push(-0.2);
    else if (yieldCurve > 100) scores.push(0.6);
    else scores.push(0.2);
  }

  const dxy = values.dxy;
  if (dxy != null) {
    if (dxy > 107) scores.push(-0.6);
    else if (dxy > 103) scores.push(-0.3);
    else if (dxy < 95) scores.push(0.5);
    else scores.push(0.1);
  }

  const gold = values.gold;
  if (gold != null) {
    // Rising gold = risk-off signal
    if (gold > 3000) scores.push(-0.5);
    else if (gold > 2500) scores.push(-0.2);
    else scores.push(0.1);
  }

  const yield10y = values.yield_10y;
  if (yield10y != null) {
    if (yield10y > 5) scores.push(-0.7);
    else if (yield10y > 4.5) scores.push(-0.4);
    else if (yield10y < 3.5) scores.push(0.3);
    else scores.push(0.0);
  }

  const cpi = values.cpi;
  if (cpi != null) {
    if (cpi > 5) scores.push(-0.6);
    else if (cpi > 3) scores.push(-0.3);
    else if (cpi < 2) scores.push(0.4);
    else scores.push(0.1);
  }

  const rrp = values.rrp;
  if (rrp != null && rrp < 100) scores.push(-0.4);

  const avgScore =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Override: alerts always push to RISK-OFF
  let label: RegimeLabel;
  if (alertCount >= 1 || avgScore < -0.5) {
    label = "RISK-OFF";
  } else if (warnCount >= 2 || avgScore < -0.2) {
    label = "CAUTION";
  } else if (avgScore > 0.3) {
    label = "RISK-ON";
  } else {
    label = "NEUTRAL";
  }

  // Top drivers — pick warn/alert signals first
  const drivers = signals
    .filter((s) => s.level === "alert" || s.level === "warn")
    .slice(0, 3)
    .map((s) => s.tag);
  if (drivers.length === 0) {
    signals.slice(0, 2).forEach((s) => drivers.push(s.tag));
  }

  return {
    label,
    score: Math.max(-1, Math.min(1, avgScore)),
    color: REGIME_COLOR[label],
    desc: REGIME_DESC[label],
    alertCount,
    warnCount,
    infoCount,
    drivers,
  };
}
