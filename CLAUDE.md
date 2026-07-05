# Crypto Sell Tracker

Track an XRP purchase and sell it off in N batches (default 6), watching cash, remaining crypto, and P/L along the way. No loans, no interest — just buy price vs sell price.

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build

## Architecture
- Next.js App Router + TypeScript + Tailwind
- Postgres via `pg` (DATABASE_URL env var); tables auto-created on first query
- Live XRP price from CoinGecko with Binance+FX fallback (`lib/coingecko.ts`), polled every 2s client-side via `/api/xrp-price`
- UI in Indonesian, CoinMarketCap-inspired dark theme (`cmc-*` Tailwind tokens)

## Data Model
- `positions` — one crypto purchase: qty bought, buy price (IDR), planned number of sell batches (`total_batches`, default 6), buy date
- `sales` — one row per executed sell batch: batch number (unique per position), sale date, sell price, qty sold

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
app/
  page.tsx                        — Dashboard: position cards + aggregate totals
  positions/new/page.tsx          — Create position (qty, buy price, N batches)
  positions/[id]/page.tsx         — Detail: live status, progress, chart, batch table
  positions/[id]/sell/page.tsx    — Record a sell batch (prefills even-split qty)
  api/
    positions/route.ts            — GET list / POST create
    positions/[id]/route.ts       — GET / PATCH / DELETE
    positions/[id]/sales/route.ts — GET / POST (upsert by batch, validates qty ≤ remaining) / DELETE
    xrp-price/route.ts            — Live XRP/IDR price
lib/
  db.ts        — pg pool, schema init, Position/Sale CRUD
  calc.ts      — buildBatches, buildSummary, valueAtPrice (pure functions)
  coingecko.ts — price fetch with fallback
  fmt.ts       — idr/xrp/pct/date/pnlColor formatters
components/
  PositionCard.tsx  — Dashboard card
  LiveStatus.tsx    — Polls price every 2s; total value, cash, crypto, P/L
  BatchTable.tsx    — Batch-by-batch sell history with running remainder
  PositionChart.tsx — Cash vs crypto vs total per batch (recharts)
```

## Conventions
- All money in IDR, stored as NUMERIC, formatted with `idr()` (compact: `jt`/`M`)
- Sales upsert on (position_id, batch_number) — re-submitting a batch edits it
- API rejects selling more than remaining qty (excluding the batch being edited)
- Timestamps/dates ISO 8601
