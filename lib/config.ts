export type MetricId =
  | "fed_rate"
  | "fed_bs"
  | "rrp"
  | "mmf"
  | "sp500"
  | "vix"
  | "dxy"
  | "gold"
  | "yield_10y"
  | "oil"
  | "btc"
  | "stablecoins";

export interface MetricConfig {
  label: string;
  unit: string;
  low: number;
  high: number;
  category: string;
  desc: string;
  decimals?: number;
}

export const METRIC_CONFIG: Record<MetricId, MetricConfig> = {
  fed_rate: {
    label: "Fed Funds Rate",
    unit: "%",
    low: 0,
    high: 6,
    category: "Monetary Policy",
    desc: "Target rate set by FOMC. Higher = tighter money.",
    decimals: 2,
  },
  fed_bs: {
    label: "Fed Balance Sheet",
    unit: "$T",
    low: 4,
    high: 9,
    category: "Monetary Policy",
    desc: "Total Fed assets. Shrinking via QT = tightening.",
    decimals: 2,
  },
  rrp: {
    label: "Reverse Repo (ON RRP)",
    unit: "$B",
    low: 0,
    high: 2500,
    category: "Monetary Policy",
    desc: "Cash parked at Fed overnight. Near zero = liquidity buffer exhausted.",
    decimals: 1,
  },
  mmf: {
    label: "Money Market Funds",
    unit: "$T",
    low: 3,
    high: 8,
    category: "Cash Positioning",
    desc: "Total MMF assets. Record highs = massive dry powder on sidelines.",
    decimals: 2,
  },
  sp500: {
    label: "S&P 500",
    unit: "",
    low: 4000,
    high: 7500,
    category: "Risk Appetite",
    desc: "US large-cap equity benchmark.",
    decimals: 0,
  },
  vix: {
    label: "VIX",
    unit: "",
    low: 9,
    high: 50,
    category: "Risk Appetite",
    desc: "Fear gauge. <15 calm, 20–25 cautious, >30 fear, >50 panic.",
    decimals: 2,
  },
  dxy: {
    label: "US Dollar Index",
    unit: "",
    low: 85,
    high: 115,
    category: "Dollar",
    desc: "Dollar vs basket of 6 currencies. >100 strong, <95 weak.",
    decimals: 2,
  },
  gold: {
    label: "Gold",
    unit: "$/oz",
    low: 1800,
    high: 5500,
    category: "Safe Havens",
    desc: "Safe haven, inflation hedge. Central bank buying drives structural demand.",
    decimals: 0,
  },
  yield_10y: {
    label: "10Y Treasury Yield",
    unit: "%",
    low: 1,
    high: 6,
    category: "Safe Havens",
    desc: "Benchmark rate. Rising = tighter conditions, falling = rate cut expectations.",
    decimals: 2,
  },
  oil: {
    label: "Brent Crude",
    unit: "$/bbl",
    low: 40,
    high: 140,
    category: "Energy",
    desc: "Global oil benchmark. Drives inflation expectations and consumer spending.",
    decimals: 2,
  },
  btc: {
    label: "Bitcoin",
    unit: "$",
    low: 15000,
    high: 120000,
    category: "Crypto Liquidity",
    desc: "Crypto risk appetite proxy. Sensitive to liquidity and macro sentiment.",
    decimals: 0,
  },
  stablecoins: {
    label: "Stablecoin Supply",
    unit: "$B",
    low: 50,
    high: 350,
    category: "Crypto Liquidity",
    desc: "Total stablecoin market cap. Growing = capital entering crypto ecosystem.",
    decimals: 1,
  },
};

export const CATEGORY_ORDER = [
  "Monetary Policy",
  "Cash Positioning",
  "Risk Appetite",
  "Dollar",
  "Safe Havens",
  "Energy",
  "Crypto Liquidity",
];

export const METRIC_IDS = Object.keys(METRIC_CONFIG) as MetricId[];
