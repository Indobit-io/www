import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── SEO: Inject meta tags on mount ───────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = "IndoBit — Crypto On-Chain Intelligence & Macro Analysis";
    const metas = [
      { name: "description", content: "Real-time whale tracking, exchange flow analysis, and macro indicators for smarter crypto trading decisions. Track BTC, ETH, SOL, and major L1 chains." },
      { name: "keywords", content: "crypto analysis, whale tracking, on-chain data, exchange flows, Bitcoin, Ethereum, Solana, macro crypto, DXY, Fed rate, stablecoin, trading signals" },
      { property: "og:title", content: "IndoBit — Crypto On-Chain Intelligence" },
      { property: "og:description", content: "Whale movements, exchange flows & macro signals for smarter crypto decisions." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "IndoBit" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IndoBit — On-Chain Intelligence" },
      { name: "robots", content: "index, follow" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { name: "theme-color", content: "#0A0B0F" },
    ];
    const els = metas.map((m) => {
      const el = document.createElement("meta");
      Object.entries(m).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      return el;
    });
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "WebApplication",
      name: "IndoBit", applicationCategory: "FinanceApplication",
      description: "Crypto on-chain intelligence platform with whale tracking, exchange flow analysis, and macro indicators.",
      operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
    document.head.appendChild(ld);
    return () => { els.forEach((e) => e.remove()); ld.remove(); };
  }, []);
}

// ─── Data Engine ──────────────────────────────────────────────────
const CHAINS = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", color: "#F7931A" },
  { id: "eth", name: "Ethereum", symbol: "ETH", color: "#627EEA" },
  { id: "sol", name: "Solana", symbol: "SOL", color: "#14F195" },
  { id: "avax", name: "Avalanche", symbol: "AVAX", color: "#E84142" },
  { id: "bnb", name: "BNB Chain", symbol: "BNB", color: "#F3BA2F" },
  { id: "ada", name: "Cardano", symbol: "ADA", color: "#0033AD" },
  { id: "dot", name: "Polkadot", symbol: "DOT", color: "#E6007A" },
  { id: "matic", name: "Polygon", symbol: "POL", color: "#8247E5" },
];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateChainData(chainId) {
  const rng = seededRandom(chainId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 7 + 42);
  const chain = CHAINS.find((c) => c.id === chainId);
  const priceBase = { btc: 68400, eth: 3820, sol: 178, avax: 38, bnb: 612, ada: 0.48, dot: 7.2, matic: 0.58 }[chainId] || 100;
  const mcap = { btc: 1340, eth: 458, sol: 78, avax: 14.2, bnb: 91, ada: 17, dot: 9.8, matic: 5.6 }[chainId] || 10;
  const prices = []; let p = priceBase * (0.95 + rng() * 0.1);
  for (let i = 0; i < 7; i++) { p *= 0.97 + rng() * 0.06; prices.push(p); }
  const whaleNames = ["0x7a16...f3d2","0xdead...beef","0x3c44...9b71","0xf39F...2266","0x1234...abcd","0x9876...5432"];
  const exchangeNames = ["Binance","Coinbase","Kraken","OKX","Bybit","Bitfinex"];
  const stablecoins = ["USDT","USDC","DAI","BUSD"];
  const whaleMovements = [];
  for (let i = 0; i < 12 + Math.floor(rng() * 8); i++) {
    const isStable = rng() > 0.6, amount = isStable ? (5 + rng() * 95) * 1e6 : (100 + rng() * 9900) * priceBase * 0.01;
    const isInflow = rng() > 0.5;
    whaleMovements.push({ id: i, asset: isStable ? stablecoins[Math.floor(rng() * 4)] : chain.symbol,
      amount, from: isInflow ? whaleNames[Math.floor(rng() * 6)] : exchangeNames[Math.floor(rng() * 6)],
      to: isInflow ? exchangeNames[Math.floor(rng() * 6)] : whaleNames[Math.floor(rng() * 6)],
      daysAgo: Math.floor(rng() * 7), type: isInflow ? "exchange_inflow" : "exchange_outflow", isStablecoin: isStable });
  }
  whaleMovements.sort((a, b) => a.daysAgo - b.daysAgo);
  const exchangeInflows = [], exchangeOutflows = [];
  for (let i = 0; i < 7; i++) { exchangeInflows.push((800 + rng() * 2200) * mcap / 100); exchangeOutflows.push((600 + rng() * 2600) * mcap / 100); }
  const netFlow = exchangeInflows.reduce((a, v, i) => a + v - exchangeOutflows[i], 0);
  const totalInflow = exchangeInflows.reduce((a, v) => a + v, 0), totalOutflow = exchangeOutflows.reduce((a, v) => a + v, 0);
  const stableMinted = (50 + rng() * 450) * 1e6, stableBurned = (30 + rng() * 300) * 1e6, stableNetMint = stableMinted - stableBurned;
  const outDom = totalOutflow > totalInflow, stIn = stableNetMint > 100e6;
  let trendSignal, trendConfidence, trendReason;
  if (outDom && stIn) { trendSignal = "BULLISH"; trendConfidence = 65 + Math.floor(rng() * 20); trendReason = "Exchange outflows dominating + stablecoin minting surge suggests accumulation phase"; }
  else if (!outDom && !stIn) { trendSignal = "BEARISH"; trendConfidence = 60 + Math.floor(rng() * 20); trendReason = "Increasing exchange inflows + stablecoin redemptions signal potential sell pressure"; }
  else if (outDom) { trendSignal = "CAUTIOUS BULL"; trendConfidence = 50 + Math.floor(rng() * 15); trendReason = "Whale accumulation ongoing but stablecoin dry powder decreasing"; }
  else { trendSignal = "NEUTRAL"; trendConfidence = 40 + Math.floor(rng() * 20); trendReason = "Mixed signals — exchange inflows rising but new stablecoins entering ecosystem"; }
  const topW = whaleMovements.reduce((mx, m) => m.amount > mx.amount ? m : mx, whaleMovements[0]);
  const insights = [
    { type: "whale", severity: topW.amount > 50e6 ? "high" : "medium", text: `Largest transfer: ${fU(topW.amount)} ${topW.asset} → ${topW.type === "exchange_inflow" ? topW.to : topW.from}` },
    { type: "flow", severity: Math.abs(netFlow) > totalInflow * 0.15 ? "high" : "medium", text: `Net exchange flow: ${netFlow > 0 ? "+" : ""}${fU(netFlow)} (${netFlow > 0 ? "inflow → sell pressure" : "outflow → accumulation"})` },
    { type: "stable", severity: Math.abs(stableNetMint) > 200e6 ? "high" : "low", text: `Stablecoin net ${stableNetMint > 0 ? "minting" : "burning"}: ${fU(Math.abs(stableNetMint))}` },
    { type: "accum.", severity: outDom ? "high" : "low", text: outDom ? `Whales absorbed ${fU(totalOutflow - totalInflow)} more than deposited` : `Exchange deposits exceed withdrawals by ${fU(totalInflow - totalOutflow)}` },
  ];
  return { chain, prices, priceChange: ((prices[6] - prices[0]) / prices[0]) * 100, currentPrice: prices[6], whaleMovements, exchangeInflows, exchangeOutflows, netFlow, totalInflow, totalOutflow, stableMinted, stableBurned, stableNetMint, trendSignal, trendConfidence, trendReason, insights };
}

