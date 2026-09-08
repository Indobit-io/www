# Whale Flow

Track the 500 largest on-chain movers, see which tokens they are moving, and
test whether that flow has any statistical relationship to price.

The app reads live data. It ships no dataset and simulates nothing — without
`DATABASE_URL` and `ETHERSCAN_API_KEY` every page renders setup instructions
instead of numbers.

## Commands
- `npm run dev` — dev server on port 3000
- `npm run build` — production build
- `npm run typecheck` — tsc, no emit
- `npm test` — pure unit tests for the statistics (offline)
- `DATABASE_URL=… npm run test:db` — end-to-end pipeline tests against real Postgres
- `DATABASE_URL=… node scripts/seed-demo.mjs` — synthetic data for UI work
  (sets a `demo_data` flag that banners every page; `--clear` removes it)

## Architecture
- Next.js App Router + TypeScript + Tailwind, CoinMarketCap-style dark theme (`cmc-*` tokens)
- Postgres via `pg`; schema created on first query (`lib/db.ts`)
- On-chain reads via Etherscan V2 — one endpoint, one key, `chainid` switches chain
- Token universe and price history from CoinGecko; **no contract address is
  hardcoded anywhere**, they are resolved from CoinGecko's platform map and
  decimals are read on-chain via `decimals()`
- Shared-password auth (`APP_PASSWORD`) via `proxy.ts`; `/api/cron/*` is exempt
  and enforces `CRON_SECRET` instead, because Vercel's scheduler cannot log in

## The pipeline
Four idempotent jobs, each on its own cron and each runnable by hand from
`/status`:

| Job | Endpoint | Does |
|---|---|---|
| `universe` | `/api/cron/universe` | CoinGecko market-cap ranking → tokens + contracts + decimals |
| `prices` | `/api/cron/prices` | Hourly price history for tracked tokens |
| `flow` | `/api/cron/flow` | Walk ERC-20 Transfer logs from each token's block cursor |
| `whales` | `/api/cron/whales` | Recompute the top-N registry from stored flow |

Order matters — the universe defines what to price, prices are needed to value
transfers, and the registry is built from those transfers. `/api/cron/all` runs
all four in sequence.

`vercel.json` ships a single daily `/api/cron/all` because Vercel's Hobby plan
rejects any cron more frequent than daily. That keeps the deploy green but
starves the ingester — see the deploying section in `README.md` for the real
schedule and the external-scheduler alternative.

## Data model
- `tokens` — symbol, CoinGecko id, chain + contract + decimals, market rank,
  `tracked` flag, and `last_block` (the ingest cursor)
- `whales` — one row per address, with volume/inflow/outflow/counterparty counts
  over the trailing window, a `rank`, an `in_top` flag, an inferred `kind`, and
  an optional manual `label`. Rows are never deleted, only demoted.
- `transfers` — one row per large Transfer, unique on `(chain_id, tx_hash, log_index)`
- `price_points` — hourly USD price per token
- `ingest_runs` — per-run log with timing, detail JSON, and errors
- `app_meta` — key/value; currently just the demo-data flag

## How a whale is defined
There is no curated address list. Every cycle, `rebuildWhales` ranks addresses
by USD moved over the trailing window and takes the top `WHALE_COUNT`.
Membership is earned from behaviour and lost the same way. Token contracts, the
zero address and the burn address are excluded.

`kind` is inferred, never verified:
- `hub` — very high transfer count across very many counterparties (exchange hot
  wallets, bridges, routers)
- `contract` / `wallet` — from `eth_getCode`, filled in a bounded slice per run
- `unknown` — not yet checked

## The correlation (`lib/stats.ts`, `lib/analysis.ts`)
Netflow per token per hour is whale inflow minus outflow, so a transfer between
two tracked whales nets to zero. Returns are hourly log returns. The two are
correlated at every lag from −6h to +6h.

Four deliberate choices keep the number honest:
1. **Spearman alongside Pearson.** Flow is violently heavy-tailed; one $400M
   transfer can carry a Pearson coefficient on its own. Divergence between the
   two raises a warning on the page.
2. **Bonferroni.** Scanning 13 lags is 13 hypothesis tests, so significance uses
   `0.05 / lags`, not a bare `p < 0.05`.
3. **Lag sign is reported, not hidden.** A negative best lag means price moved
   first and whales followed — reactive flow with no predictive value. It gets
   its own verdict.
4. **Sample size is surfaced.** `activeBuckets` counts hours that actually had
   flow. Under 30 the verdict is forced to `insufficient-data`.

`npm test` verifies all of this, including that a planted lead is recovered at
the right lag and that unrelated series do **not** clear the threshold.

## File structure
```
proxy.ts                          — shared-password auth
app/
  page.tsx                        — movers: tokens ranked by whale activity vs their own baseline
  whales/page.tsx                 — the 500, filterable by kind, searchable
  whales/[address]/page.tsx       — per-whale token breakdown + transfers + label editor
  tokens/[symbol]/page.tsx        — correlation report: verdict, lag scan, scatter, caveats
  flow/page.tsx                   — live tail of large transfers
  status/page.tsx                 — pipeline state, manual job triggers, known limits
  login/page.tsx
  api/
    cron/[job]/route.ts           — universe | prices | flow | whales | all
    movers, whales, whales/[address], tokens, correlation, transfers, status
lib/
  chains.ts       — chain registry + explorer URLs
  etherscan.ts    — V2 client, serialized queue, retry on transient failures
  erc20.ts        — Transfer log decoding, decimals(), unit scaling via BigInt
  coingecko.ts    — markets, platform map, market_chart
  db.ts           — pool, schema, all queries
  ingest.ts       — the four jobs
  stats.ts        — pearson, spearman, Student-t p-value, lag scan, hit rate (pure)
  analysis.ts     — movers scoring + correlation report assembly
  fmt.ts          — usd/price/qty/pct/coef/addr/ago formatters
components/       — Nav, Stat, Empty, SetupNotice, DemoBanner, LabelEditor,
                    JobRunner, TransferFeed, LagChart, FlowPriceChart, FlowReturnScatter
tests/            — stats.test.ts (offline), pipeline.test.ts (needs Postgres)
scripts/          — seed-demo.mjs
```

## Conventions
- All money in USD, stored as `NUMERIC`. `usd()` for aggregates (compact,
  `K`/`M`/`B`), `price()` for asset prices (precise).
- Addresses and tx hashes are stored lowercase.
- Netflow sign: **positive = whales received**.
- Timestamps ISO 8601, everything in UTC.
- Transfers upsert on `(chain_id, tx_hash, log_index)`, so re-walking a block
  range is always safe.

## Limits worth remembering
- `eth_getLogs` has no value filter, so every Transfer in a block range is
  fetched and then discarded below `MIN_TRANSFER_USD`. On a token like USDT that
  burns the call budget fast — hence the bounded block span, the per-run budget,
  and least-recently-ingested rotation across tokens.
- Coverage has holes by design. Each cycle advances a token's cursor by at most
  `MAX_BLOCK_SPAN` blocks; if the ingester falls behind the chain it stays
  behind until it catches up.
- Transfers are valued at the hourly price, not the exact block.
- Whale identity is inferred, never verified.
