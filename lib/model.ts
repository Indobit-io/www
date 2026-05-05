// Parameter effects model — maps macro parameters to money flow intensities and market impacts

export interface MacroParams {
  fedRate: number;       // Fed Funds Rate % (0–10)
  qeSize: number;        // Fed Balance Sheet $T (4–10)
  inflation: number;     // CPI YoY % (0–10)
  riskAppetite: number;  // -1 (risk-off) to +1 (risk-on)
}

export const DEFAULT_PARAMS: MacroParams = {
  fedRate: 5.25,
  qeSize: 7.0,
  inflation: 3.2,
  riskAppetite: 0,
};

export type NodeId =
  | "fed"
  | "treasury"
  | "banks"
  | "rrp"
  | "mmf"
  | "bonds"
  | "equities"
  | "economy"
  | "gold"
  | "crypto";

export interface FlowNode {
  id: NodeId;
  label: string;
  sublabel: string;
  value?: string;   // Live data display
  heat: number;     // 0–1 activity level → node glow intensity
  color: string;    // Border/text color
}

export interface FlowEdge {
  id: string;
  from: NodeId;
  to: NodeId;
  intensity: number;  // 0–1 → stroke width + animation speed
  color: string;
  label?: string;
}

export interface MarketImpact {
  label: string;
  metricId: string;
  value: string;
  direction: "up" | "down" | "flat";
  magnitude: number;  // 0–3
  reason: string;
  color: string;      // value color
}

