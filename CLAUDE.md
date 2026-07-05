# Crypto Sell Tracker

Track a crypto purchase and sell it off in N batches (default 6), watching cash, remaining crypto, and P/L along the way. No loans, no interest — just buy price vs sell price.

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build

## Architecture
- Next.js App Router + TypeScript + Tailwind
- Postgres via `pg` (DATABASE_URL env var); tables auto-created on first query
- Multi-asset live prices (XRP/BTC/ETH/SOL/BNB/ADA/DOGE) from CoinGecko with Binance+FX fallback (`lib/coingecko.ts`), polled every 2s client-side via `/api/price?asset=`
- Optional shared-password auth: set `APP_PASSWORD` to protect all pages/APIs (`proxy.ts` + `/login`); disabled when unset
- Optional `COINGECKO_API_KEY` for higher rate limits
- UI in Indonesian, CoinMarketCap-inspired dark theme (`cmc-*` Tailwind tokens)

## Data Model
- `positions` — one crypto purchase: asset symbol, qty bought (`xrp_qty` — legacy column name, holds any asset), buy price (IDR), planned number of sell batches (`total_batches`, default 6), buy date, notes
- `sales` — one row per executed sell batch: batch number (unique per position), sale date, sell price, qty sold, notes
- `batch_targets` — optional per-batch sell target price (unique per position+batch); UI shows "tercapai" when live price ≥ target

## Core Math (`lib/calc.ts`)
- Cash = Σ qty_sold × sell_price (accumulates with each batch)
- Remaining crypto = qty_bought − Σ qty_sold (reduced by each sell)
- Realized P/L = Σ qty_sold × (sell_price − buy_price)
- Unrealized P/L = remaining qty × (live price − buy_price)
- Total portfolio = cash + remaining qty × live price
- Break-even price for remaining coins = (purchase cost − cash) / remaining qty; null once cash covers the modal
- Suggested batch qty = remaining qty / batches left (even split)

## File Structure
```
proxy.ts                          — Shared-password auth (APP_PASSWORD); skips /login
app/
  page.tsx                        — Dashboard: position cards, aggregate totals, export links, logout
  login/page.tsx                  — Password form (when APP_PASSWORD set)
  positions/new/page.tsx          — Create position (asset, qty, buy price, N batches)
  positions/[id]/page.tsx         — Detail: live status, progress, price history, chart, batch table, danger zone
  positions/[id]/edit/page.tsx    — Edit position (validates against already-sold batches)
  positions/[id]/sell/page.tsx    — Record/edit a sell batch (prefills even-split qty or existing sale)
  api/
    positions/route.ts            — GET list / POST create
    positions/[id]/route.ts       — GET / PATCH (whitelisted fields) / DELETE
    positions/[id]/sales/route.ts — GET / POST (upsert by batch, validates qty ≤ remaining) / DELETE
    positions/[id]/targets/route.ts — GET / POST (upsert by batch) / DELETE
    price/route.ts                — Live price, ?asset= param (1.5s server cache)
    xrp-price/route.ts            — Back-compat alias for /api/price?asset=XRP
    price-history/route.ts        — CoinGecko market_chart, ?asset=&days=7|30|90 (5min cache)
    export/route.ts               — JSON backup; ?format=csv for sales ledger
    login/route.ts, logout/route.ts — Auth cookie set/clear
lib/
  db.ts          — pg pool, schema init, Position/Sale/BatchTarget CRUD, export queries
  calc.ts        — buildBatches, buildSummary, valueAtPrice (pure functions)
  coingecko.ts   — SUPPORTED_ASSETS, price + history fetch with fallback
  price-cache.ts — short-TTL server-side price cache
  fmt.ts         — idr/qty/pct/date/pnlColor formatters (qty takes asset symbol)
components/
  PositionCard.tsx      — Dashboard card
  LiveStatus.tsx        — Polls price every 2s; total value, cash, crypto, P/L
  BatchTable.tsx        — Batch history: inline target editing, edit/delete sold batches, notes
  PositionChart.tsx     — Cash vs crypto vs total per batch (recharts)
  PriceHistoryChart.tsx — Market price vs buy/break-even lines, 7/30/90d (recharts)
  DeletePositionButton.tsx — Two-step confirm delete
  LogoutButton.tsx      — Clears auth cookie
```

## Conventions
- All money in IDR, stored as NUMERIC, formatted with `idr()` (compact: `jt`/`M`)
- Sales upsert on (position_id, batch_number) — re-submitting a batch edits it
- API rejects selling more than remaining qty (excluding the batch being edited)
- PATCH /api/positions/[id] whitelists columns (updatePosition interpolates keys into SQL) and rejects total_batches/qty below what's already sold
- Timestamps/dates ISO 8601