function fU(n) { const a = Math.abs(n); if (a >= 1e9) return "$"+(n/1e9).toFixed(2)+"B"; if (a >= 1e6) return "$"+(n/1e6).toFixed(1)+"M"; if (a >= 1e3) return "$"+(n/1e3).toFixed(1)+"K"; return "$"+n.toFixed(2); }
function fN(n) { const a = Math.abs(n); if (a >= 1e9) return (n/1e9).toFixed(2)+"B"; if (a >= 1e6) return (n/1e6).toFixed(1)+"M"; if (a >= 1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(2); }

const MACRO = {
  indicators: [
    { id:"fed", label:"Fed Funds Rate", value:4.50, unit:"%", prev:4.75, history:[5.50,5.50,5.25,5.00,4.75,4.50,4.50], impact:"positive", desc:"Rate cuts signal easing — historically bullish for risk assets" },
    { id:"us10y", label:"US 10Y Yield", value:4.18, unit:"%", prev:4.32, history:[4.65,4.52,4.41,4.38,4.32,4.25,4.18], impact:"positive", desc:"Declining yields reduce opportunity cost of holding crypto" },
    { id:"dxy", label:"DXY Index", value:103.2, unit:"", prev:104.8, history:[106.1,105.8,105.2,104.9,104.8,103.9,103.2], impact:"positive", desc:"Weakening dollar drives capital into alternative stores of value" },
    { id:"cpi", label:"CPI YoY", value:2.8, unit:"%", prev:3.0, history:[3.4,3.3,3.2,3.1,3.0,2.9,2.8], impact:"neutral", desc:"Inflation cooling — supports cuts but reduces hedge narrative" },
    { id:"m2", label:"Global M2", value:108.2, unit:"T", prev:106.5, history:[102.1,103.4,104.2,105.1,106.5,107.3,108.2], impact:"positive", desc:"Liquidity expansion — strong historical correlation with BTC" },
    { id:"fg", label:"Fear & Greed", value:62, unit:"", prev:55, history:[38,42,48,51,55,58,62], impact:"neutral", desc:"Transitioning to greed — momentum building, not overheated" },
  ],
  get signal() {
    const pos = this.indicators.filter(i => i.impact === "positive").length;
    if (pos >= 4) return { label:"FAVORABLE", color:"#22C55E", text:"Macro conditions aligning for risk assets. Rate cuts, declining yields, and expanding liquidity form a supportive backdrop for crypto." };
    if (pos <= 1) return { label:"HEADWIND", color:"#EF4444", text:"Tightening conditions create headwinds. Defensive positioning recommended." };
    return { label:"MIXED", color:"#F59E0B", text:"Mixed macro signals. Some support crypto while others suggest caution." };
  }
};

const CHAIN_PREVIEWS = Object.fromEntries(CHAINS.map(c => { const d = generateChainData(c.id); return [c.id, { trendSignal: d.trendSignal, trendConfidence: d.trendConfidence, priceChange: d.priceChange }]; }));

// ─── Knowledge Base ───────────────────────────────────────────────
const KB = {
  macro: {
    title: "Macro Indicators", icon: "📊",
    desc: "How traditional financial metrics influence crypto markets",
    articles: [
      { id:"fed", title:"Fed Funds Rate", time:"4 min", sections:[
        { h:"What It Is", p:"The federal funds rate is the overnight lending rate between banks, set by the Federal Reserve's FOMC. It's the most powerful lever in global monetary policy — when raised, borrowing gets expensive across the economy. When cut, capital becomes cheaper and flows into risk assets." },
        { h:"Why Crypto Cares", p:"Crypto is a risk asset. High rates mean investors earn 5%+ safely in Treasuries — why gamble on volatility? When rates drop, that safe yield disappears and capital hunts for returns in equities, real estate, and crypto. Every major bull run (2017, 2020-21) coincided with low or falling rates." },
        { h:"How IndoBit Uses It", p:"We track trajectory, not just the level. A cut from 5.5% to 5.25% is bullish because the direction signals more cuts ahead. We weight the momentum of rate changes — two consecutive cuts carry more signal than a single cut followed by a hold." },
      ]},
      { id:"us10y", title:"US 10-Year Treasury Yield", time:"3 min", sections:[
        { h:"What It Is", p:"The 10Y yield reflects long-term market expectations for growth and inflation. Unlike the Fed rate (short-term), it's set by bond market supply and demand." },
        { h:"Why Crypto Cares", p:"The 10Y is the benchmark 'risk-free rate.' When it rises above ~4.5%, institutions rotate out of crypto into bonds. When it falls, crypto becomes relatively attractive. BTC and the 10Y have shown strong inverse correlation since 2022." },
        { h:"How IndoBit Uses It", p:"We track the 7-day direction. A yield dropping from 4.65% to 4.18% over weeks is a strong bullish signal, even though 4.18% is historically elevated. Velocity of change matters more than the absolute level." },
      ]},
      { id:"dxy", title:"DXY (Dollar Index)", time:"3 min", sections:[
        { h:"What It Is", p:"The US Dollar Index measures the dollar's value against EUR, JPY, GBP, CAD, SEK, and CHF. A rising DXY means the dollar is strengthening globally." },
        { h:"Why Crypto Cares", p:"BTC has a persistent inverse correlation with the dollar. When the dollar weakens, international buyers acquire more BTC per unit of their currency. A falling DXY also coincides with risk-on environments where capital flows into speculative assets." },
        { h:"How IndoBit Uses It", p:"DXY below 103 with a declining trend is flagged CRYPTO+. Above 106 and rising is CRYPTO−. We cross-reference DXY with stablecoin minting — when DXY falls AND stablecoin supply expands, that's a particularly strong bullish confluence." },
      ]},
      { id:"cpi", title:"CPI & Inflation", time:"3 min", sections:[
        { h:"What It Is", p:"Consumer Price Index year-over-year measures how fast everyday prices are rising. The Fed targets 2%. Above that, they tighten. At or below, they can ease." },
        { h:"Why Crypto Cares", p:"Moderate inflation (2-3%) is neutral — it supports the 'digital gold' narrative without triggering rate hikes. High inflation (>5%) initially boosts the narrative but ultimately forces the Fed to hike aggressively, crushing risk assets." },
        { h:"How IndoBit Uses It", p:"We flag CPI as NEUTRAL in the 2-3% range, CRYPTO+ when declining toward target (supports cuts), and CRYPTO− when sticky above 4% (delays cuts). Direction matters more than the raw number." },
      ]},
      { id:"m2", title:"Global M2 Money Supply", time:"4 min", sections:[
        { h:"What It Is", p:"M2 measures total money supply — cash, deposits, savings, and money markets across all major economies. When central banks print money or ease, M2 expands." },
        { h:"Why Crypto Cares", p:"Arguably the single most important macro indicator for crypto. BTC shows ~0.85 correlation with global M2 on a 10-week lag. Logic: more money in the system → some flows into speculative assets. The 2020-21 bull run directly mirrored the $5T+ M2 expansion." },
        { h:"How IndoBit Uses It", p:"We track month-over-month growth. Expansion above 0.5% monthly is CRYPTO+. Contraction is CRYPTO−. We pay special attention to China's PBOC liquidity injections, which historically precede BTC rallies by 6-8 weeks." },
      ]},
      { id:"fg", title:"Fear & Greed Index", time:"2 min", sections:[
        { h:"What It Is", p:"A composite index from 0 (Extreme Fear) to 100 (Extreme Greed) combining volatility, momentum, social sentiment, BTC dominance, and Google Trends." },
        { h:"Why Crypto Cares", p:"It's a contrarian indicator. Extreme Fear (<20) historically marks bottoms — everyone who wanted to sell already has. Extreme Greed (>80) marks tops — euphoria leads to overleveraged positions that unwind violently." },
        { h:"How IndoBit Uses It", p:"We use it as a risk gauge, not a directional signal. Rising from 30→60 is healthy momentum (NEUTRAL). Jumping from 60→85 triggers caution. We cross-reference with exchange inflows: high greed + inflow spikes = classic distribution top." },
      ]},
    ]
  },
  onchain: {
    title: "On-Chain Metrics", icon: "⛓️",
    desc: "Blockchain-native signals revealing what smart money is doing",
    articles: [
      { id:"whale", title:"Whale Tracking", time:"4 min", sections:[
        { h:"What It Is", p:"Monitoring wallets holding significant crypto — typically >1,000 BTC, >10,000 ETH, or equivalent. These belong to early adopters, institutions, and large funds. Their movements often precede major price action." },
        { h:"What To Watch", p:"The key signal isn't the size — it's the destination. A whale moving 5,000 BTC to cold storage is accumulation (bullish). Moving 5,000 BTC to Binance is likely preparation to sell (bearish). IndoBit classifies every large transfer by destination." },
        { h:"How IndoBit Uses It", p:"We calculate the ratio of exchange-bound vs self-custody transfers over 7 days. If 60%+ of whale volume is leaving exchanges → accumulation. If 60%+ is entering → distribution. Mega-transactions (>$50M) get flagged as high-severity alerts." },
      ]},
      { id:"exflow", title:"Exchange Inflows & Outflows", time:"4 min", sections:[
        { h:"What It Is", p:"Total value of crypto deposited to (inflow) or withdrawn from (outflow) centralized exchanges. The most direct on-chain signal of intent: you send to an exchange to sell, you withdraw to hold." },
        { h:"Why It Matters", p:"Net inflow = more supply for selling = bearish pressure. Net outflow = supply removed from exchanges = bullish. This is basic supply/demand mechanics. Less available supply + same demand = price up." },
        { h:"How IndoBit Uses It", p:"We display daily inflow vs outflow as a bar chart and calculate 7-day net flow. Net outflow exceeding 15% of total inflow is flagged HIGH bullish. We also track which exchanges see the most outflows — Coinbase outflows (institutional) carry more weight than Binance (retail)." },
      ]},
      { id:"stable", title:"Stablecoin Supply Dynamics", time:"4 min", sections:[
        { h:"What It Is", p:"Stablecoins (USDT, USDC, DAI) are minted when new dollars enter crypto and burned when they leave. Net minting = fresh capital. Net burning = capital exiting. Think of it as the on/off ramp for the entire market." },
        { h:"Why It Matters", p:"Stablecoin supply is the 'dry powder' of crypto. Before every major rally, you see large-scale minting — institutions preparing capital. Before drawdowns, burning — capital returning to fiat. Total stablecoin market cap is a leading indicator, typically moving 1-2 weeks before BTC." },
        { h:"How IndoBit Uses It", p:"Net minting above $200M/week is flagged HIGH bullish. Net burning above $200M is HIGH bearish. The strongest confluence: stablecoin minting + exchange outflow. The strongest warning: stablecoin burning + exchange inflow." },
      ]},
      { id:"predict", title:"Trend Prediction Model", time:"5 min", sections:[
        { h:"How It Works", p:"IndoBit synthesizes three on-chain signals: (1) Net exchange flow direction, (2) Stablecoin supply changes, (3) Whale wallet behavior. Each is weighted and combined into a directional confidence score." },
        { h:"Signal Combinations", p:"BULLISH: Exchange outflows dominating + stablecoin minting surging — smart money accumulating while fresh capital enters. BEARISH: Exchange inflows + stablecoins burning — capital exiting while holders sell. CAUTIOUS BULL: Accumulation with decreasing dry powder. NEUTRAL: Contradictory signals." },
        { h:"Confidence Score", p:"80%+ means all three signals agree strongly. 50-65% means partial alignment with conflicts. Below 50% is high uncertainty. We recommend only acting on signals above 60% and always combining with your own analysis." },
        { h:"Limitations", p:"On-chain data is backward-looking. Whales can fake movements. Exchange wallets can be misidentified. Black swan events override any model. IndoBit gives probabilistic edges, not certainties. Always manage risk." },
      ]},
    ]
  }
};

// ─── Components ───────────────────────────────────────────────────
function ChainIcon({ id, size = 24 }) {
  const s = size;
  const icons = {
    btc: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15.7 11.3c.5-1.6-.6-2.5-1.7-3l.4-1.8-1.1-.3-.4 1.7c-.3-.1-.6-.1-.9-.2l.4-1.7-1.1-.3-.4 1.8c-.2-.1-.5-.1-.7-.2l-1.5-.4-.3 1.2s.8.2.8.2c.4.1.5.4.5.6l-.6 2.3.1 0-.1 0-.8 3.2c-.1.1-.2.3-.5.3 0 0-.8-.2-.8-.2l-.5 1.3 1.4.3.8.2-.4 1.8 1.1.3.4-1.8c.3.1.6.1.9.2l-.4 1.8 1.1.3.4-1.8c2 .4 3.4.2 4-.1.5-2.1-.3-3-1.5-3.3.8-.3 1.3-.8 1.5-1.9zm-2.7 3.7c-.4 1.6-3 .7-3.9.5l.7-2.8c.8.2 3.6.6 3.2 2.3zm.4-3.8c-.4 1.5-2.6.7-3.3.5l.6-2.5c.7.2 3.1.5 2.7 2z" fill="#F7931A"/></svg>,
    eth: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2L6 12.2l6 3.5 6-3.5L12 2z" fill="#627EEA" fillOpacity=".8"/><path d="M6 12.2L12 22l6-9.8-6 3.5-6-3.5z" fill="#627EEA"/></svg>,
    sol: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="6" width="14" height="1.8" rx=".4" fill="#14F195" fillOpacity=".5"/><rect x="5" y="11.1" width="14" height="1.8" rx=".4" fill="#14F195" fillOpacity=".7"/><rect x="5" y="16.2" width="14" height="1.8" rx=".4" fill="#14F195"/></svg>,
    avax: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4L4 19h5.5l2.5-4.5L14.5 19H20L12 4z" fill="#E84142"/></svg>,
    bnb: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5l2 2-2 2-2-2 2-2zM7 10l2 2-2 2-2-2 2-2zM17 10l2 2-2 2-2-2 2-2zM12 15l2 2-2 2-2-2 2-2z" fill="#F3BA2F"/></svg>,
    ada: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="1.5" fill="#3B82F6"/><circle cx="17" cy="9" r="1.5" fill="#3B82F6"/><circle cx="17" cy="15" r="1.5" fill="#3B82F6"/><circle cx="12" cy="18" r="1.5" fill="#3B82F6"/><circle cx="7" cy="15" r="1.5" fill="#3B82F6"/><circle cx="7" cy="9" r="1.5" fill="#3B82F6"/><circle cx="12" cy="12" r="2.5" fill="#3B82F6" fillOpacity=".4"/></svg>,
    dot: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="#E6007A"/><circle cx="12" cy="4.5" r="2" fill="#E6007A" fillOpacity=".7"/><circle cx="12" cy="19.5" r="2" fill="#E6007A" fillOpacity=".7"/></svg>,
    matic: <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15.5 8.5L12 6.5 8.5 8.5v4l3.5 2 3.5-2v-4z" fill="#8247E5" fillOpacity=".4"/><path d="M12 6.5l3.5 2v4L12 14.5V6.5z" fill="#8247E5" fillOpacity=".7"/><path d="M12 6.5L8.5 8.5v4L12 14.5V6.5z" fill="#8247E5"/></svg>,
  };
  return icons[id] || null;
}

function Spark({ data, color, h = 48, w = 140, filled = false }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-min)/r)*(h-4)-2}`);
  const line = `M${pts.join(" L")}`;
  return <svg width={w} height={h} style={{display:"block"}}>{filled && <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} fillOpacity=".12"/>}<path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function MiniLine({ data, color, w = 52, h = 18 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-min)/r)*(h-2)-1}`).join(" L");
  return <svg width={w} height={h} style={{display:"block"}}><path d={`M${pts}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function Gauge({ value, signal, size = "large", delay = 0 }) {
  const [av, setAv] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      let st = null; const dur = size === "large" ? 1200 : 900;
      const run = (ts) => { if (!st) st = ts; const p = Math.min((ts-st)/dur,1); setAv((1-Math.pow(1-p,3))*value); if (p<1) ref.current = requestAnimationFrame(run); };
      ref.current = requestAnimationFrame(run);
    }, delay);
    return () => { clearTimeout(t); if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, delay, size]);
  const color = signal.includes("BULL") ? "#22C55E" : signal === "BEARISH" ? "#EF4444" : "#F59E0B";
  const rot = (av/100)*180 - 90;
  if (size === "small") {
    const arc = 94, f = (av/100)*arc;
    return <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width="70" height="40" viewBox="0 0 72 42"><path d="M6 36 A30 30 0 0 1 66 36" fill="none" stroke="#1F2937" strokeWidth="5" strokeLinecap="round"/><path d="M6 36 A30 30 0 0 1 66 36" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${f} ${arc}`}/><line x1="36" y1="36" x2="36" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" transform={`rotate(${rot},36,36)`}/><circle cx="36" cy="36" r="3" fill={color}/><circle cx="36" cy="36" r="1.5" fill="#111318"/></svg>
      <div style={{fontSize:8,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace",marginTop:1,letterSpacing:".02em"}}>{signal.replace("CAUTIOUS ","C.")}</div>
    </div>;
  }
  const arc = 157, f = (av/100)*arc;
  return <div style={{position:"relative",width:120,height:68,margin:"0 auto"}}>
    <svg width="120" height="68" viewBox="0 0 120 68"><path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#1F2937" strokeWidth="8" strokeLinecap="round"/><path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${f} ${arc}`}/><circle cx={60+36*Math.cos((rot-90)*Math.PI/180)} cy={60+36*Math.sin((rot-90)*Math.PI/180)} r="6" fill={color} fillOpacity=".2"/><line x1="60" y1="60" x2="60" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${rot},60,60)`}/><circle cx="60" cy="60" r="4" fill={color}/><circle cx="60" cy="60" r="2" fill="#0A0B0F"/></svg>
    <div style={{textAlign:"center",marginTop:2}}><span style={{fontSize:18,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(av)}%</span></div>
  </div>;
}

const CSS = `@keyframes pg{0%,100%{opacity:.4}50%{opacity:1}}@keyframes su{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes fu{0%{background:rgba(34,197,94,.25)}100%{background:transparent}}@keyframes fd{0%{background:rgba(239,68,68,.25)}100%{background:transparent}}@keyframes pp{0%{transform:scale(1.05)}100%{transform:scale(1)}}@keyframes sp{to{transform:rotate(360deg)}}.ch:active{transform:scale(.97)}.ch{transition:transform .15s}*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}::-webkit-scrollbar{display:none}`;

// ─── Main App ─────────────────────────────────────────────────────
export default function IndoBit() {
  useSEO();
  const [page, setPage] = useState("home");
  const [selChain, setSelChain] = useState(null);
  const [cd, setCd] = useState(null);
  const [macroOpen, setMacroOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [showAll, setShowAll] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lp, setLp] = useState(null);
  const [pp, setPp] = useState(null);
  const [fl, setFl] = useState(null);
  const [ticks, setTicks] = useState([]);
  const [tn, setTn] = useState(0);
  const lpR = useRef(null), tiR = useRef(null);
  const [kbSec, setKbSec] = useState(null);
  const [kbArt, setKbArt] = useState(null);
  const [alerts, setAlerts] = useState([
    { id:1,type:"price",chain:"btc",condition:"above",value:70000,active:true,triggered:false },
    { id:2,type:"whale",chain:"eth",condition:">",value:50,unit:"M",active:true,triggered:true,at:"2h ago" },
    { id:3,type:"flow",chain:"sol",condition:">",value:20,unit:"M",active:false,triggered:false },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [na, setNa] = useState({type:"price",chain:"btc",cond:"above",value:""});

  useEffect(()=>{
    if(!cd){setLp(null);setTicks([]);if(tiR.current)clearInterval(tiR.current);return;}
    let c=cd.currentPrice;setLp(c);lpR.current=c;setTicks([c]);
    const v={btc:.0008,eth:.001,sol:.0015,avax:.002,bnb:.0009,ada:.0018,dot:.0016,matic:.002}[cd.chain.id]||.001;
    tiR.current=setInterval(()=>{const p=lpR.current,n=p*(1+(Math.random()-.48)*v*2);lpR.current=n;setPp(p);setLp(n);setFl(n>p?"up":"down");setTn(x=>x+1);setTicks(t=>{const r=[...t,n];return r.length>60?r.slice(-60):r;});setTimeout(()=>setFl(null),400);},1500);
    return()=>{if(tiR.current)clearInterval(tiR.current);};
  },[cd]);

  const pickChain=useCallback(id=>{setLoading(true);setAnimIn(false);setShowAll(false);setTab("overview");setTimeout(()=>{setSelChain(id);setCd(generateChainData(id));setLoading(false);setTimeout(()=>setAnimIn(true),50);},500);},[]);
  const goHome=()=>{setAnimIn(false);if(tiR.current)clearInterval(tiR.current);setTimeout(()=>{setSelChain(null);setCd(null);},200);};
  const goBack=()=>{if(kbArt)setKbArt(null);else if(kbSec)setKbSec(null);else goHome();};

  const dp=lp??cd?.currentPrice??0, lChg=cd?((dp-cd.prices[0])/cd.prices[0])*100:0;
  const fc=fl==="up"?"#22C55E":fl==="down"?"#EF4444":null;
  const addAlert=()=>{if(!na.value)return;setAlerts(p=>[...p,{id:Date.now(),type:na.type,chain:na.chain,condition:na.cond,value:Number(na.value),active:true,triggered:false,unit:na.type!=="price"?"M":undefined}]);setNa({type:"price",chain:"btc",cond:"above",value:""});setShowAdd(false);};

  return(
  <div style={{minHeight:"100vh",background:"#0A0B0F",color:"#E5E7EB",fontFamily:"'Inter','Segoe UI',sans-serif",maxWidth:430,margin:"0 auto",position:"relative",paddingBottom:72}}>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>{CSS}</style>

  {/* HEADER */}
  <header style={{padding:"14px 20px 10px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid rgba(255,255,255,.06)",position:"sticky",top:0,zIndex:20,background:"rgba(10,11,15,.92)",backdropFilter:"blur(20px)"}}>
    {(selChain||kbArt||kbSec)&&<button onClick={goBack} style={{background:"none",border:"none",color:"#9CA3AF",fontSize:20,cursor:"pointer",padding:"4px 8px 4px 0"}} aria-label="Back">←</button>}
    <div style={{flex:1}}>
      <h1 style={{fontSize:15,fontWeight:800,letterSpacing:"-.02em",margin:0,background:"linear-gradient(135deg,#F7931A,#F59E0B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>INDOBIT</h1>
      <div style={{fontSize:8,color:"#6B7280",fontFamily:"'JetBrains Mono',monospace",marginTop:1,letterSpacing:".06em"}}>SMARTER TRADING & INVESTING DECISIONS</div>
    </div>
    <div style={{width:7,height:7,borderRadius:"50%",background:"#22C55E",animation:"pg 2s ease-in-out infinite",boxShadow:"0 0 8px #22C55E"}}/>
    <span style={{fontSize:8,color:"#6B7280",fontFamily:"monospace"}}>LIVE</span>
  </header>

  {/* ═══ HOME ═══ */}
  {page==="home"&&!selChain&&!loading&&<main style={{padding:"16px 0 0"}}>
    {/* Macro */}
    <section style={{padding:"0 16px",marginBottom:16}} aria-label="Macro">
      <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-.03em",color:"#F9FAFB",margin:"0 0 2px"}}>Market Pulse</h2>
      <p style={{fontSize:11,color:"#6B7280",margin:"0 0 14px"}}>Macro signals & on-chain intelligence</p>
      <div onClick={()=>setMacroOpen(!macroOpen)} style={{padding:14,background:`linear-gradient(135deg,${MACRO.signal.color}08,${MACRO.signal.color}03)`,borderRadius:14,border:`1px solid ${MACRO.signal.color}20`,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:7,height:7,borderRadius:"50%",background:MACRO.signal.color,boxShadow:`0 0 8px ${MACRO.signal.color}`,animation:"pg 2s ease-in-out infinite"}}/><span style={{fontSize:9,color:"#9CA3AF",fontWeight:600,letterSpacing:".08em"}}>MACRO ENVIRONMENT</span></div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:11,fontWeight:800,color:MACRO.signal.color,fontFamily:"'JetBrains Mono',monospace"}}>{MACRO.signal.label}</span><span style={{fontSize:13,color:"#6B7280",transform:macroOpen?"rotate(180deg)":"",transition:"transform .3s",display:"inline-block"}}>▾</span></div>
        </div>
        {!macroOpen&&<div style={{fontSize:10,color:"#9CA3AF",lineHeight:1.5,marginTop:6}}>{MACRO.signal.text.slice(0,85)}...</div>}
      </div>
      <div style={{maxHeight:macroOpen?999:0,overflow:"hidden",transition:"max-height .4s ease"}}>
        <div style={{padding:"10px 14px",marginTop:6,background:"#111318",borderRadius:12,fontSize:11,color:"#D1D5DB",lineHeight:1.7}}>{MACRO.signal.text}</div>
        {MACRO.indicators.map((ind,i)=>{const chg=(ind.value-ind.prev)/ind.prev*100,up=chg>0,ic=ind.impact==="positive"?"#22C55E":ind.impact==="negative"?"#EF4444":"#F59E0B";return<div key={ind.id} style={{padding:"10px 12px",background:"#111318",borderRadius:10,marginTop:5,animation:`su .3s ease-out ${i*.04}s both`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><span style={{fontSize:10,color:"#9CA3AF",fontWeight:500}}>{ind.label}</span><span style={{fontSize:7,padding:"1px 4px",borderRadius:3,background:`${ic}15`,color:ic,fontWeight:700}}>{ind.impact==="positive"?"CRYPTO +":ind.impact==="negative"?"CRYPTO −":"NEUTRAL"}</span></div><div style={{display:"flex",alignItems:"baseline",gap:5}}><span style={{fontSize:16,fontWeight:800,color:"#F9FAFB",fontFamily:"'JetBrains Mono',monospace"}}>{ind.id==="m2"?"$":""}{ind.value}{ind.unit}</span><span style={{fontSize:9,fontWeight:600,color:up?"#22C55E":"#EF4444",fontFamily:"'JetBrains Mono',monospace"}}>{up?"▲":"▼"}{Math.abs(chg).toFixed(1)}%</span></div></div>
            <MiniLine data={ind.history} color={ind.history[6]>=ind.history[0]?"#22C55E":"#EF4444"}/>
          </div>
          <div style={{fontSize:9,color:"#6B7280",marginTop:5,lineHeight:1.5,borderTop:"1px solid rgba(255,255,255,.04)",paddingTop:5}}>{ind.desc}</div>
        </div>;})}
      </div>
    </section>
    {/* Chains */}
    <section aria-label="Chains"><div style={{padding:"0 20px 10px"}}><h3 style={{fontSize:12,fontWeight:700,color:"#9CA3AF",letterSpacing:".04em",margin:0}}>ON-CHAIN ANALYSIS</h3><p style={{fontSize:10,color:"#4B5563",margin:"2px 0 0"}}>7-day whale & exchange flow analysis</p></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 16px"}}>
        {CHAINS.map((c,i)=>{const pv=CHAIN_PREVIEWS[c.id];return<button key={c.id} onClick={()=>pickChain(c.id)} className="ch" style={{background:"linear-gradient(135deg,#111318,#1A1D25)",border:"1px solid rgba(255,255,255,.06)",borderRadius:14,padding:"12px 12px 8px",cursor:"pointer",textAlign:"left",animation:`su .4s ease-out ${i*.05}s both`}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
            <div style={{width:30,height:30,borderRadius:9,background:`${c.color}18`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${c.color}30`,flexShrink:0}}><ChainIcon id={c.id} size={16}/></div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:"#F9FAFB"}}>{c.name}</div><div style={{fontSize:9,fontWeight:600,color:pv.priceChange>=0?"#22C55E":"#EF4444",fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>{pv.priceChange>=0?"▲":"▼"}{Math.abs(pv.priceChange).toFixed(1)}% <span style={{color:"#6B7280"}}>7d</span></div></div>
          </div>
          <Gauge value={pv.trendConfidence} signal={pv.trendSignal} size="small" delay={i*80}/>
        </button>;})}
      </div>
    </section>
  </main>}

  {/* Loading */}
  {page==="home"&&loading&&<div style={{padding:"50px 20px",textAlign:"center"}}><div style={{width:44,height:44,border:"3px solid #1F2937",borderTopColor:"#F59E0B",borderRadius:"50%",margin:"0 auto 14px",animation:"sp .8s linear infinite"}}/><div style={{fontSize:12,color:"#9CA3AF"}}>Scanning on-chain data...</div></div>}

  {/* ═══ CHAIN DETAIL ═══ */}
  {page==="home"&&cd&&!loading&&<div style={{opacity:animIn?1:0,transform:animIn?"translateY(0)":"translateY(10px)",transition:"all .35s ease-out"}}>
    {/* Price */}
    <article style={{margin:"14px 16px 0",padding:"16px",background:"linear-gradient(135deg,#111318,#1A1D25)",borderRadius:16,border:`1px solid ${cd.chain.color}20`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><ChainIcon id={cd.chain.id} size={20}/><span style={{fontSize:15,fontWeight:800,color:"#F9FAFB"}}>{cd.chain.name}</span></div>
          <div key={tn} style={{fontSize:24,fontWeight:800,color:fc||"#F9FAFB",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-.02em",padding:"2px 4px",marginLeft:-4,borderRadius:6,animation:fl==="up"?"fu .5s ease-out,pp .3s ease-out":fl==="down"?"fd .5s ease-out,pp .3s ease-out":"none",transition:"color .3s"}}>
            ${dp<1?dp.toFixed(4):dp.toLocaleString(undefined,{maximumFractionDigits:dp>100?2:4})}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
            <span style={{fontSize:10,fontWeight:600,color:lChg>=0?"#22C55E":"#EF4444",fontFamily:"'JetBrains Mono',monospace"}}>{lChg>=0?"▲":"▼"}{Math.abs(lChg).toFixed(2)}% <span style={{color:"#6B7280",fontSize:8}}>7d</span></span>
            {pp!=null&&<span key={tn} style={{fontSize:8,fontWeight:600,color:lp>pp?"#22C55E":"#EF4444",fontFamily:"'JetBrains Mono',monospace",opacity:fl?1:.4}}>{lp>pp?"+":""}{((lp-pp)/pp*100).toFixed(3)}%</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
          <Spark data={cd.prices} color={cd.priceChange>=0?"#22C55E":"#EF4444"} filled h={32} w={95}/>
          {ticks.length>2&&<div style={{position:"relative"}}><Spark data={ticks} color={ticks[ticks.length-1]>=ticks[0]?"#22C55E":"#EF4444"} h={20} w={95}/><div style={{position:"absolute",top:-1,right:-1,width:4,height:4,borderRadius:"50%",background:ticks[ticks.length-1]>=(ticks[ticks.length-2]||0)?"#22C55E":"#EF4444",boxShadow:`0 0 5px ${ticks[ticks.length-1]>=(ticks[ticks.length-2]||0)?"#22C55E":"#EF4444"}`,animation:"pg 1s ease-in-out infinite"}}/><span style={{fontSize:6,color:"#6B7280",fontFamily:"monospace",position:"absolute",bottom:-6,right:0}}>LIVE</span></div>}
        </div>
      </div>
    </article>
    {/* Trend */}
    {(()=>{const tc=cd.trendSignal.includes("BULL")?"#22C55E":cd.trendSignal==="BEARISH"?"#EF4444":"#F59E0B";return<article style={{margin:"10px 16px 0",padding:"16px",background:`linear-gradient(135deg,${tc}08,${tc}03)`,borderRadius:16,border:`1px solid ${tc}25`}}>
      <div style={{fontSize:9,color:"#9CA3AF",fontWeight:600,marginBottom:6,letterSpacing:".08em"}}>TREND PREDICTION</div>
      <div style={{display:"flex",alignItems:"center",gap:14}}><Gauge value={cd.trendConfidence} signal={cd.trendSignal}/><div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:tc,fontFamily:"'JetBrains Mono',monospace",marginBottom:4}}>{cd.trendSignal}</div><div style={{fontSize:10,color:"#9CA3AF",lineHeight:1.5}}>{cd.trendReason}</div></div></div>
    </article>;})()}
    {/* Tabs */}
    <nav style={{display:"flex",gap:4,padding:"12px 16px 0"}}>
      {["overview","whales","flows"].map(t=><button key={t} onClick={()=>{setTab(t);setShowAll(false);}} style={{flex:1,padding:"6px 0",borderRadius:8,background:tab===t?"rgba(255,255,255,.08)":"transparent",border:"1px solid rgba(255,255,255,.06)",color:tab===t?"#fff":"#6B7280",fontSize:10,fontWeight:600,cursor:"pointer",textTransform:"uppercase",letterSpacing:".04em"}}>{t==="overview"?"Insights":t==="whales"?"Whales":"Flows"}</button>)}
    </nav>
    <div style={{padding:"8px 16px 20px"}}>
      {tab==="overview"&&<div>
        {cd.insights.map((ins,i)=>{const sc=ins.severity==="high"?"#EF4444":ins.severity==="medium"?"#F59E0B":"#6B7280";return<div key={i} style={{padding:"11px 13px",marginTop:5,background:"#111318",borderRadius:11,borderLeft:`3px solid ${sc}`,animation:`su .3s ease-out ${i*.06}s both`}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><span style={{fontSize:7,fontWeight:700,padding:"1px 4px",borderRadius:3,background:`${sc}20`,color:sc,textTransform:"uppercase",letterSpacing:".1em"}}>{ins.severity}</span><span style={{fontSize:8,color:"#6B7280",textTransform:"uppercase",fontFamily:"monospace"}}>{ins.type}</span></div><div style={{fontSize:11,color:"#D1D5DB",lineHeight:1.6}}>{ins.text}</div></div>;})}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:12}}>
          {[{l:"Ex. Inflow",v:fU(cd.totalInflow),c:"#EF4444"},{l:"Ex. Outflow",v:fU(cd.totalOutflow),c:"#22C55E"},{l:"Minted",v:fU(cd.stableMinted),c:"#F59E0B"},{l:"Burned",v:fU(cd.stableBurned),c:"#8B5CF6"}].map((s,i)=><div key={i} style={{padding:10,background:"#111318",borderRadius:10,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</div><div style={{fontSize:8,color:"#6B7280",marginTop:2}}>{s.l}</div></div>)}
        </div>
      </div>}
      {tab==="whales"&&<div style={{background:"#111318",borderRadius:11,padding:"4px 11px",marginTop:5}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 3px"}}><span style={{fontSize:9,fontWeight:600,color:"#9CA3AF"}}>{cd.whaleMovements.length} txs</span><div style={{display:"flex",gap:6,fontSize:8}}><span style={{color:"#EF4444"}}>● in</span><span style={{color:"#22C55E"}}>● out</span></div></div>
        {(showAll?cd.whaleMovements:cd.whaleMovements.slice(0,6)).map(m=>{const inf=m.type==="exchange_inflow";return<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
          <div style={{width:26,height:26,borderRadius:6,background:inf?"rgba(239,68,68,.12)":"rgba(34,197,94,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{inf?"↗":"↙"}</div>
          <div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:600,color:"#E5E7EB",fontFamily:"'JetBrains Mono',monospace"}}>{fN(m.amount)} <span style={{color:m.isStablecoin?"#F59E0B":cd.chain.color,fontSize:9}}>{m.asset}</span></span><span style={{fontSize:8,color:"#6B7280"}}>{m.daysAgo===0?"today":`${m.daysAgo}d`}</span></div><div style={{fontSize:8,color:"#6B7280",marginTop:1,fontFamily:"monospace"}}><span style={{color:inf?"#EF4444":"#9CA3AF"}}>{m.from}</span> → <span style={{color:inf?"#9CA3AF":"#22C55E"}}>{m.to}</span></div></div>
        </div>;})}
        {cd.whaleMovements.length>6&&<button onClick={()=>setShowAll(!showAll)} style={{width:"100%",padding:8,background:"none",border:"1px solid rgba(255,255,255,.06)",borderRadius:7,color:"#9CA3AF",fontSize:9,cursor:"pointer",margin:"5px 0"}}>{showAll?"Less":`All ${cd.whaleMovements.length}`}</button>}
      </div>}
      {tab==="flows"&&<div>
        <div style={{background:"#111318",borderRadius:11,padding:12,marginTop:5}}>
          <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",marginBottom:8}}>EXCHANGE FLOWS (7D)</div>
          <div style={{display:"flex",gap:4,alignItems:"flex-end",height:80}}>
            {cd.exchangeInflows.map((inf,i)=>{const out=cd.exchangeOutflows[i],mx=Math.max(...cd.exchangeInflows,...cd.exchangeOutflows);return<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><div style={{display:"flex",gap:2,alignItems:"flex-end",height:65}}><div style={{width:6,height:(inf/mx)*58,background:"#EF4444",borderRadius:2,opacity:.8}}/><div style={{width:6,height:(out/mx)*58,background:"#22C55E",borderRadius:2,opacity:.8}}/></div><span style={{fontSize:7,color:"#6B7280",fontFamily:"monospace"}}>{"MTWTFSS"[i]}</span></div>;})}
          </div>
        </div>
        <div style={{background:"#111318",borderRadius:11,padding:12,marginTop:5}}>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:7,color:"#6B7280",marginBottom:2}}>IN</div><div style={{fontSize:12,fontWeight:800,color:"#EF4444",fontFamily:"'JetBrains Mono',monospace"}}>{fU(cd.totalInflow)}</div></div>
            <div style={{fontSize:16,color:"#4B5563"}}>→</div>
            <div style={{textAlign:"center"}}><div style={{fontSize:7,color:"#6B7280",marginBottom:2}}>NET</div><div style={{fontSize:12,fontWeight:800,color:cd.netFlow>0?"#EF4444":"#22C55E",fontFamily:"'JetBrains Mono',monospace"}}>{cd.netFlow>0?"+":""}{fU(cd.netFlow)}</div></div>
            <div style={{fontSize:16,color:"#4B5563"}}>←</div>
            <div style={{textAlign:"center"}}><div style={{fontSize:7,color:"#6B7280",marginBottom:2}}>OUT</div><div style={{fontSize:12,fontWeight:800,color:"#22C55E",fontFamily:"'JetBrains Mono',monospace"}}>{fU(cd.totalOutflow)}</div></div>
          </div>
          <div style={{padding:"7px 9px",borderRadius:7,background:cd.netFlow>0?"#EF444410":"#22C55E10",border:`1px solid ${cd.netFlow>0?"#EF444420":"#22C55E20"}`,fontSize:9,color:"#D1D5DB",lineHeight:1.5,textAlign:"center",marginTop:8}}>{cd.netFlow>0?"⚠ Net inflow — potential sell pressure":"✓ Net outflow — accumulation pattern"}</div>
        </div>
      </div>}
    </div>
  </div>}

  {/* ═══ LEARN ═══ */}
  {page==="learn"&&!kbSec&&<main style={{padding:"20px 16px"}}>
    <h2 style={{fontSize:20,fontWeight:800,color:"#F9FAFB",margin:"0 0 3px",letterSpacing:"-.03em"}}>Knowledge Base</h2>
    <p style={{fontSize:11,color:"#6B7280",margin:"0 0 18px"}}>Understand every metric IndoBit uses</p>
    {Object.entries(KB).map(([k,sec],i)=><button key={k} onClick={()=>setKbSec(k)} className="ch" style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:16,background:"linear-gradient(135deg,#111318,#1A1D25)",border:"1px solid rgba(255,255,255,.06)",borderRadius:14,cursor:"pointer",marginBottom:10,textAlign:"left",animation:`su .4s ease-out ${i*.08}s both`}}>
      <div style={{fontSize:26,width:46,height:46,borderRadius:12,background:"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sec.icon}</div>
      <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#F9FAFB"}}>{sec.title}</div><div style={{fontSize:10,color:"#6B7280",marginTop:2,lineHeight:1.4}}>{sec.desc}</div><div style={{fontSize:9,color:"#9CA3AF",marginTop:3}}>{sec.articles.length} articles</div></div>
      <span style={{color:"#4B5563",fontSize:16}}>›</span>
    </button>)}
  </main>}
  {page==="learn"&&kbSec&&!kbArt&&<main style={{padding:"20px 16px"}}>
    <h2 style={{fontSize:18,fontWeight:800,color:"#F9FAFB",margin:"0 0 3px"}}>{KB[kbSec].icon} {KB[kbSec].title}</h2>
    <p style={{fontSize:11,color:"#6B7280",margin:"0 0 14px"}}>{KB[kbSec].desc}</p>
    {KB[kbSec].articles.map((a,i)=><button key={a.id} onClick={()=>setKbArt(a)} className="ch" style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 14px",background:"#111318",border:"1px solid rgba(255,255,255,.04)",borderRadius:11,cursor:"pointer",marginBottom:6,textAlign:"left",animation:`su .3s ease-out ${i*.05}s both`}}>
      <div><div style={{fontSize:13,fontWeight:600,color:"#F9FAFB"}}>{a.title}</div><div style={{fontSize:9,color:"#6B7280",marginTop:2}}>{a.time} read · {a.sections.length} sections</div></div>
      <span style={{color:"#4B5563",fontSize:14}}>›</span>
    </button>)}
  </main>}
  {page==="learn"&&kbArt&&<article style={{padding:"20px 16px"}}>
    <div style={{fontSize:9,color:"#9CA3AF",fontWeight:600,letterSpacing:".06em",marginBottom:5}}>{KB[kbSec].title.toUpperCase()}</div>
    <h2 style={{fontSize:20,fontWeight:800,color:"#F9FAFB",margin:"0 0 3px",letterSpacing:"-.02em"}}>{kbArt.title}</h2>
    <div style={{fontSize:10,color:"#6B7280",marginBottom:16}}>{kbArt.time} read</div>
    {kbArt.sections.map((b,i)=><section key={i} style={{marginBottom:16,animation:`su .35s ease-out ${i*.08}s both`}}>
      <h3 style={{fontSize:13,fontWeight:700,color:"#F59E0B",margin:"0 0 5px"}}>{b.h}</h3>
      <p style={{fontSize:12,color:"#D1D5DB",lineHeight:1.8,margin:0}}>{b.p}</p>
    </section>)}
    <div style={{padding:"11px 13px",background:"rgba(247,147,26,.06)",border:"1px solid rgba(247,147,26,.15)",borderRadius:10,marginTop:6}}>
      <div style={{fontSize:10,fontWeight:600,color:"#F7931A",marginBottom:2}}>💡 Apply this knowledge</div>
      <div style={{fontSize:10,color:"#9CA3AF",lineHeight:1.5}}>Check the live {kbSec==="macro"?"macro dashboard":"on-chain analysis"} on the Home tab to see this metric in action.</div>
    </div>
  </article>}

  {/* ═══ ALERTS ═══ */}
  {page==="alerts"&&<main style={{padding:"20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div><h2 style={{fontSize:20,fontWeight:800,color:"#F9FAFB",margin:"0 0 2px",letterSpacing:"-.03em"}}>Alerts</h2><p style={{fontSize:11,color:"#6B7280",margin:0}}>Get notified on key movements</p></div>
      <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"7px 13px",background:showAdd?"#EF444420":"rgba(247,147,26,.15)",border:`1px solid ${showAdd?"#EF444440":"rgba(247,147,26,.3)"}`,borderRadius:9,color:showAdd?"#EF4444":"#F7931A",fontSize:11,fontWeight:700,cursor:"pointer"}}>{showAdd?"Cancel":"+ New"}</button>
    </div>
    {showAdd&&<div style={{padding:14,background:"#111318",borderRadius:13,border:"1px solid rgba(247,147,26,.15)",marginBottom:12,animation:"su .3s ease-out both"}}>
      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",marginBottom:8,letterSpacing:".06em"}}>CREATE ALERT</div>
      <div style={{marginBottom:8}}><label style={{fontSize:8,color:"#6B7280",display:"block",marginBottom:3}}>Type</label><div style={{display:"flex",gap:4}}>{[{v:"price",l:"Price"},{v:"whale",l:"Whale"},{v:"flow",l:"Net Flow"}].map(t=><button key={t.v} onClick={()=>setNa(p=>({...p,type:t.v,cond:t.v==="price"?"above":">"}))} style={{flex:1,padding:"6px 0",borderRadius:7,background:na.type===t.v?"rgba(247,147,26,.15)":"rgba(255,255,255,.04)",border:`1px solid ${na.type===t.v?"rgba(247,147,26,.3)":"rgba(255,255,255,.06)"}`,color:na.type===t.v?"#F7931A":"#9CA3AF",fontSize:9,fontWeight:600,cursor:"pointer"}}>{t.l}</button>)}</div></div>
      <div style={{marginBottom:8}}><label style={{fontSize:8,color:"#6B7280",display:"block",marginBottom:3}}>Chain</label><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{CHAINS.map(c=><button key={c.id} onClick={()=>setNa(p=>({...p,chain:c.id}))} style={{padding:"4px 9px",borderRadius:6,background:na.chain===c.id?`${c.color}20`:"rgba(255,255,255,.04)",border:`1px solid ${na.chain===c.id?`${c.color}40`:"rgba(255,255,255,.06)"}`,color:na.chain===c.id?c.color:"#9CA3AF",fontSize:8,fontWeight:600,cursor:"pointer"}}>{c.symbol}</button>)}</div></div>
      <div style={{marginBottom:10}}><label style={{fontSize:8,color:"#6B7280",display:"block",marginBottom:3}}>Threshold</label><div style={{display:"flex",gap:5}}>
        {na.type==="price"&&<div style={{display:"flex",gap:3}}>{["above","below"].map(c=><button key={c} onClick={()=>setNa(p=>({...p,cond:c}))} style={{padding:"5px 10px",borderRadius:6,background:na.cond===c?"rgba(255,255,255,.08)":"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)",color:na.cond===c?"#F9FAFB":"#6B7280",fontSize:9,cursor:"pointer"}}>{c}</button>)}</div>}
        <input value={na.value} onChange={e=>setNa(p=>({...p,value:e.target.value}))} placeholder={na.type==="price"?"e.g. 70000":"$M threshold"} style={{flex:1,padding:"5px 9px",borderRadius:6,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#F9FAFB",fontSize:10,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
      </div></div>
      <button onClick={addAlert} style={{width:"100%",padding:"9px 0",background:"linear-gradient(135deg,#F7931A,#F59E0B)",border:"none",borderRadius:9,color:"#0A0B0F",fontSize:11,fontWeight:800,cursor:"pointer"}}>Create Alert</button>
    </div>}
    <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",marginBottom:7,letterSpacing:".06em"}}>YOUR ALERTS ({alerts.length})</div>
    {alerts.length===0&&<div style={{padding:28,textAlign:"center",color:"#4B5563",fontSize:11}}>No alerts yet.</div>}
    {alerts.map((al,i)=>{const ch=CHAINS.find(c=>c.id===al.chain);return<div key={al.id} style={{padding:"11px 13px",background:"#111318",borderRadius:11,marginBottom:6,border:al.triggered?"1px solid #F59E0B30":"1px solid rgba(255,255,255,.04)",opacity:al.active?1:.45,animation:`su .3s ease-out ${i*.04}s both`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:24,height:24,borderRadius:6,background:`${ch?.color||"#666"}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><ChainIcon id={al.chain} size={12}/></div>
          <div><div style={{fontSize:11,fontWeight:600,color:"#F9FAFB"}}>{al.type==="price"?`Price ${al.condition} $${al.value.toLocaleString()}`:`${al.type==="whale"?"Whale":"Flow"} >${al.value}${al.unit||""}`}</div><div style={{fontSize:8,color:"#6B7280",marginTop:1}}>{ch?.name}{al.triggered?` · Triggered ${al.at}`:""}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {al.triggered&&<div style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",boxShadow:"0 0 5px #F59E0B",animation:"pg 1.5s ease-in-out infinite"}}/>}
          <button onClick={()=>setAlerts(p=>p.map(a=>a.id===al.id?{...a,active:!a.active}:a))} style={{padding:"3px 7px",borderRadius:5,background:al.active?"#22C55E20":"rgba(255,255,255,.04)",border:"none",color:al.active?"#22C55E":"#6B7280",fontSize:7,fontWeight:700,cursor:"pointer"}}>{al.active?"ON":"OFF"}</button>
          <button onClick={()=>setAlerts(p=>p.filter(a=>a.id!==al.id))} style={{background:"none",border:"none",color:"#EF4444",fontSize:13,cursor:"pointer",padding:"1px 3px",opacity:.5}}>×</button>
        </div>
      </div>
    </div>;})}
    <div style={{padding:"11px 13px",background:"rgba(255,255,255,.02)",borderRadius:9,marginTop:12,border:"1px solid rgba(255,255,255,.04)"}}>
      <div style={{fontSize:8,fontWeight:600,color:"#6B7280",marginBottom:3}}>HOW ALERTS WORK</div>
      <div style={{fontSize:9,color:"#4B5563",lineHeight:1.6}}><strong style={{color:"#9CA3AF"}}>Price</strong> — triggers when price crosses your threshold. <strong style={{color:"#9CA3AF"}}>Whale</strong> — triggers on transfers above your $M threshold. <strong style={{color:"#9CA3AF"}}>Flow</strong> — triggers when net exchange flow exceeds threshold.</div>
    </div>
  </main>}

  {/* ═══ BOTTOM NAV ═══ */}
  <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(10,11,15,.95)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",padding:"6px 0 env(safe-area-inset-bottom,8px)",zIndex:30}} aria-label="Main nav">
    {[
      {id:"home",label:"Home",icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
      {id:"learn",label:"Learn",icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>},
      {id:"alerts",label:"Alerts",icon:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,badge:alerts.filter(a=>a.triggered).length},
    ].map(t=><button key={t.id} onClick={()=>{setPage(t.id);if(t.id==="home"){setSelChain(null);setCd(null);setKbSec(null);setKbArt(null);}if(t.id==="learn"){setKbSec(null);setKbArt(null);}setShowAdd(false);}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 0",background:"none",border:"none",color:page===t.id?"#F7931A":"#6B7280",cursor:"pointer",position:"relative",transition:"color .2s"}}>
      <div style={{position:"relative"}}>{t.icon}{t.badge>0&&<div style={{position:"absolute",top:-3,right:-5,width:13,height:13,borderRadius:"50%",background:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:800,color:"#fff"}}>{t.badge}</div>}</div>
      <span style={{fontSize:8,fontWeight:600}}>{t.label}</span>
    </button>)}
  </nav>

  <div style={{padding:"6px 20px 80px",fontSize:7,color:"#374151",textAlign:"center"}}>Simulated data for demonstration. Not financial advice. DYOR.</div>
  </div>);
}
