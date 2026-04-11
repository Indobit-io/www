import type { MetricId } from "./config";

export interface Signal {
  id: string;
  level: "info" | "warn" | "alert";
  tag: string;
  message: string;
}

type MetricValues = Partial<Record<MetricId, number>>;

export function generateSignals(values: MetricValues): Signal[] {
  const signals: Signal[] = [];

  const v = (id: MetricId): number | null => values[id] ?? null;

  // VIX signals
  const vix = v("vix");
  if (vix !== null) {
    if (vix > 40) {
      signals.push({
        id: "vix-panic",
        level: "alert",
        tag: "PANIC",
        message: `VIX at ${vix.toFixed(1)} — extreme fear, capitulation risk elevated`,
      });
    } else if (vix > 30) {
      signals.push({
        id: "vix-stress",
        level: "warn",
        tag: "STRESS",
        message: `VIX at ${vix.toFixed(1)} — elevated fear, capital seeking safety`,
      });
    } else if (vix < 13) {
      signals.push({
        id: "vix-complacency",
        level: "info",
        tag: "COMPLACENCY",
        message: `VIX at ${vix.toFixed(1)} — extreme calm, potential for sudden vol spike`,
      });
    } else if (vix < 15) {
      signals.push({
        id: "vix-calm",
        level: "info",
        tag: "CALM",
        message: `VIX at ${vix.toFixed(1)} — low fear, risk appetite elevated`,
      });
    }
  }

  // DXY signals
  const dxy = v("dxy");
  if (dxy !== null) {
    if (dxy < 95) {
      signals.push({
        id: "dxy-weak",
        level: "info",
        tag: "WEAK $",
        message: `DXY at ${dxy.toFixed(1)} — dollar weakness, tailwind for EM assets and commodities`,
      });
    } else if (dxy > 105) {
      signals.push({
        id: "dxy-strong",
        level: "warn",
        tag: "STRONG $",
        message: `DXY at ${dxy.toFixed(1)} — dollar strength, headwind for EM and commodities`,
      });
    }
  }

  // Oil signals
  const oil = v("oil");
  if (oil !== null) {
    if (oil > 90) {
      signals.push({
        id: "oil-shock",
        level: "warn",
        tag: "OIL SHOCK",
        message: `Brent at $${oil.toFixed(0)}/bbl — elevated energy costs, inflationary pressure`,
      });
    } else if (oil < 50) {
      signals.push({
        id: "oil-low",
        level: "info",
        tag: "OIL SOFT",
        message: `Brent at $${oil.toFixed(0)}/bbl — weak energy prices, disinflationary signal`,
      });
    }
  }

  // Gold signals
  const gold = v("gold");
  if (gold !== null) {
    if (gold > 3000) {
      signals.push({
        id: "gold-haven",
        level: "warn",
        tag: "HAVEN BID",
        message: `Gold at $${gold.toFixed(0)}/oz — strong safe haven demand, risk-off positioning`,
      });
    } else if (gold > 2500) {
      signals.push({
        id: "gold-elevated",
        level: "info",
        tag: "GOLD ELEVATED",
        message: `Gold at $${gold.toFixed(0)}/oz — elevated, central bank buying and inflation hedging`,
      });
    }
  }

  // Money Market Funds
  const mmf = v("mmf");
  if (mmf !== null) {
    if (mmf > 6) {
      signals.push({
        id: "mmf-record",
        level: "info",
        tag: "DRY POWDER",
        message: `MMF assets at $${mmf.toFixed(2)}T — record cash on sidelines awaiting deployment`,
      });
    }
  }

  // 10Y Treasury Yield
  const yield10y = v("yield_10y");
  if (yield10y !== null) {
    if (yield10y > 4.5) {
      signals.push({
        id: "yield-tight",
        level: "warn",
        tag: "TIGHT",
        message: `10Y yield at ${yield10y.toFixed(2)}% — elevated rates, pressure on risk assets and growth`,
      });
    } else if (yield10y < 3.5) {
      signals.push({
        id: "yield-easy",
        level: "info",
        tag: "EASING",
        message: `10Y yield at ${yield10y.toFixed(2)}% — falling rates signal easing expectations`,
      });
    }
  }

  // Stablecoins
  const stablecoins = v("stablecoins");
  if (stablecoins !== null) {
    if (stablecoins > 200) {
      signals.push({
        id: "stable-growing",
        level: "info",
        tag: "CRYPTO LIQ",
        message: `Stablecoin supply at $${stablecoins.toFixed(0)}B — substantial capital parked in crypto ecosystem`,
      });
    }
  }

  // Fed Balance Sheet + RRP combo
  const rrp = v("rrp");
  const fedBs = v("fed_bs");
  if (rrp !== null && rrp < 100) {
    signals.push({
      id: "rrp-exhausted",
      level: "warn",
      tag: "RRP DRAINED",
      message: `ON RRP near zero ($${rrp.toFixed(0)}B) — liquidity buffer exhausted, next drain hits banks`,
    });
  }
  if (fedBs !== null) {
    if (fedBs > 8) {
      signals.push({
        id: "fed-bs-large",
        level: "info",
        tag: "QE LEGACY",
        message: `Fed balance sheet at $${fedBs.toFixed(2)}T — historically large, QT still in progress`,
      });
    } else if (fedBs < 5.5) {
      signals.push({
        id: "fed-bs-shrinking",
        level: "info",
        tag: "QT PROGRESS",
        message: `Fed balance sheet at $${fedBs.toFixed(2)}T — significant QT achieved, nearing neutral zone`,
      });
    }
  }

  // Fed Rate
  const fedRate = v("fed_rate");
  if (fedRate !== null) {
    if (fedRate >= 5) {
      signals.push({
        id: "rate-restrictive",
        level: "warn",
        tag: "RESTRICTIVE",
        message: `Fed funds at ${fedRate.toFixed(2)}% — policy in restrictive territory, tightening financial conditions`,
      });
    } else if (fedRate <= 1) {
      signals.push({
        id: "rate-accommodative",
        level: "info",
        tag: "ACCOMMODATIVE",
        message: `Fed funds at ${fedRate.toFixed(2)}% — near-zero rates, highly accommodative monetary policy`,
      });
    }
  }

  return signals;
}
