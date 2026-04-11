import { useState } from “react”;

// ═══════════════════════════════════════════════════════════════
// ALL DATA FROM REAL SOURCES — fetched Apr 11, 2026
// No API calls, no runtime parsing, no bullshit
// ═══════════════════════════════════════════════════════════════

const SNAPSHOT = {
date: “Apr 11, 2026”,
sources: “Yahoo Finance, FRED, CBOE, ICI, DeFiLlama, EIA, Fed”,
};

const METRICS = [
{
id: “fed_rate”, label: “Fed Funds Rate”, value: 3.625, unit: “%”,
cat: “Monetary Policy”, icon: “🏛️”,
low: 0, high: 6, hist: [0.08, 0.08, 0.09, 0.13, 0.39, 1.00, 1.83, 2.16, 0.36, 0.08, 1.68, 5.33, 4.76, 3.625],
histLabels: [”’13”,”’14”,”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Target range 3.50–3.75%. Held steady for 2nd meeting in March 2026. Fed signals 1 cut this year. Cleveland Fed warns hike possible if inflation persists.”,
src: “Federal Reserve FOMC March 2026 Minutes”,
},
{
id: “fed_bs”, label: “Fed Balance Sheet”, value: 6.7, unit: “$T”,
cat: “Monetary Policy”, icon: “🏛️”,
low: 4, high: 9, hist: [4.0, 4.1, 4.4, 4.4, 4.1, 3.7, 7.4, 8.9, 8.5, 7.7, 6.9, 6.7],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Down from $8.9T peak (Apr 2022). QT ongoing but slowed. Fed purchasing T-bills up to $40B/month for reserve management through Apr 2026.”,
src: “American Action Forum, FRED WALCL (Apr 1, 2026)”,
},
{
id: “mmf”, label: “Money Market Funds”, value: 7.86, unit: “$T”,
cat: “Cash Positioning”, icon: “🏦”,
low: 3, high: 8, hist: [2.7, 2.8, 2.9, 3.0, 3.6, 4.8, 4.5, 5.2, 5.9, 6.8, 7.5, 7.86],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Record $7.86 TRILLION sitting in money markets. Up $38.7B in one week alone. Government funds dominate at $6.5T. This is the largest cash pile in history.”,
src: “Investment Company Institute (ICI), week ending Mar 18, 2026”,
},
{
id: “vix”, label: “VIX Volatility Index”, value: 19.12, unit: “”,
cat: “Risk Appetite”, icon: “⚡”,
low: 9, high: 50, hist: [14.2, 16.7, 15.8, 11.1, 16.6, 15.4, 29.3, 19.7, 25.6, 16.8, 15.5, 19.12],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “At 19.12, moderate but not panicked — remarkable given active US-Iran war. Markets pricing ceasefire holding. Range past 52wk: 13.38–46.12.”,
src: “CBOE (Apr 10, 2026 close)”,
},
{
id: “dxy”, label: “US Dollar Index (DXY)”, value: 98.70, unit: “”,
cat: “Dollar”, icon: “💲”,
low: 85, high: 115, hist: [99, 103, 92, 96, 97, 90, 96, 104, 101, 108, 100, 98.70],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Below 100 — weakest since Sep 2025. Down from 109 in Jan 2025. On track for biggest weekly drop since January. Eases EM and commodity pressure.”,
src: “ICE / Yahoo Finance (Apr 10, 2026)”,
},
{
id: “sp500”, label: “S&P 500”, value: 6817, unit: “”,
cat: “Risk Appetite”, icon: “📈”,
low: 4000, high: 7500, hist: [2044, 2239, 2674, 2507, 3231, 3756, 4766, 3840, 4770, 5881, 6500, 6817],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “7 consecutive days of gains. Resilient despite Iran war. AI and tech sectors leading. Nasdaq +0.35% on the day.”,
src: “Yahoo Finance (Apr 10, 2026 close)”,
},
{
id: “gold”, label: “Gold”, value: 4771, unit: “$/oz”,
cat: “Safe Havens”, icon: “🥇”,
low: 1800, high: 5500, hist: [1060, 1146, 1303, 1282, 1517, 1898, 1829, 1824, 2063, 2624, 3300, 4771],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Near all-time highs. Shaky Iran ceasefire providing underlying support. Central bank buying continues. Up ~45% YoY. Massive safe-haven bid.”,
src: “Yahoo Finance (Apr 10, 2026)”,
},
{
id: “oil”, label: “Brent Crude Oil”, value: 96.7, unit: “$/bbl”,
cat: “Energy / Inflation”, icon: “🛢️”,
low: 30, high: 140, hist: [52, 44, 55, 71, 64, 42, 71, 99, 83, 80, 74, 96.7],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Down from $118 peak in March but still elevated. Strait of Hormuz largely closed. Saudi output cut 600k bpd from facility attacks. Iran ceasefire fragile.”,
src: “Trading Economics / EIA (Apr 10, 2026)”,
},
{
id: “yield10”, label: “10Y Treasury Yield”, value: 4.31, unit: “%”,
cat: “Rates”, icon: “📜”,
low: 0.5, high: 5.5, hist: [2.27, 2.45, 2.41, 2.69, 1.92, 0.93, 1.51, 3.88, 3.88, 4.57, 4.25, 4.31],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “2Y at 3.81%, 10Y at 4.31% — yield curve steepening. 30Y at 4.91%. 30yr mortgage at 6.37%. Positive term premium despite war.”,
src: “ETF Trends / Treasury Dept (Apr 10, 2026)”,
},
{
id: “stables”, label: “Stablecoin Supply”, value: 317, unit: “$B”,
cat: “Crypto Liquidity”, icon: “₿”,
low: 50, high: 350, hist: [5, 10, 16, 28, 38, 130, 150, 137, 135, 200, 280, 317],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “All-time high $317B. Over 50% growth since early 2025. Driven by GENIUS Act regulation, institutional adoption, and cross-border payment use.”,
src: “Federal Reserve FEDS Notes / DeFiLlama (Apr 6, 2026)”,
},
{
id: “btc”, label: “Bitcoin”, value: 72946, unit: “$”,
cat: “Crypto Liquidity”, icon: “₿”,
low: 15000, high: 110000, hist: [430, 960, 14000, 3700, 7200, 29000, 46300, 16500, 42300, 93400, 82000, 72946],
histLabels: [”’15”,”’16”,”’17”,”’18”,”’19”,”’20”,”’21”,”’22”,”’23”,”’24”,”’25”,“Now”],
desc: “Down ~22% from 2024 high of $93k. ETF flows have slowed. War uncertainty and elevated rates weighing. Still above 2023 levels.”,
src: “Yahoo Finance (Apr 11, 2026)”,
},
];

// ═══ SIGNALS — computed from actual data ═══
const SIGNALS = [
{ t: “RECORD CASH”, c: “#00cc66”, s: “$7.86T in money markets — largest cash pile in history. Massive dry powder on sidelines waiting for deployment.” },
{ t: “GOLD ATH”, c: “#d4a017”, s: “Gold near $4,771/oz — extreme safe-haven bid from Iran war, inflation expectations, and central bank buying.” },
{ t: “OIL SHOCK”, c: “#ff4040”, s: “Brent at $97/bbl — Strait of Hormuz largely closed, Saudi output cut. Feeding inflation. Cleveland Fed warns CPI could hit 3.5%.” },
{ t: “WEAK $”, c: “#00cc66”, s: “DXY at 98.7 — below 100, biggest weekly drop since Jan. Relief for EM assets and commodities.” },
{ t: “LOW FEAR”, c: “#00cc66”, s: “VIX at 19 during an active war — markets pricing ceasefire as likely to hold. Unusual divergence from geopolitical reality.” },
{ t: “FED FROZEN”, c: “#d4a017”, s: “Rate at 3.625%, on hold. Fed trapped between oil-driven inflation and slowing growth. Next move unclear — cut or hike both possible.” },
{ t: “CRYPTO FLUSH”, c: “#d4a017”, s: “Stablecoins at $317B ATH but BTC down 22% from peak. Liquidity is there but risk appetite isn’t. Money sitting in stables, not deploying.” },
];

function MiniChart({ data, color, height }) {
if (!data || data.length < 2) return null;
var max = Math.max.apply(null, data);
var min = Math.min.apply(null, data);
var range = max - min || 1;
var h = height || 32;
var w = 100;
var points = data.map(function(v, i) {
var x = (i / (data.length - 1)) * w;
var y = h - ((v - min) / range) * (h - 4) - 2;
return x + “,” + y;
}).join(” “);

return (
<svg viewBox={“0 0 “ + w + “ “ + h} style={{ width: “100%”, height: h }} preserveAspectRatio=“none”>
<polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
<circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2} r=“2.5” fill={color} />
</svg>
);
}

export default function App() {
var [expanded, setExpanded] = useState(null);

var cats = {};
METRICS.forEach(function(m) { if (!cats[m.cat]) cats[m.cat] = []; cats[m.cat].push(m); });

function fmtVal(m) {
var v = m.value;
if (m.unit === “$”) return “$” + v.toLocaleString();
if (m.unit === “$/oz” || m.unit === “$/bbl”) return “$” + v.toLocaleString();
if (m.unit === “$T”) return “$” + v + “T”;
if (m.unit === “$B”) return “$” + v + “B”;
if (m.unit === “%”) return v + “%”;
if (v >= 1000) return v.toLocaleString();
return v.toString();
}

function getColor(m) {
if (m.id === “vix”) return m.value > 30 ? “#ff4040” : m.value > 22 ? “#d4a017” : “#00cc66”;
if (m.id === “oil”) return m.value > 100 ? “#ff4040” : m.value > 85 ? “#d4a017” : “#00cc66”;
if (m.id === “yield10”) return m.value > 5 ? “#ff4040” : m.value > 4 ? “#d4a017” : “#8a9a8a”;
if (m.id === “dxy”) return m.value > 105 ? “#d4a017” : “#8a9a8a”;
if (m.id === “gold”) return “#d4a017”;
return “#00cc66”;
}

function barPct(m) {
return Math.max(2, Math.min(98, ((m.value - m.low) / (m.high - m.low)) * 100));
}

return (
<div style={{ minHeight: “100vh”, background: “#060806”, color: “#c0ccc0” }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Outfit:wght@300;500;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}body{background:#060806} .cd{background:#0c100c;border:1px solid #1a221a;border-radius:8px;margin-bottom:8px} .mr{padding:10px 12px;cursor:pointer;transition:background .12s;border-bottom:1px solid #141c14} .mr:last-child{border-bottom:none}.mr:hover{background:#101810}`}</style>

```
  <div style={{ maxWidth: 800, margin: "0 auto", padding: "14px 12px 40px" }}>

    {/* Header */}
    <div style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #1a221a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00cc66" }} />
        <h1 style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#e0ece0" }}>Liquidity Flow Tracker</h1>
      </div>
      <p style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "#4a5a4a" }}>
        Snapshot: {SNAPSHOT.date} · Sources: {SNAPSHOT.sources}
      </p>
    </div>

    {/* Signals */}
    <div className="cd" style={{ padding: 12, borderLeft: "3px solid #00cc66" }}>
      <div style={{ fontFamily: "IBM Plex Mono", fontSize: 9, color: "#4a5a4a", letterSpacing: ".12em", marginBottom: 8, textTransform: "uppercase" }}>
        What The Data Says (observations, not predictions)
      </div>
      {SIGNALS.map(function(s, i) {
        return (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
            <span style={{
              fontFamily: "IBM Plex Mono", fontSize: 8, fontWeight: 700, padding: "2px 5px",
              borderRadius: 3, background: s.c + "18", color: s.c, whiteSpace: "nowrap", marginTop: 1,
            }}>{s.t}</span>
            <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#a0b0a0", lineHeight: 1.5 }}>{s.s}</span>
          </div>
        );
      })}
    </div>

    {/* Metrics by Category */}
    {Object.entries(cats).map(function(entry) {
      var cat = entry[0];
      var metrics = entry[1];
      return (
        <div key={cat} className="cd">
          <div style={{ padding: "7px 12px", borderBottom: "1px solid #141c14" }}>
            <span style={{ fontFamily: "Outfit", fontSize: 12, fontWeight: 600, color: "#c0d0c0" }}>{metrics[0].icon} {cat}</span>
          </div>
          {metrics.map(function(m) {
            var isOpen = expanded === m.id;
            var color = getColor(m);
            return (
              <div key={m.id}>
                <div className="mr" onClick={function() { setExpanded(isOpen ? null : m.id); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#a0b0a0" }}>{m.label}</span>
                    <span style={{ fontFamily: "IBM Plex Mono", fontSize: 16, fontWeight: 700, color: color }}>{fmtVal(m)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 4, background: "#080c08", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: barPct(m) + "%", background: color, opacity: .5, transition: "width .6s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                        <span style={{ fontFamily: "IBM Plex Mono", fontSize: 7, color: "#2a3a2a" }}>{m.low}</span>
                        <span style={{ fontFamily: "IBM Plex Mono", fontSize: 7, color: "#2a3a2a" }}>{m.high}</span>
                      </div>
                    </div>
                    {m.hist && (
                      <div style={{ width: 80, flexShrink: 0 }}>
                        <MiniChart data={m.hist} color={color} height={24} />
                      </div>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "8px 12px 12px", background: "#0a0e0a", borderTop: "1px solid #141c14" }}>
                    <p style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#8a9a8a", lineHeight: 1.6, marginBottom: 8 }}>{m.desc}</p>
                    <div style={{ fontFamily: "IBM Plex Mono", fontSize: 9, color: "#3a4a3a" }}>Source: {m.src}</div>
                    {m.hist && m.histLabels && (
                      <div style={{ marginTop: 8 }}>
                        <MiniChart data={m.hist} color={color} height={40} />
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          {m.histLabels.map(function(l, i) {
                            return <span key={i} style={{ fontFamily: "IBM Plex Mono", fontSize: 7, color: i === m.histLabels.length - 1 ? color : "#3a4a3a" }}>{l}</span>;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    })}

    {/* Big Picture */}
    <div className="cd" style={{ padding: 12, borderLeft: "3px solid #d4a017" }}>
      <div style={{ fontFamily: "IBM Plex Mono", fontSize: 9, color: "#4a5a4a", letterSpacing: ".12em", marginBottom: 8, textTransform: "uppercase" }}>
        The Big Picture — Where Money Is Right Now
      </div>
      <div style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "#8a9a8a", lineHeight: 1.7 }}>
        <strong style={{ color: "#d4a017" }}>$7.86T parked in money markets</strong> — the single largest number on this dashboard. Almost 8 trillion dollars earning risk-free yield, waiting. That's more than the entire crypto market cap, gold ETF holdings, and treasury ETF holdings combined.
        <br /><br />
        <strong style={{ color: "#d4a017" }}>Gold near ATH, oil at $97, VIX at 19.</strong> This combination is unusual. Gold says fear. Oil says supply crisis. VIX says calm. The market is simultaneously hedging for catastrophe (gold) and pricing in resolution (VIX). Someone's wrong.
        <br /><br />
        <strong style={{ color: "#d4a017" }}>Stablecoins at $317B, BTC at $73k.</strong> Crypto liquidity is at all-time highs but not flowing into risk. Money is IN the crypto ecosystem but sitting in dollar-pegged assets, not deploying into volatile tokens. That's a loaded spring — it just needs a catalyst.
      </div>
    </div>

    {/* Disclaimer */}
    <div className="cd" style={{ padding: 10 }}>
      <p style={{ fontFamily: "IBM Plex Mono", fontSize: 9, color: "#3a4a3a", lineHeight: 1.5 }}>
        Static snapshot as of {SNAPSHOT.date}. Data has 1-7 day lag depending on source. Sparklines show annual history. This shows where money IS, not where it's going. Not financial advice. Ask Claude to rebuild this with fresh data anytime.
      </p>
    </div>
  </div>
</div>
```

);
}