export interface ModelOutput {
  nodes: FlowNode[];
  edges: FlowEdge[];
  impacts: MarketImpact[];
  liquidityScore: number;   // -1 (tight) to +1 (loose)
  regimeLabel: string;
  regimeColor: string;
  regimeDesc: string;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

// Map a value in [lo,hi] to [0,1]
function norm(v: number, lo: number, hi: number): number {
  return clamp((v - lo) / (hi - lo), 0, 1);
}

export function computeModel(
  params: MacroParams,
  liveValues: Partial<Record<string, number>> = {}
): ModelOutput {
  const { fedRate, qeSize, inflation, riskAppetite } = params;

  // ── Derived intermediates ─────────────────────────────────────────────
  // normalised inputs: 0 = low/neutral, 1 = high/extreme
  const rateNorm = norm(fedRate, 0, 10);          // higher = tighter
  const qeNorm = norm(qeSize, 4, 10);             // higher = looser
  const inflNorm = norm(inflation, 0, 10);        // higher = more inflation
  const riskNorm = (riskAppetite + 1) / 2;        // 0=risk-off, 1=risk-on

  // QE vs QT: above 7T = expanding (QE), below = shrinking (QT)
  const isQE = qeSize > 7.0;
  const qeStrength = clamp((qeSize - 7.0) / 2.0, -1, 1); // -1=QT, +1=QE

  // Overall liquidity score: -1 (tight) to +1 (loose)
  let liquidityScore = 0;
  liquidityScore -= (fedRate - 3) * 0.12;   // rate above 3% = tighter
  liquidityScore += qeStrength * 0.35;       // QE loosens, QT tightens
  liquidityScore -= (inflation - 2) * 0.06; // inflation > 2% = pressure
  liquidityScore += riskAppetite * 0.2;
  liquidityScore = clamp(liquidityScore, -1, 1);

  // ── Edge intensities ────────────────────────────────────────────────
  // Fed → Banks: reserves. High in QE, lower in QT
  const fedToBanks = clamp(0.5 + qeStrength * 0.5, 0.05, 1.0);

  // Fed → Bonds (QE purchases): only flows positively in QE
  const fedToBonds = clamp(qeStrength * 0.8, 0, 1);

  // Banks → RRP (excess reserves parked at Fed): high rate = more parking
  const banksToRRP = clamp(rateNorm * 0.9, 0.05, 0.95);

  // Banks → Economy (credit): high rate = less lending
  const banksToEconomy = clamp(1.0 - rateNorm * 0.8, 0.1, 0.9);

  // Banks → MMF: stable but grows with rate (MMF yields attractive)
  const banksToMMF = clamp(0.3 + rateNorm * 0.4, 0.2, 0.7);

  // Treasury → Bonds (constant issuance)
  const treasuryToBonds = 0.75;

  // MMF → Bonds (MMF buys short-term treasuries): grows with rate attractiveness
  const mmfToBonds = clamp(0.4 + rateNorm * 0.4, 0.3, 0.85);

  // Bonds → Equities: INVERSE — high yields pull money OUT of equities
  // Positive value = flow from equities TO bonds (risk-off)
  const bondsToEquities = clamp(1.0 - rateNorm * 0.9 + riskNorm * 0.4, 0.05, 0.95);

  // Equities → Economy (wealth effect, dividends)
  const equitiesToEconomy = clamp(riskNorm * 0.7, 0.1, 0.8);

  // Economy → Crypto (speculation): risk-on drives crypto flows
  const economyToCrypto = clamp(riskNorm * 0.9 - inflNorm * 0.2, 0.05, 0.9);

  // Economy → Gold (inflation hedge + safe haven)
  const economyToGold = clamp(inflNorm * 0.6 + (1 - riskNorm) * 0.5, 0.05, 0.95);

  // ── Node heat ───────────────────────────────────────────────────────
  const fedHeat = clamp(Math.abs(qeStrength) * 0.8 + 0.2, 0.2, 1);
  const banksHeat = clamp(fedToBanks * 0.5 + banksToEconomy * 0.5, 0.1, 1);
  const rrpHeat = banksToRRP;
  const mmfHeat = clamp(banksToMMF * 0.6 + 0.3, 0.2, 0.9);
  const bondsHeat = clamp((fedToBonds + treasuryToBonds) * 0.5, 0.3, 0.9);
  const equitiesHeat = clamp(bondsToEquities * 0.6 + riskNorm * 0.4, 0.1, 0.9);
  const goldHeat = economyToGold;
  const cryptoHeat = economyToCrypto;
  const economyHeat = clamp(banksToEconomy * 0.7 + equitiesToEconomy * 0.3, 0.1, 0.9);
  const treasuryHeat = 0.6;

  const liveDisplay = (id: string, fmt: (v: number) => string) => {
    const v = liveValues[id];
    return v != null ? fmt(v) : undefined;
  };

  const nodes: FlowNode[] = [
    {
      id: "fed",
      label: "Federal Reserve",
      sublabel: "Central Bank",
      value: liveDisplay("fed_bs", (v) => `$${v.toFixed(1)}T`),
      heat: fedHeat,
      color: "#00ff41",
    },
    {
      id: "treasury",
      label: "US Treasury",
      sublabel: "Gov't Debt",
      value: undefined,
      heat: treasuryHeat,
      color: "#7ab8f5",
    },
    {
      id: "banks",
      label: "Commercial Banks",
      sublabel: "Credit System",
      value: undefined,
      heat: banksHeat,
      color: "#00d4aa",
    },
    {
      id: "rrp",
      label: "ON RRP",
      sublabel: "Overnight Repo",
      value: liveDisplay("rrp", (v) => `$${v.toFixed(0)}B`),
      heat: rrpHeat,
      color: "#00d4aa",
    },
    {
      id: "mmf",
      label: "Money Markets",
      sublabel: "MMF / Cash",
      value: liveDisplay("mmf", (v) => `$${v.toFixed(1)}T`),
      heat: mmfHeat,
      color: "#00d4aa",
    },
    {
      id: "bonds",
      label: "Bond Market",
      sublabel: "Treasuries",
      value: liveDisplay("yield_10y", (v) => `${v.toFixed(2)}%`),
      heat: bondsHeat,
      color: "#ffb300",
    },
    {
      id: "equities",
      label: "Equity Markets",
      sublabel: "S&P 500 / Risk",
      value: liveDisplay("sp500", (v) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })),
      heat: equitiesHeat,
      color: "#ffb300",
    },
    {
      id: "economy",
      label: "Real Economy",
      sublabel: "Credit / GDP",
      value: liveDisplay("cpi", (v) => `CPI ${v.toFixed(1)}%`),
      heat: economyHeat,
      color: "#ff8c42",
    },
    {
      id: "gold",
      label: "Gold",
      sublabel: "Safe Haven",
      value: liveDisplay("gold", (v) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`),
      heat: goldHeat,
      color: "#ffd700",
    },
    {
      id: "crypto",
      label: "Crypto",
      sublabel: "Risk / Liquidity",
      value: liveDisplay("btc", (v) => `$${(v / 1000).toFixed(0)}k`),
      heat: cryptoHeat,
      color: "#9945ff",
    },
  ];

  const edgeColor = (intensity: number, baseColor = "#00ff41") => {
    return intensity < 0.15 ? "#1a3a1a" : baseColor;
  };

  const edges: FlowEdge[] = [
    {
      id: "fed-banks",
      from: "fed",
      to: "banks",
      intensity: fedToBanks,
      color: edgeColor(fedToBanks),
      label: isQE ? "QE" : "QT",
    },
    {
      id: "fed-bonds",
      from: "fed",
      to: "bonds",
      intensity: fedToBonds,
      color: edgeColor(fedToBonds),
      label: "QE",
    },
    {
      id: "banks-rrp",
      from: "banks",
      to: "rrp",
      intensity: banksToRRP,
      color: edgeColor(banksToRRP, "#00d4aa"),
      label: "park",
    },
    {
      id: "banks-economy",
      from: "banks",
      to: "economy",
      intensity: banksToEconomy,
      color: edgeColor(banksToEconomy, "#ff8c42"),
      label: "credit",
    },
    {
      id: "banks-mmf",
      from: "banks",
      to: "mmf",
      intensity: banksToMMF,
      color: edgeColor(banksToMMF, "#00d4aa"),
    },
    {
      id: "treasury-bonds",
      from: "treasury",
      to: "bonds",
      intensity: treasuryToBonds,
      color: edgeColor(treasuryToBonds, "#7ab8f5"),
      label: "issue",
    },
    {
      id: "mmf-bonds",
      from: "mmf",
      to: "bonds",
      intensity: mmfToBonds,
      color: edgeColor(mmfToBonds, "#ffb300"),
    },
    {
      id: "bonds-equities",
      from: "bonds",
      to: "equities",
      intensity: bondsToEquities,
      color: edgeColor(bondsToEquities, "#ffb300"),
    },
    {
      id: "equities-economy",
      from: "equities",
      to: "economy",
      intensity: equitiesToEconomy,
      color: edgeColor(equitiesToEconomy, "#ff8c42"),
    },
    {
      id: "economy-gold",
      from: "economy",
      to: "gold",
      intensity: economyToGold,
      color: edgeColor(economyToGold, "#ffd700"),
    },
    {
      id: "economy-crypto",
      from: "economy",
      to: "crypto",
      intensity: economyToCrypto,
      color: edgeColor(economyToCrypto, "#9945ff"),
    },
  ];

  // ── Market Impacts ──────────────────────────────────────────────────
  const impacts: MarketImpact[] = [
    {
      label: "S&P 500",
      metricId: "sp500",
      value: liveValues["sp500"]
        ? liveValues["sp500"].toLocaleString("en-US", { maximumFractionDigits: 0 })
        : "—",
      direction:
        bondsToEquities > 0.55 ? "up" : bondsToEquities < 0.35 ? "down" : "flat",
      magnitude: Math.round(Math.abs(bondsToEquities - 0.5) * 6),
      reason:
        rateNorm > 0.6
          ? "High rates compress equity valuations"
          : riskNorm > 0.6
          ? "Risk-on sentiment supports equities"
          : "Neutral rate environment",
      color:
        bondsToEquities > 0.55
          ? "#00ff41"
          : bondsToEquities < 0.35
          ? "#ff3333"
          : "#7ab87a",
    },
    {
      label: "10Y Yield",
      metricId: "yield_10y",
      value: liveValues["yield_10y"] ? `${liveValues["yield_10y"].toFixed(2)}%` : "—",
      direction: rateNorm > 0.55 ? "up" : rateNorm < 0.35 ? "down" : "flat",
      magnitude: Math.round(Math.abs(rateNorm - 0.5) * 6),
      reason:
        rateNorm > 0.6
          ? "Fed hikes drive short end; long end follows"
          : isQE
          ? "QE suppresses long-end yields"
          : "Rate normalization path",
      color:
        rateNorm > 0.55 ? "#ff3333" : rateNorm < 0.35 ? "#00ff41" : "#7ab87a",
    },
    {
      label: "US Dollar",
      metricId: "dxy",
      value: liveValues["dxy"] ? liveValues["dxy"].toFixed(1) : "—",
      direction: rateNorm > 0.55 ? "up" : qeStrength > 0.3 ? "down" : "flat",
      magnitude: Math.round(
        clamp(Math.abs(rateNorm - 0.5) * 4 + Math.abs(qeStrength) * 2, 0, 3)
      ),
      reason:
        rateNorm > 0.6
          ? "Rate differential attracts capital to USD"
          : qeStrength > 0.3
          ? "Balance sheet expansion dilutes dollar"
          : "Dollar in equilibrium",
      color:
        rateNorm > 0.55 ? "#00ff41" : qeStrength > 0.3 ? "#ff3333" : "#7ab87a",
    },
    {
      label: "Gold",
      metricId: "gold",
      value: liveValues["gold"]
        ? `$${liveValues["gold"].toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : "—",
      direction:
        economyToGold > 0.55 ? "up" : economyToGold < 0.35 ? "down" : "flat",
      magnitude: Math.round(Math.abs(economyToGold - 0.5) * 6),
      reason:
        inflNorm > 0.4
          ? "Inflation erodes real yields, boosts gold"
          : riskNorm < 0.35
          ? "Risk-off flight to safe haven"
          : "Gold under pressure from risk appetite",
      color:
        economyToGold > 0.55
          ? "#ffd700"
          : economyToGold < 0.35
          ? "#ff3333"
          : "#7ab87a",
    },
    {
      label: "Bitcoin",
      metricId: "btc",
      value: liveValues["btc"]
        ? `$${(liveValues["btc"] / 1000).toFixed(0)}k`
        : "—",
      direction:
        economyToCrypto > 0.5 ? "up" : economyToCrypto < 0.3 ? "down" : "flat",
      magnitude: Math.round(Math.abs(economyToCrypto - 0.4) * 5),
      reason:
        riskNorm > 0.65
          ? "Risk-on liquidity pours into crypto"
          : rateNorm > 0.65
          ? "High rates drain speculative capital"
          : "Crypto follows broad risk appetite",
      color:
        economyToCrypto > 0.5
          ? "#9945ff"
          : economyToCrypto < 0.3
          ? "#ff3333"
          : "#7ab87a",
    },
    {
      label: "VIX",
      metricId: "vix",
      value: liveValues["vix"] ? liveValues["vix"].toFixed(1) : "—",
      direction:
        riskNorm < 0.35 ? "up" : riskNorm > 0.65 ? "down" : "flat",
      magnitude: Math.round(Math.abs(riskNorm - 0.5) * 6),
      reason:
        riskNorm < 0.35
          ? "Risk-off conditions elevate fear gauge"
          : riskNorm > 0.65
          ? "Complacency suppresses volatility"
          : "Volatility in neutral zone",
      color:
        riskNorm < 0.35
          ? "#ff3333"
          : riskNorm > 0.65
          ? "#ffb300"
          : "#7ab87a",
    },
    {
      label: "Credit / Loans",
      metricId: "economy",
      value: liveValues["cpi"] ? `CPI ${liveValues["cpi"].toFixed(1)}%` : "—",
      direction:
        banksToEconomy > 0.6 ? "up" : banksToEconomy < 0.35 ? "down" : "flat",
      magnitude: Math.round(Math.abs(banksToEconomy - 0.5) * 6),
      reason:
        rateNorm > 0.6
          ? "High rates choke credit growth"
          : rateNorm < 0.3
          ? "Cheap money floods into credit"
          : "Moderate credit conditions",
      color:
        banksToEconomy > 0.6
          ? "#00ff41"
          : banksToEconomy < 0.35
          ? "#ff3333"
          : "#7ab87a",
    },
    {
      label: "Stablecoins",
      metricId: "stablecoins",
      value: liveValues["stablecoins"] ? `$${liveValues["stablecoins"].toFixed(0)}B` : "—",
      direction: riskNorm > 0.55 ? "up" : "flat",
      magnitude: Math.round(riskNorm * 2),
      reason:
        riskNorm > 0.6
          ? "Risk-on drives capital into crypto rails"
          : "Stable flows in neutral environment",
      color: riskNorm > 0.55 ? "#9945ff" : "#7ab87a",
    },
  ];

  // ── Regime ───────────────────────────────────────────────────────────
  let regimeLabel: string;
  let regimeColor: string;
  let regimeDesc: string;

  if (liquidityScore < -0.5) {
    regimeLabel = "CRISIS";
    regimeColor = "#ff3333";
    regimeDesc = "Severe tightening. Capital seeking safety. Credit crunch risk.";
  } else if (liquidityScore < -0.2) {
    regimeLabel = "TIGHTENING";
    regimeColor = "#ff6b35";
    regimeDesc = "Restrictive policy. Liquidity draining from risk assets.";
  } else if (liquidityScore < 0.2) {
    regimeLabel = "NEUTRAL";
    regimeColor = "#7ab87a";
    regimeDesc = "Balanced conditions. No dominant directional bias.";
  } else if (liquidityScore < 0.5) {
    regimeLabel = "EASING";
    regimeColor = "#00d4aa";
    regimeDesc = "Accommodative policy. Liquidity expanding into risk assets.";
  } else {
    regimeLabel = "FLOOD";
    regimeColor = "#00ff41";
    regimeDesc = "Maximum liquidity injection. Risk assets and inflation elevated.";
  }

  return {
    nodes,
    edges,
    impacts,
    liquidityScore,
    regimeLabel,
    regimeColor,
    regimeDesc,
  };
}
