export interface KbEntry {
  slug: string;
  term: string;
  shortDef: string;
  body: string; // plain text paragraphs separated by \n\n
  relatedSignalTags: string[]; // matches Signal.tag values
  relatedSlugs?: string[];
  category: "indicator" | "policy" | "concept" | "signal";
}

export const KB: KbEntry[] = [
  // ── INDICATORS ────────────────────────────────────────────────────
  {
    slug: "vix",
    term: "VIX — Volatility Index",
    shortDef: "The market's forward-looking fear gauge.",
    category: "indicator",
    relatedSignalTags: ["PANIC", "STRESS", "COMPLACENCY", "CALM"],
    relatedSlugs: ["sp500", "risk-on-off"],
    body: `The VIX (CBOE Volatility Index) measures the market's expectation of 30-day volatility in the S&P 500, derived from options prices. It is often called the "fear gauge" because it spikes during periods of market stress.\n\nReadings below 15 signal calm, complacent markets with high risk appetite. The 15–20 range is neutral. Above 20 indicates rising concern; above 30 signals genuine fear and often precedes or accompanies market drawdowns. Readings above 50 have historically marked capitulation events (2008 financial crisis, March 2020 COVID crash).\n\nThe VIX is mean-reverting — extreme readings in either direction tend to normalize. A very low VIX can itself be a contrarian warning, as complacency tends to precede sharp volatility spikes.`,
  },
  {
    slug: "dxy",
    term: "DXY — US Dollar Index",
    shortDef: "The dollar's value against a basket of six major currencies.",
    category: "indicator",
    relatedSignalTags: ["WEAK $", "STRONG $"],
    relatedSlugs: ["gold", "oil", "em-pressure"],
    body: `The DXY measures the US dollar against a trade-weighted basket of six currencies: Euro (57.6%), Japanese Yen (13.6%), British Pound (11.9%), Canadian Dollar (9.1%), Swedish Krona (4.2%), and Swiss Franc (3.6%).\n\nA strong dollar (DXY > 100–105) tightens global financial conditions. Because most commodities are priced in dollars, a rising DXY suppresses commodity prices and squeezes emerging market economies that hold dollar-denominated debt. It also reduces earnings of US multinationals when repatriated.\n\nA weak dollar (DXY < 95) is generally a tailwind for risk assets, commodities, gold, and emerging markets. The Fed's rate decisions are the primary driver — higher US rates attract capital to dollar assets, pushing DXY up.`,
  },
  {
    slug: "yield-10y",
    term: "10-Year Treasury Yield",
    shortDef: "The benchmark borrowing rate for the US economy.",
    category: "indicator",
    relatedSignalTags: ["TIGHT", "EASING"],
    relatedSlugs: ["fed-rate", "fed-bs", "risk-on-off"],
    body: `The 10-year US Treasury yield is the most watched interest rate in the world. It sets the baseline for mortgage rates, corporate bond rates, and discount rates used to value every asset class.\n\nWhen yields rise, the present value of future cash flows falls — this puts downward pressure on equities (especially growth stocks), real estate, and bonds. Yields rising above 4.5% have historically coincided with tightening financial conditions.\n\nYields fall when investors expect slower growth, lower inflation, or rate cuts from the Fed. Falling yields are generally supportive of risk assets. The spread between 2-year and 10-year yields (the yield curve) is watched as a recession indicator — an inverted curve (2yr > 10yr) has preceded every US recession since the 1970s.`,
  },
  {
    slug: "fed-rate",
    term: "Federal Funds Rate",
    shortDef: "The interest rate banks charge each other for overnight lending.",
    category: "policy",
    relatedSignalTags: ["RESTRICTIVE", "ACCOMMODATIVE"],
    relatedSlugs: ["fed-bs", "rrp", "yield-10y"],
    body: `The federal funds rate is the FOMC's primary monetary policy tool. It sets the overnight lending rate between depository institutions, which ripples through to all other borrowing costs in the economy.\n\nRates at or near zero (0–1%) represent highly accommodative policy, designed to stimulate borrowing and investment. Rates above 5% are considered restrictive — borrowing costs rise, credit tightens, and business investment slows. The Fed historically raises rates to fight inflation and cuts them to fight recession.\n\nThe "real" fed funds rate (nominal rate minus inflation) is often more meaningful than the headline number. A 5% rate with 6% inflation is still negative in real terms — actually accommodative despite the high nominal level.`,
  },
  {
    slug: "fed-bs",
    term: "Fed Balance Sheet",
    shortDef: "Total assets held by the Federal Reserve — the size of money creation.",
    category: "policy",
    relatedSignalTags: ["QE LEGACY", "QT PROGRESS"],
    relatedSlugs: ["fed-rate", "rrp", "mmf"],
    body: `The Federal Reserve's balance sheet represents the total value of assets it holds, primarily US Treasuries and mortgage-backed securities. When the Fed buys assets (Quantitative Easing / QE), it injects reserves into the banking system and expands the money supply. When it sells or lets bonds mature without reinvestment (Quantitative Tightening / QT), it drains reserves.\n\nThe balance sheet grew from under $1T before the 2008 crisis to nearly $9T at its peak in 2022. QT since then has reduced it, but it remains historically large. A large balance sheet means abundant liquidity in the financial system — more dollars chasing assets tends to support asset prices.\n\nWatching the pace of QT is important: too-fast balance sheet reduction can tighten financial conditions abruptly and stress bank reserves, as seen during the 2019 repo crisis.`,
  },
  {
    slug: "rrp",
    term: "Overnight Reverse Repo (ON RRP)",
    shortDef: "Cash parked at the Fed overnight — a measure of excess liquidity.",
    category: "policy",
    relatedSignalTags: ["RRP DRAINED"],
    relatedSlugs: ["fed-bs", "mmf"],
    body: `The Fed's Overnight Reverse Repo (ON RRP) facility allows money market funds, banks, and other eligible counterparties to lend cash to the Fed overnight in exchange for Treasury securities. The balance reflects excess liquidity in the financial system — cash that has nowhere better to go.\n\nThe RRP balance surged to over $2.5 trillion in 2022–2023 as QE had flooded the system with cash while short-term Treasury supply was limited. As the Treasury issued more bills and QT continued, money flowed out of the RRP into higher-yielding Treasuries.\n\nWhen the RRP balance approaches zero, the excess liquidity buffer is exhausted. Future QT will start draining actual bank reserves rather than the RRP facility. This is when tightening begins to have real bite — historically associated with rising stress in short-term funding markets.`,
  },
  {
    slug: "mmf",
    term: "Money Market Funds (MMF)",
    shortDef: "Record cash on the sidelines — dry powder waiting to deploy.",
    category: "indicator",
    relatedSignalTags: ["DRY POWDER"],
    relatedSlugs: ["rrp", "fed-rate", "sp500"],
    body: `Money market funds hold short-duration, high-quality instruments (T-bills, commercial paper, repos). They are used by institutions and individuals as a cash equivalent — safe, liquid, and currently yielding more than savings accounts due to elevated rates.\n\nTotal MMF assets above $6 trillion represent a record stockpile of cash sitting on the sidelines. When rates eventually fall, the relative attractiveness of MMFs diminishes and some of this capital historically rotates into equities, bonds, and other risk assets — potentially fueling rallies.\n\nHowever, the relationship is not mechanical. MMFs can rise during risk-off periods (capital fleeing to safety) and can stay elevated for extended periods. The key question is whether the rotation happens gradually or suddenly.`,
  },
  {
    slug: "sp500",
    term: "S&P 500",
    shortDef: "The benchmark US equity index tracking 500 large-cap companies.",
    category: "indicator",
    relatedSignalTags: [],
    relatedSlugs: ["vix", "risk-on-off"],
    body: `The S&P 500 is the most widely followed equity benchmark, representing approximately 80% of US market capitalization. It is market-cap weighted, meaning the largest companies (Apple, Microsoft, Nvidia, etc.) have the most influence on the index's performance.\n\nIn the context of liquidity tracking, the S&P 500 serves as a risk appetite barometer. Strong performance alongside low VIX signals confident, risk-on markets. Divergences — rising VIX with flat or falling S&P — can signal distribution or stress building beneath the surface.\n\nThe index is sensitive to changes in the 10-year yield (higher rates discount future earnings more heavily), Fed policy, dollar strength, and global liquidity conditions.`,
  },
  {
    slug: "gold",
    term: "Gold",
    shortDef: "The oldest safe haven — tracks fear, dollar weakness, and inflation.",
    category: "indicator",
    relatedSignalTags: ["HAVEN BID", "GOLD ELEVATED"],
    relatedSlugs: ["dxy", "yield-10y", "risk-on-off"],
    body: `Gold has no yield and no earnings, yet it has stored value for thousands of years. In modern markets it functions as a hedge against three things: inflation, dollar debasement, and geopolitical/systemic risk.\n\nGold is priced in dollars, so a weaker DXY mechanically lifts its price. But gold can also rise alongside a strong dollar during risk-off events, as investors seek safety simultaneously with dollar assets. Central bank gold buying — particularly from emerging market central banks diversifying away from dollars — has been a powerful structural driver since 2022.\n\nReal yields (10-year Treasury yield minus inflation) are historically the strongest predictor of gold prices: when real yields fall or go negative, the opportunity cost of holding gold disappears and prices rise.`,
  },
  {
    slug: "oil",
    term: "Brent Crude Oil",
    shortDef: "The global oil benchmark — key driver of inflation and growth.",
    category: "indicator",
    relatedSignalTags: ["OIL SHOCK", "OIL SOFT"],
    relatedSlugs: ["dxy", "fed-rate"],
    body: `Brent Crude is the international benchmark for oil pricing, reflecting North Sea production and used to price two-thirds of global oil supplies. Oil is both an economic input (energy costs affect virtually all production) and a financial asset traded on commodity markets.\n\nHigh oil prices (above $90/bbl) are inflationary — they raise costs for transportation, manufacturing, and consumers. This can force central banks to keep rates higher for longer, even when other parts of the economy are slowing.\n\nLow oil prices are disinflationary and act as a consumer stimulus (lower gasoline and energy costs). However, very low prices can signal weak global demand, which is itself a negative economic signal. OPEC+ production decisions, geopolitical events, and US shale output are the primary supply-side drivers.`,
  },
  {
    slug: "btc",
    term: "Bitcoin",
    shortDef: "The crypto risk appetite proxy — highly sensitive to liquidity.",
    category: "indicator",
    relatedSignalTags: [],
    relatedSlugs: ["stablecoins", "risk-on-off"],
    body: `Bitcoin functions as a high-beta liquidity barometer in modern macro markets. Its price is highly correlated with global liquidity conditions — expanding money supply and risk appetite tend to drive BTC higher; tightening conditions and risk-off environments drive it lower.\n\nBeyond speculation, Bitcoin is increasingly held as a macro hedge (digital gold narrative) and as a store of value outside the traditional financial system. Institutional adoption via ETFs has increased its correlation with risk assets.\n\nFor liquidity tracking purposes, Bitcoin's price trend alongside stablecoin supply growth provides a composite view of capital flowing into and out of the crypto ecosystem.`,
  },
  {
    slug: "stablecoins",
    term: "Stablecoin Supply",
    shortDef: "Dollar-pegged crypto tokens — fuel for the crypto economy.",
    category: "indicator",
    relatedSignalTags: ["CRYPTO LIQ"],
    relatedSlugs: ["btc"],
    body: `Stablecoins (USDT, USDC, DAI, etc.) are dollar-pegged tokens on public blockchains. Their total supply represents the pool of capital available for deployment within the crypto ecosystem — essentially the "cash" sitting in crypto markets.\n\nExpanding stablecoin supply indicates new capital entering the crypto economy, as investors must buy stablecoins to trade on crypto exchanges. Contracting supply signals capital withdrawing or being burned/redeemed.\n\nA large and growing stablecoin supply alongside rising Bitcoin prices is a classic bull market setup. Stablecoin supply growing while BTC is flat can signal accumulation ahead of a move. The relationship between stablecoin supply and total crypto market cap is watched as a liquidity ratio.`,
  },
  // ── CONCEPTS ─────────────────────────────────────────────────────
  {
    slug: "qe-qt",
    term: "QE & QT — Quantitative Easing and Tightening",
    shortDef: "The Fed's on/off switch for printing and removing money.",
    category: "concept",
    relatedSignalTags: ["QE LEGACY", "QT PROGRESS"],
    relatedSlugs: ["fed-bs", "rrp"],
    body: `Quantitative Easing (QE) is the process by which a central bank creates new reserves and uses them to purchase assets (typically government bonds and mortgage-backed securities). This expands the money supply, pushes down long-term interest rates, and injects liquidity into financial markets.\n\nQuantitative Tightening (QT) is the reverse: the Fed stops reinvesting maturing bonds (passive QT) or actively sells bonds from its portfolio. This shrinks the money supply and drains reserves from the banking system.\n\nThe effects of QE and QT are not symmetric or immediate. QE works through multiple channels: lower long-term rates, portfolio rebalancing (investors pushed into riskier assets), and signaling. QT's impact depends heavily on whether excess reserves are still abundant or whether banks are starting to feel squeezed.`,
  },
  {
    slug: "risk-on-off",
    term: "Risk-On / Risk-Off",
    shortDef: "The market's mood switch between appetite for risk and flight to safety.",
    category: "concept",
    relatedSignalTags: ["STRESS", "PANIC", "CALM"],
    relatedSlugs: ["vix", "gold", "dxy", "sp500"],
    body: `"Risk-on" describes a market environment where investors are willing to take on more risk in pursuit of returns. Capital flows into equities, high-yield bonds, commodities, emerging markets, and crypto. VIX is low, gold is flat or falling relative to equities, and the dollar may weaken.\n\n"Risk-off" is the opposite: fear dominates, capital flees to safety in US Treasuries, the dollar, gold, and cash. Equities fall, credit spreads widen, VIX spikes, and risky assets sell off across the board.\n\nThese regimes can shift rapidly — a single macro event (surprise CPI print, geopolitical shock, bank failure) can flip the market from risk-on to risk-off in hours. Monitoring the combination of VIX, DXY, gold, and equity performance together gives the clearest picture of the current regime.`,
  },
  {
    slug: "yield-curve",
    term: "Yield Curve",
    shortDef: "The shape of interest rates across maturities — a recession signal.",
    category: "concept",
    relatedSignalTags: ["TIGHT", "EASING"],
    relatedSlugs: ["yield-10y", "fed-rate"],
    body: `The yield curve plots interest rates (yields) across different bond maturities, typically from 3-month T-bills to 30-year Treasuries. Under normal conditions, longer maturities yield more than shorter ones (upward slope) because investors demand compensation for the uncertainty of time.\n\nAn inverted yield curve — where short-term rates exceed long-term rates (e.g., 2-year yield above 10-year yield) — has preceded every US recession since the 1970s, typically by 12–24 months. The inversion reflects market expectations that the Fed will eventually cut rates sharply due to economic weakness.\n\nA "bear steepening" — long-term yields rising faster than short-term — can signal inflation fears or loss of confidence in long-term fiscal sustainability. A "bull steepening" after inversion often occurs as the Fed begins cutting and short-term rates fall, which paradoxically can coincide with the start of recessions.`,
  },
  {
    slug: "liquidity",
    term: "Global Liquidity",
    shortDef: "The total supply of money and credit available in the financial system.",
    category: "concept",
    relatedSignalTags: [],
    relatedSlugs: ["fed-bs", "rrp", "mmf", "stablecoins"],
    body: `Global liquidity refers to the aggregate supply of money, credit, and financial assets that can be easily converted to cash across the world's financial system. It is driven by central bank balance sheets (Fed, ECB, BOJ, PBOC), private sector credit creation, and cross-border capital flows.\n\nWhen global liquidity expands, it acts as a rising tide — asset prices across equities, bonds, real estate, commodities, and crypto tend to rise together. When it contracts, correlations go to 1 in the other direction: everything falls.\n\nThe Fed is the dominant driver of global liquidity because the dollar is the world's reserve currency. Fed tightening drains dollar liquidity globally, tightening conditions even in countries that haven't changed their own rates. This is the "dollar wrecking ball" dynamic that has repeatedly stressed emerging markets during Fed hiking cycles.`,
  },
  {
    slug: "financial-conditions",
    term: "Financial Conditions",
    shortDef: "A composite measure of how easy or tight it is to borrow and invest.",
    category: "concept",
    relatedSignalTags: ["TIGHT", "RESTRICTIVE", "ACCOMMODATIVE"],
    relatedSlugs: ["fed-rate", "yield-10y", "dxy", "sp500"],
    body: `Financial conditions indices (FCIs) aggregate multiple market signals — interest rates, credit spreads, equity valuations, dollar strength, and volatility — into a single measure of how easy or difficult it is to access capital.\n\nTight financial conditions mean: high interest rates, wide credit spreads, elevated volatility, and/or a strong dollar. Loose conditions mean the opposite — cheap credit, narrow spreads, low volatility, and easy access to capital.\n\nA key tension in modern central banking is that financial markets themselves are a transmission mechanism. When the Fed raises rates, equity prices fall and spreads widen — this tightens financial conditions beyond what the policy rate alone implies. Conversely, if markets rally sharply after a rate hike (interpreting it as the peak), financial conditions can actually loosen, partially offsetting the Fed's intended tightening.`,
  },
];

export const KB_MAP = Object.fromEntries(KB.map((e) => [e.slug, e]));

/** All signal tags that have a KB entry, mapped to their slug */
export const SIGNAL_TAG_TO_SLUG: Record<string, string> = {};
for (const entry of KB) {
  for (const tag of entry.relatedSignalTags) {
    SIGNAL_TAG_TO_SLUG[tag] = entry.slug;
  }
}
