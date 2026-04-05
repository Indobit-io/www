import { useState, useEffect, useRef, useCallback } from “react”;

// ─── Simulated On-Chain Data Engine ────────────────────────────────
const CHAINS = [
{ id: “btc”, name: “Bitcoin”, symbol: “BTC”, color: “#F7931A”, letter: “B” },
{ id: “eth”, name: “Ethereum”, symbol: “ETH”, color: “#627EEA”, letter: “E” },
{ id: “sol”, name: “Solana”, symbol: “SOL”, color: “#14F195”, letter: “S” },
{ id: “avax”, name: “Avalanche”, symbol: “AVAX”, color: “#E84142”, letter: “A” },
{ id: “bnb”, name: “BNB Chain”, symbol: “BNB”, color: “#F3BA2F”, letter: “B” },
{ id: “ada”, name: “Cardano”, symbol: “ADA”, color: “#0033AD”, letter: “C” },
{ id: “dot”, name: “Polkadot”, symbol: “DOT”, color: “#E6007A”, letter: “D” },
{ id: “matic”, name: “Polygon”, symbol: “POL”, color: “#8247E5”, letter: “P” },
];

function ChainIcon({ chainId, size = 24 }) {
const s = size;
const icons = {
btc: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15.7 11.3c.5-1.6-.6-2.5-1.7-3l.4-1.8-1.1-.3-.4 1.7c-.3-.1-.6-.1-.9-.2l.4-1.7-1.1-.3-.4 1.8c-.2-.1-.5-.1-.7-.2l-1.5-.4-.3 1.2s.8.2.8.2c.4.1.5.4.5.6l-.6 2.3c0 0 .1 0 .1 0l-.1 0-.8 3.2c-.1.1-.2.3-.5.3 0 0-.8-.2-.8-.2l-.5 1.3 1.4.3c.3.1.5.1.8.2l-.4 1.8 1.1.3.4-1.8c.3.1.6.1.9.2l-.4 1.8 1.1.3.4-1.8c2 .4 3.4.2 4-.1.5-2.1-.3-3-1.5-3.3.8-.3 1.3-.8 1.5-1.9zm-2.7 3.7c-.4 1.6-3 .7-3.9.5l.7-2.8c.8.2 3.6.6 3.2 2.3zm.4-3.8c-.4 1.5-2.6.7-3.3.5l.6-2.5c.7.2 3.1.5 2.7 2z" fill="#F7931A"/></svg>),
eth: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2L6 12.2l6 3.5 6-3.5L12 2z" fill="#627EEA" fillOpacity="0.8"/><path d="M6 12.2L12 22l6-9.8-6 3.5-6-3.5z" fill="#627EEA"/><path d="M12 2v7.8l6 2.4L12 2z" fill="#627EEA" fillOpacity="0.6"/></svg>),
sol: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="6" width="14" height="1.5" rx="0.3" fill="#14F195" fillOpacity="0.5"/><rect x="5" y="11.25" width="14" height="1.5" rx="0.3" fill="#14F195" fillOpacity="0.7"/><rect x="5" y="16.5" width="14" height="1.5" rx="0.3" fill="#14F195"/></svg>),
avax: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4L4 19h5.5l2.5-4.5L14.5 19H20L12 4z" fill="#E84142"/><path d="M8.5 19H4l4-7.2L10 15l-1.5 4z" fill="#E84142" fillOpacity="0.7"/></svg>),
bnb: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5l2 2-2 2-2-2 2-2zM7 10l2 2-2 2-2-2 2-2zM17 10l2 2-2 2-2-2 2-2zM12 15l2 2-2 2-2-2 2-2z" fill="#F3BA2F"/></svg>),
ada: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="1.5" fill="#3B82F6"/><circle cx="17" cy="9" r="1.5" fill="#3B82F6"/><circle cx="17" cy="15" r="1.5" fill="#3B82F6"/><circle cx="12" cy="18" r="1.5" fill="#3B82F6"/><circle cx="7" cy="15" r="1.5" fill="#3B82F6"/><circle cx="7" cy="9" r="1.5" fill="#3B82F6"/><circle cx="12" cy="12" r="2.5" fill="#3B82F6" fillOpacity="0.4"/></svg>),
dot: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="#E6007A"/><circle cx="12" cy="4.5" r="2" fill="#E6007A" fillOpacity="0.7"/><circle cx="12" cy="19.5" r="2" fill="#E6007A" fillOpacity="0.7"/></svg>),
matic: (<svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15.5 8.5L12 6.5 8.5 8.5v4l3.5 2 3.5-2v-4z" fill="#8247E5" fillOpacity="0.4"/><path d="M12 6.5l3.5 2v4L12 14.5V6.5z" fill="#8247E5" fillOpacity="0.7"/><path d="M12 6.5L8.5 8.5v4L12 14.5V6.5z" fill="#8247E5"/></svg>),
};
return icons[chainId] || <span style={{ fontSize: s * 0.7, fontWeight: 800 }}>?</span>;
}

function seededRandom(seed) {
let s = seed;
return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateChainData(chainId) {
const rng = seededRandom(chainId.split(””).reduce((a, c) => a + c.charCodeAt(0), 0) * 7 + 42);
const chain = CHAINS.find((c) => c.id === chainId);
const priceBase = { btc: 68400, eth: 3820, sol: 178, avax: 38, bnb: 612, ada: 0.48, dot: 7.2, matic: 0.58 }[chainId] || 100;
const mcap = { btc: 1340, eth: 458, sol: 78, avax: 14.2, bnb: 91, ada: 17, dot: 9.8, matic: 5.6 }[chainId] || 10;
const prices = []; let p = priceBase * (0.95 + rng() * 0.1);
for (let i = 0; i < 7; i++) { p *= 0.97 + rng() * 0.06; prices.push(p); }
const whaleNames = [“0x7a16…f3d2”,“0xdead…beef”,“0x3c44…9b71”,“0xf39F…2266”,“0x1234…abcd”,“0x9876…5432”,“0xabcd…ef01”,“0x5678…9012”];
const exchangeNames = [“Binance”,“Coinbase”,“Kraken”,“OKX”,“Bybit”,“Bitfinex”];
const stablecoins = [“USDT”,“USDC”,“DAI”,“BUSD”];
const whaleMovements = []; const numMoves = 12 + Math.floor(rng() * 8);
for (let i = 0; i < numMoves; i++) {
const isStable = rng() > 0.6; const amount = isStable ? (5 + rng() * 95) * 1e6 : (100 + rng() * 9900) * priceBase * 0.01;
const daysAgo = Math.floor(rng() * 7); const isExIn = rng() > 0.5;
whaleMovements.push({ id: i, asset: isStable ? stablecoins[Math.floor(rng() * stablecoins.length)] : chain.symbol, amount, from: isExIn ? whaleNames[Math.floor(rng() * whaleNames.length)] : exchangeNames[Math.floor(rng() * exchangeNames.length)], to: isExIn ? exchangeNames[Math.floor(rng() * exchangeNames.length)] : whaleNames[Math.floor(rng() * whaleNames.length)], daysAgo, type: isExIn ? “exchange_inflow” : “exchange_outflow”, isStablecoin: isStable });
}
whaleMovements.sort((a, b) => a.daysAgo - b.daysAgo);
const exchangeInflows = [], exchangeOutflows = [];
for (let i = 0; i < 7; i++) { exchangeInflows.push((800 + rng() * 2200) * (mcap / 100)); exchangeOutflows.push((600 + rng() * 2600) * (mcap / 100)); }
const netFlow = exchangeInflows.reduce((a, v, i) => a + v - exchangeOutflows[i], 0);
const totalInflow = exchangeInflows.reduce((a, v) => a + v, 0); const totalOutflow = exchangeOutflows.reduce((a, v) => a + v, 0);
const stableMinted = (50 + rng() * 450) * 1e6; const stableBurned = (30 + rng() * 300) * 1e6; const stableNetMint = stableMinted - stableBurned;
const outflowDominant = totalOutflow > totalInflow; const stableInflux = stableNetMint > 100e6;
let trendSignal, trendConfidence, trendReason;
if (outflowDominant && stableInflux) { trendSignal = “BULLISH”; trendConfidence = 65 + Math.floor(rng() * 20); trendReason = “Exchange outflows dominating + stablecoin minting surge suggests accumulation phase”; }
else if (!outflowDominant && !stableInflux) { trendSignal = “BEARISH”; trendConfidence = 60 + Math.floor(rng() * 20); trendReason = “Increasing exchange inflows + stablecoin redemptions signal potential sell pressure”; }
else if (outflowDominant && !stableInflux) { trendSignal = “CAUTIOUS BULL”; trendConfidence = 50 + Math.floor(rng() * 15); trendReason = “Whale accumulation ongoing but stablecoin dry powder is decreasing”; }
else { trendSignal = “NEUTRAL”; trendConfidence = 40 + Math.floor(rng() * 20); trendReason = “Mixed signals — exchange inflows rising but new stablecoins entering the ecosystem”; }
const insights = [];
const topWhale = whaleMovements.reduce((max, m) => m.amount > max.amount ? m : max, whaleMovements[0]);
insights.push({ type: “whale”, severity: topWhale.amount > 50e6 ? “high” : “medium”, text: `Largest transfer: ${formatUSD(topWhale.amount)} ${topWhale.asset} moved ${topWhale.type === "exchange_inflow" ? "to " + topWhale.to : "from " + topWhale.from}` });
insights.push({ type: “flow”, severity: Math.abs(netFlow) > totalInflow * 0.15 ? “high” : “medium”, text: `Net exchange flow: ${netFlow > 0 ? "+" : ""}${formatUSD(netFlow)} (${netFlow > 0 ? "inflow-heavy → sell pressure" : "outflow-heavy → accumulation"})` });
insights.push({ type: “stable”, severity: Math.abs(stableNetMint) > 200e6 ? “high” : “low”, text: `Stablecoin net ${stableNetMint > 0 ? "minting" : "burning"}: ${formatUSD(Math.abs(stableNetMint))} in 7d` });
insights.push({ type: “accumulation”, severity: outflowDominant ? “high” : “low”, text: outflowDominant ? `Whales absorbed ${formatUSD(totalOutflow - totalInflow)} more than deposited — accumulation mode` : `Exchange deposits exceed withdrawals by ${formatUSD(totalInflow - totalOutflow)} — distribution phase` });
return { chain, prices, priceChange: ((prices[6] - prices[0]) / prices[0]) * 100, currentPrice: prices[6], mcap, whaleMovements, exchangeInflows, exchangeOutflows, netFlow, totalInflow, totalOutflow, stableMinted, stableBurned, stableNetMint, trendSignal, trendConfidence, trendReason, insights };
}

function formatUSD(n) { const abs = Math.abs(n); if (abs >= 1e9) return “$” + (n / 1e9).toFixed(2) + “B”; if (abs >= 1e6) return “$” + (n / 1e6).toFixed(1) + “M”; if (abs >= 1e3) return “$” + (n / 1e3).toFixed(1) + “K”; return “$” + n.toFixed(2); }
function formatNum(n) { const abs = Math.abs(n); if (abs >= 1e9) return (n / 1e9).toFixed(2) + “B”; if (abs >= 1e6) return (n / 1e6).toFixed(1) + “M”; if (abs >= 1e3) return (n / 1e3).toFixed(1) + “K”; return n.toFixed(2); }

// ─── Macro Data ────────────────────────────────────────────────────
const MACRO_DATA = {
indicators: [
{ id: “fed_rate”, label: “Fed Funds Rate”, value: 4.50, unit: “%”, prev: 4.75, history: [5.50,5.50,5.25,5.00,4.75,4.50,4.50], cryptoImpact: “positive”, description: “Rate cuts signal easing — historically bullish for risk assets including crypto” },
{ id: “us10y”, label: “US 10Y Yield”, value: 4.18, unit: “%”, prev: 4.32, history: [4.65,4.52,4.41,4.38,4.32,4.25,4.18], cryptoImpact: “positive”, description: “Declining yields reduce opportunity cost of holding non-yielding assets like BTC” },
{ id: “dxy”, label: “DXY Index”, value: 103.2, unit: “”, prev: 104.8, history: [106.1,105.8,105.2,104.9,104.8,103.9,103.2], cryptoImpact: “positive”, description: “Weakening dollar typically drives capital into crypto as alternative store of value” },
{ id: “cpi”, label: “CPI YoY”, value: 2.8, unit: “%”, prev: 3.0, history: [3.4,3.3,3.2,3.1,3.0,2.9,2.8], cryptoImpact: “neutral”, description: “Inflation cooling toward target — supports rate cuts but reduces inflation-hedge narrative” },
{ id: “m2”, label: “Global M2”, value: 108.2, unit: “T”, prev: 106.5, history: [102.1,103.4,104.2,105.1,106.5,107.3,108.2], cryptoImpact: “positive”, description: “M2 expansion = more liquidity — historically strong correlation with BTC price” },
{ id: “fear”, label: “Fear & Greed”, value: 62, unit: “”, prev: 55, history: [38,42,48,51,55,58,62], cryptoImpact: “neutral”, description: “Transitioning to greed — momentum building but not yet overheated” },
],
get overallSignal() {
const pos = this.indicators.filter(i => i.cryptoImpact === “positive”).length;
if (pos >= 4) return { signal: “FAVORABLE”, color: “#22C55E”, summary: “Macro conditions aligning for risk assets. Rate cuts, declining yields, and expanding liquidity form a supportive backdrop for crypto.” };
if (pos <= 1) return { signal: “HEADWIND”, color: “#EF4444”, summary: “Tightening financial conditions and rising yields create headwinds for crypto.” };
return { signal: “MIXED”, color: “#F59E0B”, summary: “Mixed macro signals. Some indicators support crypto while others suggest caution.” };
}
};

// ─── Knowledge Base ────────────────────────────────────────────────
const KNOWLEDGE_BASE = {
macro: { title: “Macro Indicators”, icon: “📊”, articles: [
{ id: “fed”, title: “Federal Funds Rate”, tags: [“rates”,“fed”,“monetary policy”], content: “The interest rate at which banks lend to each other overnight, set by the Federal Reserve. When rates are cut, borrowing becomes cheaper, liquidity increases, and risk assets like crypto benefit. Rate hikes tighten conditions and historically correlate with crypto drawdowns. IndoBit tracks the current rate, direction, and pace of changes to gauge how monetary policy is shifting.” },
{ id: “yield”, title: “US 10-Year Treasury Yield”, tags: [“bonds”,“yield”,“treasury”], content: “The yield on 10-year US government bonds — the global benchmark "risk-free" rate. Rising yields mean investors earn more from safe bonds, reducing crypto’s appeal. Falling yields push capital toward higher-return assets like crypto. IndoBit monitors yield trajectory and the yield curve spread as a leading recession and liquidity signal.” },
{ id: “dxy”, title: “DXY (US Dollar Index)”, tags: [“dollar”,“forex”,“currency”], content: “DXY measures the dollar’s value against six major currencies. Crypto is priced in USD globally, so a weakening dollar makes crypto cheaper in relative terms and historically correlates with BTC rallies. IndoBit uses DXY trend direction as a key macro overlay for crypto trend prediction.” },
{ id: “cpi”, title: “CPI & Inflation”, tags: [“inflation”,“cpi”,“prices”], content: “The Consumer Price Index measures average change in consumer prices. High inflation can drive demand for "hard money" assets like Bitcoin, but also triggers rate hikes which hurt crypto. The sweet spot is moderately declining inflation enabling rate cuts. IndoBit tracks CPI trajectory and its distance from the Fed’s 2% target.” },
{ id: “m2”, title: “Global M2 Money Supply”, tags: [“liquidity”,“money supply”,“m2”], content: “M2 includes cash, checking deposits, savings, and money market funds. When central banks expand M2, excess liquidity flows into risk assets including crypto. The correlation between global M2 growth and Bitcoin price has been remarkably strong over multi-month periods. IndoBit tracks M2 expansion/contraction as a leading indicator for crypto market cycles.” },
{ id: “fear”, title: “Fear & Greed Index”, tags: [“sentiment”,“fear”,“greed”], content: “A composite sentiment indicator (0-100) aggregating volatility, momentum, social media, dominance, and trends. Extreme fear (<20) often signals buying opportunities. Extreme greed (>80) signals caution. IndoBit uses this as a contrarian timing signal: when greed is high AND whales are selling, the signal is particularly bearish.” },
]},
onchain: { title: “On-Chain Metrics”, icon: “⛓️”, articles: [
{ id: “whale”, title: “Whale Wallet Tracking”, tags: [“whales”,“wallets”,“tracking”], content: “"Whales" are addresses holding large amounts of crypto (typically >1,000 BTC or equivalent). IndoBit monitors known whale wallets — moves TO exchanges often precede selling, moves OFF exchanges signal long-term holding conviction. We track transfer size, destination, frequency, and whether it’s the native token or stablecoins.” },
{ id: “exflow”, title: “Exchange Inflows & Outflows”, tags: [“exchange”,“flow”,“inflow”,“outflow”], content: “Exchange flow measures net movement of assets into/out of centralized exchanges. Inflows typically precede selling — users deposit to sell. Outflows signal accumulation — users move to self-custody. IndoBit calculates net flow daily and looks for sustained directional trends. A week of heavy outflows is one of the strongest bullish on-chain signals.” },
{ id: “stable”, title: “Stablecoin Minting & Burning”, tags: [“stablecoin”,“USDT”,“USDC”,“minting”], content: “When stablecoin issuers mint new tokens, fresh USD-backed capital enters the ecosystem — "dry powder" ready to buy. Burning means capital is leaving. IndoBit tracks net minting across USDT, USDC, DAI, and BUSD. A surge in minting during a dip is strongly bullish — large players are preparing to buy.” },
{ id: “netflow”, title: “Net Flow Analysis”, tags: [“netflow”,“analysis”], content: “Net flow = total exchange inflows minus outflows. Positive = bearish (sell pressure building). Negative = bullish (accumulation). IndoBit combines net flow with stablecoin flow and whale behavior to produce the trend confidence gauge. We weight recent days more heavily and track acceleration in flow trends.” },
{ id: “accum”, title: “Accumulation vs Distribution”, tags: [“accumulation”,“distribution”,“phases”], content: “Accumulation: large holders buying or withdrawing from exchanges. Distribution: selling or depositing. IndoBit identifies the phase by combining exchange outflow dominance, whale balance changes, stablecoin availability, and price action. Accumulation during price dips is the strongest bullish on-chain signal.” },
{ id: “trend”, title: “Trend Prediction Model”, tags: [“prediction”,“model”,“trend”], content: “IndoBit’s prediction combines macro + on-chain data for a directional confidence score. Weights: exchange flow direction (30%), stablecoin minting (25%), whale behavior (20%), macro environment (15%), sentiment (10%). Confidence caps at 85% — crypto remains inherently unpredictable despite strong signals.” },
]},
};

// ─── Default Alerts ────────────────────────────────────────────────
const DEFAULT_ALERTS = [
{ id: “whale_large”, cat: “onchain”, label: “Large Whale Transfer”, desc: “Single transfer exceeds $50M”, enabled: true, threshold: “$50M”, icon: “🐋” },
{ id: “ex_inflow”, cat: “onchain”, label: “Exchange Inflow Spike”, desc: “Daily inflow exceeds 2x 7-day average”, enabled: true, threshold: “2x avg”, icon: “📥” },
{ id: “ex_outflow”, cat: “onchain”, label: “Exchange Outflow Spike”, desc: “Daily outflow exceeds 2x 7-day average”, enabled: false, threshold: “2x avg”, icon: “📤” },
{ id: “stable_mint”, cat: “onchain”, label: “Stablecoin Minting”, desc: “>$200M stablecoins minted in 24h”, enabled: true, threshold: “$200M”, icon: “🏦” },
{ id: “trend_chg”, cat: “signal”, label: “Trend Signal Change”, desc: “Any chain’s trend shifts direction”, enabled: true, threshold: “any shift”, icon: “🔄” },
{ id: “fed_rate”, cat: “macro”, label: “Fed Rate Decision”, desc: “Federal Reserve rate changes”, enabled: true, threshold: “any change”, icon: “🏛️” },
{ id: “dxy_move”, cat: “macro”, label: “DXY Large Move”, desc: “DXY moves more than 1% in a day”, enabled: false, threshold: “1% daily”, icon: “💵” },
{ id: “fear_ext”, cat: “macro”, label: “Extreme Sentiment”, desc: “Fear & Greed reaches <20 or >80”, enabled: true, threshold: “<20 / >80”, icon: “😱” },
{ id: “price_drop”, cat: “price”, label: “Flash Crash Alert”, desc: “Any chain drops >8% in 24h”, enabled: true, threshold: “−8%”, icon: “📉” },
{ id: “price_pump”, cat: “price”, label: “Price Surge Alert”, desc: “Any chain pumps >10% in 24h”, enabled: false, threshold: “+10%”, icon: “🚀” },
];

const CHAIN_PREVIEWS = Object.fromEntries(CHAINS.map(c => { const d = generateChainData(c.id); return [c.id, { trendSignal: d.trendSignal, trendConfidence: d.trendConfidence, priceChange: d.priceChange }]; }));

// ─── Shared Components ─────────────────────────────────────────────
function Sparkline({ data, color, height = 48, width = 140, filled = false }) {
if (!data || data.length < 2) return null;
const min = Math.min(…data), max = Math.max(…data), range = max - min || 1;
const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`);
const line = `M${pts.join(" L")}`;
return (<svg width={width} height={height} style={{ display: “block” }}>{filled && <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} fillOpacity=“0.12” />}<path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function MiniLine({ data, color, w = 56, h = 20 }) {
if (!data || data.length < 2) return null;
const min = Math.min(…data), max = Math.max(…data), range = max - min || 1;
return (<svg width={w} height={h} style={{ display: “block” }}><path d={`M${data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`).join(" L")}`} fill=“none” stroke={color} strokeWidth=“1.5” strokeLinecap=“round” strokeLinejoin=“round” /></svg>);
}
function BarChart({ inflows, outflows }) {
const days = [“M”,“T”,“W”,“T”,“F”,“S”,“S”], max = Math.max(…inflows,…outflows);
return (<div style={{ display: “flex”, gap: 6, alignItems: “flex-end”, height: 100, padding: “0 4px” }}>{inflows.map((inf, i) => (<div key={i} style={{ flex: 1, display: “flex”, flexDirection: “column”, alignItems: “center”, gap: 2 }}><div style={{ display: “flex”, gap: 2, alignItems: “flex-end”, height: 80 }}><div style={{ width: 8, height: (inf / max) * 80, background: “#EF4444”, borderRadius: 2, opacity: 0.8, transition: “height 0.5s” }} /><div style={{ width: 8, height: (outflows[i] / max) * 80, background: “#22C55E”, borderRadius: 2, opacity: 0.8, transition: “height 0.5s” }} /></div><span style={{ fontSize: 9, color: “#6B7280”, fontFamily: “monospace” }}>{days[i]}</span></div>))}</div>);
}

function ConfidenceGauge({ value, signal }) {
const [av, setAv] = useState(0); const fr = useRef(null);
useEffect(() => { let s = null; const run = (ts) => { if (!s) s = ts; const p = Math.min((ts - s) / 1200, 1); setAv((1 - Math.pow(1 - p, 3)) * value); if (p < 1) fr.current = requestAnimationFrame(run); }; fr.current = requestAnimationFrame(run); return () => { if (fr.current) cancelAnimationFrame(fr.current); }; }, [value]);
const color = signal.includes(“BULL”) ? “#22C55E” : signal === “BEARISH” ? “#EF4444” : “#F59E0B”;
const rot = (av / 100) * 180 - 90;
return (<div style={{ position: “relative”, width: 120, height: 68, margin: “0 auto” }}><svg width="120" height="68" viewBox="0 0 120 68"><path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" /><path d=“M10 60 A50 50 0 0 1 110 60” fill=“none” stroke={color} strokeWidth=“8” strokeLinecap=“round” strokeDasharray={`${(av / 100) * 157} 157`} /><circle cx={60 + 36 * Math.cos((rot - 90) * Math.PI / 180)} cy={60 + 36 * Math.sin((rot - 90) * Math.PI / 180)} r=“6” fill={color} fillOpacity=“0.2” /><line x1=“60” y1=“60” x2=“60” y2=“24” stroke={color} strokeWidth=“2.5” strokeLinecap=“round” transform={`rotate(${rot}, 60, 60)`} /><circle cx="60" cy="60" r="4" fill={color} /><circle cx="60" cy="60" r="2" fill="#0A0B0F" /></svg><div style={{ textAlign: “center”, marginTop: 2 }}><span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: “‘JetBrains Mono’, monospace” }}>{Math.round(av)}%</span></div></div>);
}

function MiniGauge({ value, signal, delay = 0 }) {
const [av, setAv] = useState(0); const fr = useRef(null);
useEffect(() => { const t = setTimeout(() => { let s = null; const run = (ts) => { if (!s) s = ts; const p = Math.min((ts - s) / 1000, 1); setAv((1 - Math.pow(1 - p, 3)) * value); if (p < 1) fr.current = requestAnimationFrame(run); }; fr.current = requestAnimationFrame(run); }, delay); return () => { clearTimeout(t); if (fr.current) cancelAnimationFrame(fr.current); }; }, [value, delay]);
const color = signal.includes(“BULL”) ? “#22C55E” : signal === “BEARISH” ? “#EF4444” : “#F59E0B”;
const rot = (av / 100) * 180 - 90;
return (<div style={{ display: “flex”, flexDirection: “column”, alignItems: “center” }}><svg width="72" height="42" viewBox="0 0 72 42"><path d="M6 36 A30 30 0 0 1 66 36" fill="none" stroke="#1F2937" strokeWidth="5" strokeLinecap="round" /><path d=“M6 36 A30 30 0 0 1 66 36” fill=“none” stroke={color} strokeWidth=“5” strokeLinecap=“round” strokeDasharray={`${(av / 100) * 94} 94`} /><line x1=“36” y1=“36” x2=“36” y2=“14” stroke={color} strokeWidth=“2” strokeLinecap=“round” transform={`rotate(${rot}, 36, 36)`} /><circle cx="36" cy="36" r="3" fill={color} /><circle cx="36" cy="36" r="1.5" fill="#111318" /></svg><div style={{ fontSize: 8, fontWeight: 800, color, fontFamily: “‘JetBrains Mono’, monospace”, marginTop: 2 }}>{signal.replace(“CAUTIOUS “,“C.”)}</div></div>);
}

function MovementRow({ m, chainColor }) {
const isIn = m.type === “exchange_inflow”;
return (<div style={{ display: “flex”, alignItems: “center”, gap: 10, padding: “10px 0”, borderBottom: “1px solid rgba(255,255,255,0.04)” }}><div style={{ width: 32, height: 32, borderRadius: 8, background: isIn ? “rgba(239,68,68,0.15)” : “rgba(34,197,94,0.15)”, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: 14, flexShrink: 0 }}>{isIn ? “↗” : “↙”}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}><span style={{ fontSize: 13, fontWeight: 600, color: “#E5E7EB”, fontFamily: “‘JetBrains Mono’, monospace” }}>{formatNum(m.amount)} <span style={{ color: m.isStablecoin ? “#F59E0B” : chainColor, fontSize: 11 }}>{m.asset}</span></span><span style={{ fontSize: 10, color: “#6B7280” }}>{m.daysAgo === 0 ? “today” : `${m.daysAgo}d ago`}</span></div><div style={{ fontSize: 10, color: “#6B7280”, marginTop: 2, fontFamily: “monospace” }}><span style={{ color: isIn ? “#EF4444” : “#9CA3AF” }}>{m.from}</span> → <span style={{ color: isIn ? “#9CA3AF” : “#22C55E” }}>{m.to}</span></div></div></div>);
}

// ─── Macro Dashboard ───────────────────────────────────────────────
function MacroDashboard({ expanded, onToggle }) {
const overall = MACRO_DATA.overallSignal;
return (
<div style={{ padding: “0 16px”, marginBottom: 8 }}>
<div onClick={onToggle} style={{ padding: 16, background: `linear-gradient(135deg, ${overall.color}08, ${overall.color}03)`, borderRadius: 16, border: `1px solid ${overall.color}20`, cursor: “pointer” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ display: “flex”, alignItems: “center”, gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: “50%”, background: overall.color, boxShadow: `0 0 8px ${overall.color}`, animation: “pulse-glow 2s ease-in-out infinite” }} /><span style={{ fontSize: 10, color: “#9CA3AF”, fontWeight: 600, letterSpacing: “0.08em” }}>MACRO ENVIRONMENT</span></div>
<div style={{ display: “flex”, alignItems: “center”, gap: 6 }}><span style={{ fontSize: 12, fontWeight: 800, color: overall.color, fontFamily: “‘JetBrains Mono’, monospace” }}>{overall.signal}</span><span style={{ fontSize: 14, color: “#6B7280”, transform: expanded ? “rotate(180deg)” : “rotate(0)”, transition: “transform 0.3s”, display: “inline-block” }}>▾</span></div>
</div>
{!expanded && <div style={{ fontSize: 11, color: “#9CA3AF”, lineHeight: 1.5, marginTop: 6 }}>{overall.summary.slice(0, 85)}…</div>}
</div>
<div style={{ maxHeight: expanded ? 900 : 0, overflow: “hidden”, transition: “max-height 0.4s ease” }}>
<div style={{ padding: “12px 16px”, marginTop: 8, background: “#111318”, borderRadius: 14, fontSize: 11, color: “#D1D5DB”, lineHeight: 1.7 }}>{overall.summary}</div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 6, marginTop: 8 }}>
{MACRO_DATA.indicators.map((ind, idx) => {
const ch = ind.value - ind.prev, pct = (ch / ind.prev) * 100, up = ch > 0;
const ic = ind.cryptoImpact === “positive” ? “#22C55E” : ind.cryptoImpact === “negative” ? “#EF4444” : “#F59E0B”;
return (<div key={ind.id} style={{ padding: “12px 14px”, background: “#111318”, borderRadius: 12, animation: `slide-up 0.3s ease-out ${idx * 0.05}s both` }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ flex: 1 }}>
<div style={{ display: “flex”, alignItems: “center”, gap: 6, marginBottom: 4 }}><span style={{ fontSize: 11, color: “#9CA3AF”, fontWeight: 500 }}>{ind.label}</span><span style={{ fontSize: 7, padding: “1px 5px”, borderRadius: 3, background: `${ic}15`, color: ic, fontWeight: 700 }}>{ind.cryptoImpact === “positive” ? “CRYPTO +” : ind.cryptoImpact === “negative” ? “CRYPTO −” : “NEUTRAL”}</span></div>
<div style={{ display: “flex”, alignItems: “baseline”, gap: 6 }}><span style={{ fontSize: 18, fontWeight: 800, color: “#F9FAFB”, fontFamily: “‘JetBrains Mono’, monospace” }}>{ind.id === “m2” ? “$” : “”}{ind.value}{ind.unit}</span><span style={{ fontSize: 10, fontWeight: 600, color: up ? “#22C55E” : “#EF4444”, fontFamily: “‘JetBrains Mono’, monospace” }}>{up ? “▲” : “▼”}{Math.abs(pct).toFixed(1)}%</span></div>
</div>
<MiniLine data={ind.history} color={ind.history[6] >= ind.history[0] ? “#22C55E” : “#EF4444”} />
</div>
<div style={{ fontSize: 10, color: “#6B7280”, marginTop: 6, lineHeight: 1.5, borderTop: “1px solid rgba(255,255,255,0.04)”, paddingTop: 6 }}>{ind.description}</div>
</div>);
})}
</div>
</div>
</div>
);
}

// ─── Knowledge Base Page ───────────────────────────────────────────
function KnowledgeBasePage() {
const [openId, setOpenId] = useState(null);
const [q, setQ] = useState(””);
const filter = (articles) => { if (!q) return articles; const lq = q.toLowerCase(); return articles.filter(a => a.title.toLowerCase().includes(lq) || a.tags.some(t => t.includes(lq)) || a.content.toLowerCase().includes(lq)); };
return (
<div style={{ padding: “20px 16px 100px” }}>
<h2 style={{ fontSize: 22, fontWeight: 800, color: “#F9FAFB”, letterSpacing: “-0.03em”, marginBottom: 4 }}>Knowledge Base</h2>
<p style={{ fontSize: 12, color: “#6B7280”, marginBottom: 16 }}>Understand the metrics behind every signal</p>
<div style={{ position: “relative”, marginBottom: 20 }}>
<input type=“search” value={q} onChange={e => setQ(e.target.value)} placeholder=“Search terms, metrics…” aria-label=“Search knowledge base” style={{ width: “100%”, padding: “12px 16px 12px 36px”, background: “#111318”, border: “1px solid rgba(255,255,255,0.08)”, borderRadius: 12, color: “#E5E7EB”, fontSize: 13, fontFamily: “inherit”, outline: “none” }} />
<span style={{ position: “absolute”, left: 12, top: “50%”, transform: “translateY(-50%)”, fontSize: 14, color: “#6B7280” }}>⌕</span>
</div>
{Object.entries(KNOWLEDGE_BASE).map(([key, sec]) => {
const arts = filter(sec.articles); if (!arts.length) return null;
return (
<section key={key} style={{ marginBottom: 24 }} aria-label={sec.title}>
<div style={{ display: “flex”, alignItems: “center”, gap: 8, marginBottom: 10 }}>
<span style={{ fontSize: 18 }}>{sec.icon}</span>
<h3 style={{ fontSize: 14, fontWeight: 700, color: “#D1D5DB”, margin: 0 }}>{sec.title}</h3>
<span style={{ fontSize: 10, color: “#6B7280”, fontFamily: “monospace” }}>{arts.length}</span>
</div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 6 }}>
{arts.map((a, idx) => {
const open = openId === a.id;
return (
<article key={a.id} onClick={() => setOpenId(open ? null : a.id)} style={{ padding: “14px 16px”, background: “#111318”, borderRadius: 14, cursor: “pointer”, border: open ? “1px solid rgba(255,255,255,0.1)” : “1px solid rgba(255,255,255,0.04)”, transition: “border-color 0.2s”, animation: `slide-up 0.3s ease-out ${idx * 0.04}s both` }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<h4 style={{ fontSize: 13, fontWeight: 600, color: “#E5E7EB”, margin: 0 }}>{a.title}</h4>
<span style={{ fontSize: 12, color: “#6B7280”, transform: open ? “rotate(180deg)” : “rotate(0)”, transition: “transform 0.2s”, display: “inline-block” }}>▾</span>
</div>
<div style={{ maxHeight: open ? 400 : 0, overflow: “hidden”, transition: “max-height 0.3s ease” }}>
<p style={{ fontSize: 12, color: “#9CA3AF”, lineHeight: 1.8, marginTop: 10, marginBottom: 8 }}>{a.content}</p>
<div style={{ display: “flex”, flexWrap: “wrap”, gap: 4 }}>{a.tags.map(t => <span key={t} style={{ fontSize: 9, padding: “2px 8px”, borderRadius: 6, background: “rgba(255,255,255,0.04)”, color: “#6B7280”, fontFamily: “monospace” }}>#{t}</span>)}</div>
</div>
</article>
);
})}
</div>
</section>
);
})}
</div>
);
}

// ─── Alerts Page ───────────────────────────────────────────────────
function AlertsPage() {
const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
const [toast, setToast] = useState(null);
const toggle = (id) => {
const a = alerts.find(x => x.id === id);
setAlerts(prev => prev.map(x => x.id === id ? { …x, enabled: !x.enabled } : x));
setToast(`${a.label} ${a.enabled ? "disabled" : "enabled"}`);
setTimeout(() => setToast(null), 2000);
};
const cats = [{ key: “onchain”, label: “On-Chain”, icon: “⛓️” },{ key: “signal”, label: “Signals”, icon: “📡” },{ key: “macro”, label: “Macro”, icon: “📊” },{ key: “price”, label: “Price”, icon: “💰” }];
const en = alerts.filter(a => a.enabled).length;
return (
<div style={{ padding: “20px 16px 100px” }}>
<h2 style={{ fontSize: 22, fontWeight: 800, color: “#F9FAFB”, letterSpacing: “-0.03em”, marginBottom: 4 }}>Alerts</h2>
<p style={{ fontSize: 12, color: “#6B7280”, marginBottom: 16 }}>{en} of {alerts.length} alerts active</p>
{/* Category pills */}
<div style={{ display: “flex”, gap: 8, marginBottom: 20, overflowX: “auto”, paddingBottom: 4 }}>
{cats.map(c => { const ca = alerts.filter(a => a.cat === c.key), ac = ca.filter(a => a.enabled).length;
return (<div key={c.key} style={{ padding: “10px 14px”, background: “#111318”, borderRadius: 12, display: “flex”, alignItems: “center”, gap: 6, flexShrink: 0, border: “1px solid rgba(255,255,255,0.04)” }}><span style={{ fontSize: 14 }}>{c.icon}</span><div><div style={{ fontSize: 10, color: “#9CA3AF” }}>{c.label}</div><div style={{ fontSize: 12, fontWeight: 700, color: ac > 0 ? “#22C55E” : “#6B7280”, fontFamily: “‘JetBrains Mono’, monospace” }}>{ac}/{ca.length}</div></div></div>);
})}
</div>
{cats.map(c => { const ca = alerts.filter(a => a.cat === c.key);
return (<div key={c.key} style={{ marginBottom: 20 }}>
<div style={{ display: “flex”, alignItems: “center”, gap: 6, marginBottom: 8 }}><span style={{ fontSize: 14 }}>{c.icon}</span><span style={{ fontSize: 12, fontWeight: 700, color: “#D1D5DB” }}>{c.label} Alerts</span></div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 6 }}>
{ca.map((al, idx) => (
<div key={al.id} style={{ display: “flex”, alignItems: “center”, gap: 12, padding: “14px 16px”, background: “#111318”, borderRadius: 14, border: al.enabled ? “1px solid rgba(34,197,94,0.15)” : “1px solid rgba(255,255,255,0.04)”, transition: “border-color 0.3s”, animation: `slide-up 0.3s ease-out ${idx * 0.04}s both` }}>
<span style={{ fontSize: 20, flexShrink: 0 }}>{al.icon}</span>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontSize: 13, fontWeight: 600, color: “#E5E7EB” }}>{al.label}</div>
<div style={{ fontSize: 10, color: “#6B7280”, marginTop: 2 }}>{al.desc}</div>
<div style={{ fontSize: 9, color: “#4B5563”, marginTop: 3, fontFamily: “monospace” }}>Threshold: {al.threshold}</div>
</div>
<button onClick={(e) => { e.stopPropagation(); toggle(al.id); }} aria-label={`Toggle ${al.label}`} style={{ width: 44, height: 26, borderRadius: 13, border: “none”, cursor: “pointer”, background: al.enabled ? “#22C55E” : “#374151”, position: “relative”, transition: “background 0.3s”, flexShrink: 0, padding: 0 }}>
<div style={{ width: 20, height: 20, borderRadius: “50%”, background: “#fff”, position: “absolute”, top: 3, left: al.enabled ? 21 : 3, transition: “left 0.3s cubic-bezier(0.34,1.56,0.64,1)”, boxShadow: “0 1px 3px rgba(0,0,0,0.3)” }} />
</button>
</div>
))}
</div>
</div>);
})}
{toast && <div style={{ position: “fixed”, bottom: 80, left: “50%”, transform: “translateX(-50%)”, padding: “10px 20px”, background: “#1F2937”, borderRadius: 12, border: “1px solid rgba(255,255,255,0.1)”, fontSize: 12, color: “#E5E7EB”, fontWeight: 500, zIndex: 100, animation: “slide-up 0.3s ease-out”, boxShadow: “0 8px 32px rgba(0,0,0,0.5)” }}>{toast}</div>}
</div>
);
}

// ─── Nav Icons ─────────────────────────────────────────────────────
const NI = {
home: (a) => <svg width=“22” height=“22” viewBox=“0 0 24 24” fill=“none” stroke={a?”#F9FAFB”:”#6B7280”} strokeWidth=“2” strokeLinecap=“round” strokeLinejoin=“round”><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
learn: (a) => <svg width=“22” height=“22” viewBox=“0 0 24 24” fill=“none” stroke={a?”#F9FAFB”:”#6B7280”} strokeWidth=“2” strokeLinecap=“round” strokeLinejoin=“round”><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
alerts: (a) => <svg width=“22” height=“22” viewBox=“0 0 24 24” fill=“none” stroke={a?”#F9FAFB”:”#6B7280”} strokeWidth=“2” strokeLinecap=“round” strokeLinejoin=“round”><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IndoBit() {
const [page, setPage] = useState(“home”);
const [selectedChain, setSelectedChain] = useState(null);
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [activeTab, setActiveTab] = useState(“overview”);
const [showAll, setShowAll] = useState(false);
const [animateIn, setAnimateIn] = useState(false);
const [macroOpen, setMacroOpen] = useState(false);
const [livePrice, setLivePrice] = useState(null);
const [prevPrice, setPrevPrice] = useState(null);
const [priceFlash, setPriceFlash] = useState(null);
const [liveTicks, setLiveTicks] = useState([]);
const [tickCount, setTickCount] = useState(0);
const lpRef = useRef(null); const tiRef = useRef(null);

// SEO
useEffect(() => {
document.title = “IndoBit — Crypto On-Chain & Macro Intelligence for Smarter Trading”;
const metas = { description: “IndoBit analyzes whale movements, exchange flows, stablecoin minting, and macro indicators to help you make better crypto trading decisions.”, keywords: “crypto analysis, on-chain analytics, whale tracking, exchange flow, Bitcoin, Ethereum, Solana, macro indicators, DXY, Fed rate, crypto trading, IndoBit”, “og:title”: “IndoBit — On-Chain & Macro Intelligence for Crypto”, “og:description”: “Track whale movements, exchange flows, and macro signals across major L1 chains.”, “og:type”: “website”, “twitter:card”: “summary_large_image”, viewport: “width=device-width, initial-scale=1, maximum-scale=1”, “theme-color”: “#0A0B0F” };
Object.entries(metas).forEach(([n, c]) => { let el = document.querySelector(`meta[name="${n}"]`) || document.querySelector(`meta[property="${n}"]`); if (!el) { el = document.createElement(“meta”); el.setAttribute(n.startsWith(“og:”) || n.startsWith(“twitter:”) ? “property” : “name”, n); document.head.appendChild(el); } el.setAttribute(“content”, c); });
let ld = document.getElementById(“ib-ld”); if (!ld) { ld = document.createElement(“script”); ld.id = “ib-ld”; ld.type = “application/ld+json”; document.head.appendChild(ld); }
ld.textContent = JSON.stringify({ “@context”: “https://schema.org”, “@type”: “WebApplication”, name: “IndoBit”, description: “Crypto on-chain analytics and macro intelligence platform”, applicationCategory: “FinanceApplication”, operatingSystem: “Web”, offers: { “@type”: “Offer”, price: “0”, priceCurrency: “USD” }, featureList: “Whale tracking, Exchange flow analysis, Stablecoin monitoring, Macro indicators, Trend prediction, Knowledge base, Alerts” });
let can = document.querySelector(“link[rel=‘canonical’]”); if (!can) { can = document.createElement(“link”); can.rel = “canonical”; document.head.appendChild(can); } can.href = “https://indobit.app”;
}, []);

// Price ticker
useEffect(() => {
if (!data) { setLivePrice(null); setPrevPrice(null); setLiveTicks([]); setTickCount(0); if (tiRef.current) clearInterval(tiRef.current); return; }
let cp = data.currentPrice; setLivePrice(cp); lpRef.current = cp; setLiveTicks([cp]);
const vol = { btc: 0.0008, eth: 0.001, sol: 0.0015, avax: 0.002, bnb: 0.0009, ada: 0.0018, dot: 0.0016, matic: 0.002 }[data.chain.id] || 0.001;
tiRef.current = setInterval(() => { const pv = lpRef.current, np = pv * (1 + (Math.random() - 0.48) * vol * 2); lpRef.current = np; setPrevPrice(pv); setLivePrice(np); setPriceFlash(np > pv ? “up” : “down”); setTickCount(c => c + 1); setLiveTicks(t => { const n = […t, np]; return n.length > 60 ? n.slice(-60) : n; }); setTimeout(() => setPriceFlash(null), 400); }, 1500);
return () => { if (tiRef.current) clearInterval(tiRef.current); };
}, [data]);

const selectChain = useCallback((id) => { setLoading(true); setAnimateIn(false); setShowAll(false); setActiveTab(“overview”); setTimeout(() => { setSelectedChain(id); setData(generateChainData(id)); setLoading(false); setTimeout(() => setAnimateIn(true), 50); }, 600); }, []);
const goBack = () => { setAnimateIn(false); if (tiRef.current) clearInterval(tiRef.current); setTimeout(() => { setSelectedChain(null); setData(null); }, 200); };
const nav = (p) => { if (selectedChain) goBack(); setPage(p); };

const tc = data?.trendSignal?.includes(“BULL”) ? “#22C55E” : data?.trendSignal === “BEARISH” ? “#EF4444” : “#F59E0B”;
const dp = livePrice ?? data?.currentPrice ?? 0;
const lc = data ? ((dp - data.prices[0]) / data.prices[0]) * 100 : 0;
const fc = priceFlash === “up” ? “#22C55E” : priceFlash === “down” ? “#EF4444” : null;

return (
<div style={{ minHeight: “100vh”, background: “#0A0B0F”, color: “#E5E7EB”, fontFamily: “‘Inter’, ‘Segoe UI’, sans-serif”, maxWidth: 430, margin: “0 auto”, position: “relative”, overflow: “hidden” }}>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>{`@keyframes pulse-glow { 0%,100% { opacity:.4 } 50% { opacity:1 } } @keyframes slide-up { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } } @keyframes flash-up { 0% { background:rgba(34,197,94,.25) } 100% { background:transparent } } @keyframes flash-down { 0% { background:rgba(239,68,68,.25) } 100% { background:transparent } } @keyframes price-pop { 0% { transform:scale(1.06) } 100% { transform:scale(1) } } @keyframes tick-in { from { opacity:0; transform:translateX(8px) } to { opacity:1; transform:translateX(0) } } @keyframes spin { to { transform:rotate(360deg) } } .card-hover { transition: transform .2s } .card-hover:active { transform:scale(.97) } .tab-active { background:rgba(255,255,255,.08)!important; color:#fff!important } * { -webkit-tap-highlight-color:transparent; box-sizing:border-box } ::-webkit-scrollbar { display:none }`}</style>

```
  {data && <div style={{ position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${data.chain.color}15, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />}

  {/* HEADER */}
  <header style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.06)", position: "sticky", top: 0, zIndex: 10, background: "rgba(10,11,15,.92)", backdropFilter: "blur(20px)" }}>
    {selectedChain && <button onClick={goBack} aria-label="Back" style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 20, cursor: "pointer", padding: "4px 8px 4px 0" }}>←</button>}
    <div style={{ flex: 1 }}>
      <h1 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em", background: "linear-gradient(135deg,#F7931A,#F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>INDOBIT</h1>
      <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>SMARTER TRADING & INVESTING DECISIONS</div>
    </div>
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", animation: "pulse-glow 2s ease-in-out infinite", boxShadow: "0 0 8px #22C55E" }} />
    <span style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace" }}>LIVE</span>
  </header>

  {/* HOME */}
  {page === "home" && !selectedChain && !loading && (
    <main style={{ padding: "20px 0 100px" }}>
      <div style={{ padding: "0 20px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2, letterSpacing: "-.03em", color: "#F9FAFB" }}>Market Pulse</h2>
        <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Macro signals & on-chain intelligence for better decisions</p>
      </div>
      <MacroDashboard expanded={macroOpen} onToggle={() => setMacroOpen(!macroOpen)} />
      <div style={{ padding: "16px 20px 12px" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: ".04em", margin: 0 }}>ON-CHAIN ANALYSIS</h3>
        <p style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>7-day whale & exchange flow analysis</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px" }}>
        {CHAINS.map((ch, idx) => { const pv = CHAIN_PREVIEWS[ch.id]; return (
          <button key={ch.id} onClick={() => selectChain(ch.id)} className="card-hover" style={{ background: "linear-gradient(135deg,#111318,#1A1D25)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "14px 14px 10px", cursor: "pointer", textAlign: "left", animation: `slide-up .4s ease-out ${idx * .06}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${ch.color}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${ch.color}30`, flexShrink: 0 }}><ChainIcon chainId={ch.id} size={18} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{ch.name}</div><div style={{ fontSize: 10, fontWeight: 600, color: pv.priceChange >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{pv.priceChange >= 0 ? "▲" : "▼"}{Math.abs(pv.priceChange).toFixed(1)}% <span style={{ color: "#6B7280" }}>7d</span></div></div>
            </div>
            <MiniGauge value={pv.trendConfidence} signal={pv.trendSignal} delay={idx * 80} />
          </button>
        ); })}
      </div>
    </main>
  )}

  {/* LOADING */}
  {loading && <div style={{ padding: "40px 20px", textAlign: "center" }}><div style={{ width: 48, height: 48, border: "3px solid #1F2937", borderTopColor: "#F59E0B", borderRadius: "50%", margin: "0 auto 16px", animation: "spin .8s linear infinite" }} /><div style={{ fontSize: 13, color: "#9CA3AF" }}>Scanning on-chain data...</div></div>}

  {/* CHAIN DETAIL */}
  {page === "home" && data && !loading && (
    <div style={{ opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(12px)", transition: "all .4s ease-out" }}>
      {/* Price card */}
      <div style={{ margin: "16px 16px 0", padding: 20, background: "linear-gradient(135deg,#111318,#1A1D25)", borderRadius: 20, border: `1px solid ${data.chain.color}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><ChainIcon chainId={data.chain.id} size={24} /><span style={{ fontSize: 18, fontWeight: 800, color: "#F9FAFB" }}>{data.chain.name}</span></div>
            <div key={tickCount} style={{ fontSize: 28, fontWeight: 800, color: fc || "#F9FAFB", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-.02em", padding: "2px 6px", marginLeft: -6, borderRadius: 8, animation: priceFlash === "up" ? "flash-up .5s ease-out, price-pop .3s ease-out" : priceFlash === "down" ? "flash-down .5s ease-out, price-pop .3s ease-out" : "none", transition: "color .3s" }}>
              ${dp < 1 ? dp.toFixed(4) : dp.toLocaleString(undefined, { maximumFractionDigits: dp > 100 ? 2 : 4 })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: lc >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>{lc >= 0 ? "▲" : "▼"} {Math.abs(lc).toFixed(2)}% (7d)</span>
              {prevPrice != null && <span key={tickCount} style={{ fontSize: 9, fontWeight: 600, color: livePrice > prevPrice ? "#22C55E" : "#EF4444", fontFamily: "'JetBrains Mono', monospace", animation: "tick-in .3s ease-out", opacity: priceFlash ? 1 : .5 }}>{livePrice > prevPrice ? "+" : ""}{((livePrice - prevPrice) / prevPrice * 100).toFixed(3)}%</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <Sparkline data={data.prices} color={data.priceChange >= 0 ? "#22C55E" : "#EF4444"} filled height={36} width={100} />
            {liveTicks.length > 2 && <div style={{ position: "relative" }}><Sparkline data={liveTicks} color={liveTicks[liveTicks.length-1] >= liveTicks[0] ? "#22C55E" : "#EF4444"} height={24} width={100} /><div style={{ position: "absolute", top: -1, right: -1, width: 5, height: 5, borderRadius: "50%", background: liveTicks[liveTicks.length-1] >= liveTicks[liveTicks.length-2||0] ? "#22C55E" : "#EF4444", boxShadow: `0 0 6px ${liveTicks[liveTicks.length-1] >= liveTicks[liveTicks.length-2||0] ? "#22C55E" : "#EF4444"}`, animation: "pulse-glow 1s ease-in-out infinite" }} /><span style={{ fontSize: 7, color: "#6B7280", fontFamily: "monospace", position: "absolute", bottom: -8, right: 0 }}>LIVE</span></div>}
          </div>
        </div>
      </div>
      {/* Trend */}
      <div style={{ margin: "12px 16px 0", padding: 20, background: `linear-gradient(135deg,${tc}08,${tc}03)`, borderRadius: 20, border: `1px solid ${tc}25` }}>
        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 8, letterSpacing: ".08em" }}>TREND PREDICTION</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ConfidenceGauge value={data.trendConfidence} signal={data.trendSignal} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 800, color: tc, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{data.trendSignal}</div><div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.5 }}>{data.trendReason}</div></div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "16px 16px 0" }}>
        {["overview","whales","flows"].map(t => <button key={t} onClick={() => { setActiveTab(t); setShowAll(false); }} className={activeTab === t ? "tab-active" : ""} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,.06)", color: "#6B7280", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".05em", transition: "all .2s" }}>{t === "overview" ? "Insights" : t === "whales" ? "Whales" : "Flows"}</button>)}
      </div>
      <div style={{ padding: "12px 16px 100px" }}>
        {activeTab === "overview" && <div>
          {data.insights.map((ins, i) => <div key={i} style={{ padding: "14px 16px", marginTop: 8, background: "#111318", borderRadius: 14, borderLeft: `3px solid ${ins.severity === "high" ? "#EF4444" : ins.severity === "medium" ? "#F59E0B" : "#6B7280"}`, animation: `slide-up .4s ease-out ${i * .08}s both` }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: ins.severity === "high" ? "#EF444420" : ins.severity === "medium" ? "#F59E0B20" : "#6B728020", color: ins.severity === "high" ? "#EF4444" : ins.severity === "medium" ? "#F59E0B" : "#9CA3AF", textTransform: "uppercase", letterSpacing: ".1em" }}>{ins.severity}</span><span style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", fontFamily: "monospace" }}>{ins.type}</span></div><div style={{ fontSize: 12, color: "#D1D5DB", lineHeight: 1.6 }}>{ins.text}</div></div>)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
            {[{ l: "Inflow 7d", v: formatUSD(data.totalInflow), c: "#EF4444" },{ l: "Outflow 7d", v: formatUSD(data.totalOutflow), c: "#22C55E" },{ l: "Stables Minted", v: formatUSD(data.stableMinted), c: "#F59E0B" },{ l: "Stables Burned", v: formatUSD(data.stableBurned), c: "#8B5CF6" }].map((s, i) => <div key={i} style={{ padding: 14, background: "#111318", borderRadius: 14, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: s.c, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</div><div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>{s.l}</div></div>)}
          </div>
        </div>}
        {activeTab === "whales" && <div style={{ background: "#111318", borderRadius: 14, padding: "4px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px" }}><span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>{data.whaleMovements.length} transactions</span><div style={{ display: "flex", gap: 8, fontSize: 9 }}><span style={{ color: "#EF4444" }}>● in</span><span style={{ color: "#22C55E" }}>● out</span></div></div>
          {(showAll ? data.whaleMovements : data.whaleMovements.slice(0, 6)).map(m => <MovementRow key={m.id} m={m} chainColor={data.chain.color} />)}
          {data.whaleMovements.length > 6 && <button onClick={() => setShowAll(!showAll)} style={{ width: "100%", padding: 12, background: "none", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, color: "#9CA3AF", fontSize: 11, cursor: "pointer", margin: "8px 0" }}>{showAll ? "Less" : `All ${data.whaleMovements.length}`}</button>}
        </div>}
        {activeTab === "flows" && <div>
          <div style={{ background: "#111318", borderRadius: 14, padding: 16, marginTop: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 4 }}>EXCHANGE FLOWS (7D)</div><div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 9 }}><span style={{ color: "#EF4444" }}>■ In</span><span style={{ color: "#22C55E" }}>■ Out</span></div><BarChart inflows={data.exchangeInflows} outflows={data.exchangeOutflows} /></div>
          <div style={{ background: "#111318", borderRadius: 14, padding: 16, marginTop: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 12 }}>NET FLOW</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#6B7280" }}>IN</div><div style={{ fontSize: 15, fontWeight: 800, color: "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>{formatUSD(data.totalInflow)}</div></div>
              <span style={{ color: "#4B5563" }}>→</span>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#6B7280" }}>NET</div><div style={{ fontSize: 15, fontWeight: 800, color: data.netFlow > 0 ? "#EF4444" : "#22C55E", fontFamily: "'JetBrains Mono', monospace" }}>{data.netFlow > 0 ? "+" : ""}{formatUSD(data.netFlow)}</div></div>
              <span style={{ color: "#4B5563" }}>←</span>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#6B7280" }}>OUT</div><div style={{ fontSize: 15, fontWeight: 800, color: "#22C55E", fontFamily: "'JetBrains Mono', monospace" }}>{formatUSD(data.totalOutflow)}</div></div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: data.netFlow > 0 ? "#EF444410" : "#22C55E10", border: `1px solid ${data.netFlow > 0 ? "#EF444420" : "#22C55E20"}`, fontSize: 11, color: "#D1D5DB", lineHeight: 1.5, textAlign: "center" }}>{data.netFlow > 0 ? "⚠ Net inflow — sell pressure building" : "✓ Net outflow — accumulation pattern"}</div>
          </div>
          <div style={{ background: "#111318", borderRadius: 14, padding: 16, marginTop: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 12 }}>STABLECOINS</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#22C55E08", border: "1px solid #22C55E15", textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: "#22C55E", fontFamily: "monospace" }}>{formatUSD(data.stableMinted)}</div><div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>Minted</div></div>
              <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "#EF444408", border: "1px solid #EF444415", textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: "#EF4444", fontFamily: "monospace" }}>{formatUSD(data.stableBurned)}</div><div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>Burned</div></div>
            </div>
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: data.stableNetMint > 0 ? "#F59E0B08" : "#8B5CF608", textAlign: "center", fontSize: 11, color: "#D1D5DB" }}>Net {data.stableNetMint > 0 ? "minting" : "burning"}: <strong style={{ color: data.stableNetMint > 0 ? "#F59E0B" : "#8B5CF6" }}>{formatUSD(Math.abs(data.stableNetMint))}</strong></div>
          </div>
        </div>}
      </div>
    </div>
  )}

  {page === "learn" && <KnowledgeBasePage />}
  {page === "alerts" && <AlertsPage />}

  {/* BOTTOM NAV */}
  <nav aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 0 env(safe-area-inset-bottom, 8px)", background: "rgba(10,11,15,.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,.06)", zIndex: 20 }}>
    {[{ id: "home", label: "Home", icon: NI.home },{ id: "learn", label: "Learn", icon: NI.learn },{ id: "alerts", label: "Alerts", icon: NI.alerts }].map(t => {
      const a = page === t.id;
      return (<button key={t.id} onClick={() => nav(t.id)} aria-label={t.label} aria-current={a ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 16px", position: "relative" }}>
        {t.icon(a)}
        <span style={{ fontSize: 9, fontWeight: a ? 700 : 500, color: a ? "#F9FAFB" : "#6B7280", transition: "color .2s" }}>{t.label}</span>
        {a && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 20, height: 3, borderRadius: 2, background: "#F7931A" }} />}
      </button>);
    })}
  </nav>
</div>
```

);
}