# Liquidity Flow Tracker

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build
- `npm run seed` — Manually trigger data fetch (runs /api/fetch-data via Node)

## Architecture
- Next.js 14 App Router + TypeScript
- SQLite via better-sqlite3 for data storage
- Data fetched from FRED, Yahoo Finance, CoinGecko, DeFiLlama APIs
- Cron job hits /api/fetch-data once daily at midnight UTC

## Key Decisions
- SQLite over Postgres: simpler, no external DB needed, good enough for time-series snapshots
- Server-side fetching only: avoids CORS issues that killed the client-side approach
- Static signals: observations generated from threshold logic, NOT predictions
- Terminal aesthetic: dark green on black, IBM Plex Mono, Bloomberg-inspired

## Data Sources
- FRED (free key required): Fed balance sheet (WALCL), fed funds rate (FEDFUNDS), 10Y yield (DGS10), overnight RRP (RRPONTSYD), money market funds (MMMFFAQ027S)
- CoinGecko (no key): BTC price
- DeFiLlama (no key, primary): Total stablecoin market cap
- Yahoo Finance (no key): S&P 500 (^GSPC), VIX (^VIX), DXY (DX-Y.NYB), Gold (GC=F), Brent Crude (BZ=F)

## Conventions
- All money values stored in their natural unit (trillions for Fed BS/MMF, billions for RRP/stablecoins, raw for prices)
- WALCL from FRED comes in millions — divided by 1e6 to get trillions before storing
- MMMFFAQ027S from FRED comes in billions — divided by 1000 to get trillions before storing
- Timestamps in ISO 8601 UTC
- Never predict. Only observe current state.

## File Structure
```
app/
  page.tsx              — Dashboard (server component, fetches /api/data)
  layout.tsx            — Root layout
  api/
    fetch-data/route.ts — Cron endpoint to fetch all data + insert to DB
    data/route.ts       — Returns latest + 52pt history for all metrics
  globals.css
lib/
  config.ts             — METRIC_CONFIG, category ordering
  db.ts                 — SQLite connection + queries
  signals.ts            — Signal generation from thresholds
  fetchers/
    fred.ts             — FRED API (WALCL, FEDFUNDS, DGS10, RRPONTSYD, MMMFFAQ027S)
    yahoo.ts            — Yahoo Finance (^GSPC, ^VIX, DX-Y.NYB, GC=F, BZ=F)
    coingecko.ts        — CoinGecko + DeFiLlama (BTC price, stablecoin market cap)
components/
  MetricCard.tsx        — Metric card with sparkline, range bar, expandable detail
  Sparkline.tsx         — SVG sparkline with area fill
  RangeBar.tsx          — Min-max range indicator
  SignalsPanel.tsx      — Auto-generated signal observations
data/
  liquidity.db          — SQLite database (gitignored)
  big-picture.md        — Manual macro analysis (edit this)
```

## Adding New Metrics
1. Add to `MetricId` type in `lib/config.ts`
2. Add `METRIC_CONFIG` entry
3. Add fetcher call in `app/api/fetch-data/route.ts`
4. Add signal logic in `lib/signals.ts` if needed

## Deployment (Vercel)
- Set `FRED_API_KEY` env var
- SQLite uses `/tmp/liquidity.db` in production (ephemeral — data resets on cold starts)
- For persistence on Vercel: migrate to Turso (SQLite edge) or Vercel Postgres
- Cron configured in `vercel.json` — fires daily at midnight UTC (free plan limit)
