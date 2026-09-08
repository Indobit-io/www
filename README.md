# Whale Flow

Track the 500 largest on-chain movers, see which tokens they are moving, and
test whether that flow actually relates to price.

<sub>Three questions, three pages: **what moved** (movers), **who moved it**
(whales), **did it matter** (correlation).</sub>

---

## What it does

**Movers** ranks tokens by how much value the tracked whale set pushed through
them, scored against each token's *own* 30-day baseline — so a normally quiet
token waking up outranks one that is always busy.

**Whales** is the registry itself: 500 addresses, ranked by USD moved, each with
its inflow/outflow split, how many tokens it touches, and how many distinct
counterparties it deals with.

**Correlation** is the part most tools hand-wave. For a given token it buckets
whale netflow and price returns by the hour, correlates them at every lag from
−6h to +6h, and tells you plainly whether anything survives scrutiny.

## What it does *not* do

- It does not ship a dataset. No `DATABASE_URL` and no `ETHERSCAN_API_KEY` means
  every page shows setup instructions instead of numbers.
- It does not tell you a whale is "accumulating" or "distributing". It reports
  netflow. An address moving between its own wallets produces flow with no trade
  behind it, and nothing on-chain distinguishes the two.
- It does not claim causation, and it will not show you a correlation without
  also showing you the sample size, the p-value, the multiple-comparison
  threshold it had to clear, and whether the price actually moved *first*.

## Setup

```bash
cp .env.local.example .env.local   # fill in DATABASE_URL and ETHERSCAN_API_KEY
npm install
npm run dev
```

Then open `/status` and run the four jobs in order: **universe → prices → flow →
whales**. The first `flow` run backfills `BACKFILL_HOURS` (24 by default); after
that each run advances from where the last one stopped.

A correlation needs roughly **48 hours of ingested flow** before it means
anything, and the verdict is pinned to `insufficient-data` until at least 30
hours actually carry whale flow.

### Keys

| Variable | Needed | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Any Postgres. Schema is created on first query. |
| `ETHERSCAN_API_KEY` | yes | Free at [etherscan.io/apis](https://etherscan.io/apis). One key covers every supported chain. |
| `CRON_SECRET` | production | Without it `/api/cron/*` is open to anyone who can reach the deployment. |
| `APP_PASSWORD` | optional | Shared-password gate on everything except `/login` and `/api/cron`. |
| `COINGECKO_API_KEY` | optional | The public tier works but throttles hard. |

Every tuning knob is documented in `.env.local.example`.

### Deploying

`vercel.json` schedules `flow` every 10 minutes, `prices` hourly, `whales` every
6 hours, and `universe` daily. **Vercel's Hobby plan only allows a small number
of cron jobs at daily granularity** — on Hobby, replace the four entries with a
single daily `/api/cron/all`, or run the schedule elsewhere and hit the
endpoints over HTTP with the `CRON_SECRET` bearer token.

## Working on the UI without chain access

```bash
DATABASE_URL=… node scripts/seed-demo.mjs
```

Generates synthetic tokens, whales, transfers and prices — two with a planted
lead-lag relationship, two with none, so the correlation view has something to
both find and correctly reject. It sets a `demo_data` flag that puts a red
banner on every page, because synthetic numbers that look like findings are the
most dangerous thing this repo could produce. `--clear` removes both.

## How the correlation is computed

1. Every Transfer worth `MIN_TRANSFER_USD` or more that touches a tracked whale
   is bucketed into the hour it landed in.
2. Netflow for an hour is whale inflow minus outflow. A transfer between two
   tracked whales nets to zero — nothing left the group.
3. Returns are hourly log returns. Hours where the price feed had a gap are
   forward-filled and carry a zero return; the count is reported on the page.
4. Pearson **and** Spearman are computed at every lag from −6h to +6h. Flow is
   heavy-tailed enough that a single huge transfer can carry a Pearson
   coefficient by itself, so the two are shown side by side and a divergence
   greater than 0.3 raises a warning.
5. Testing 13 lags is 13 hypotheses, so significance uses a Bonferroni-adjusted
   `0.05 / 13 ≈ 0.0038`, not a bare `p < 0.05`.
6. A directional hit rate — how often the sign of flow matched the sign of the
   later return — is reported with a binomial p-value, because it is far more
   legible than `r` and immune to outlier magnitude.

The verdict distinguishes **flow leads price** (potentially predictive), **price
leads flow** (reactive, worthless as a signal), **moves together**, **no
detectable relationship**, and **not enough data**.

## Tests

```bash
npm test                      # statistics, offline
DATABASE_URL=… npm run test:db  # full pipeline against real Postgres
```

The statistics tests check the coefficients against hand-computed values, verify
that a heavy tail splits Pearson from Spearman, confirm a planted lead is
recovered at the correct lag, and — the one that matters most — assert that two
unrelated series do **not** clear the significance threshold.

The pipeline tests seed a token whose price genuinely responds to whale flow two
hours later plus one where it does not, then assert the engine finds the first
and rejects the second.

## Known limits

- **`eth_getLogs` has no value filter.** Every Transfer in a block range must be
  fetched and then discarded below the threshold. On a token like USDT that
  consumes the call budget quickly, which is why each run walks a bounded block
  span and rotates across tokens least-recently-ingested first.
- **Coverage has holes by design.** Each cycle advances a token's cursor by at
  most `MAX_BLOCK_SPAN` blocks. If the ingester falls behind the chain it stays
  behind until it catches up, and the correlation window is only as honest as
  the blocks actually walked.
- **Transfers are valued at the hourly price**, not at their exact block.
- **Whale identity is inferred, never verified.** An address that moves a lot of
  value is in the set. It may be one desk, an exchange's internal plumbing, or a
  contract nobody controls. The `hub` classification is a threshold on observed
  behaviour, not an identity.
