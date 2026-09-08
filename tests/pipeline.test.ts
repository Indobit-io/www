// End-to-end test against a real Postgres. Seeds a synthetic token with a
// deliberately planted lead-lag relationship and checks the pipeline finds it —
// and, just as importantly, that it does not find one where none exists.
//
//   DATABASE_URL=postgres://... npm run test:db
//
// Skipped when DATABASE_URL is unset so `npm test` stays offline-safe.

import test from "node:test";
import assert from "node:assert/strict";

const HAS_DB = Boolean(process.env.DATABASE_URL);

if (!HAS_DB) {
  test("pipeline integration (skipped: DATABASE_URL not set)", { skip: true }, () => {});
}

const HOUR_MS = 3_600_000;
const TOKEN_CONTRACT = "0x1111111111111111111111111111111111111111";
const NOISE_CONTRACT = "0x2222222222222222222222222222222222222222";
const WHALE = "0x00000000000000000000000000000000000000a1";
const NOISE_WHALE = "0x00000000000000000000000000000000000000b1";

/** Deterministic PRNG so a failure is always reproducible. */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function counterparty(i: number): string {
  return `0x${(i + 0x10000).toString(16).padStart(40, "c")}`.slice(0, 42);
}

if (HAS_DB) {
  const db = await import("../lib/db.ts");
  const { correlateToken, movers } = await import("../lib/analysis.ts");

  // Planted: whale netflow at hour h drives the return at hour h + LEAD.
  const LEAD = 2;
  const HOURS = 24 * 21;
  const startTs = Date.now() - HOURS * HOUR_MS;
  const hourAt = (h: number) => new Date(startTs + h * HOUR_MS);

  let signalTokenId = 0;
  let noiseTokenId = 0;

  test("setup: fresh schema and seeded data", async () => {
    await db.init();
    // Order matters: transfers and price_points reference tokens.
    await db.pool.query("TRUNCATE transfers, price_points, whales, ingest_runs, tokens RESTART IDENTITY CASCADE");

    const signalToken = await db.upsertToken({
      chain_id: 1, contract: TOKEN_CONTRACT, symbol: "SIG", name: "Signal Token",
      coingecko_id: "signal-token", decimals: 18, market_cap_usd: 1e9,
      market_rank: 10, price_usd: 100, price_change_24h: 1.5,
    });
    const noiseToken = await db.upsertToken({
      chain_id: 1, contract: NOISE_CONTRACT, symbol: "NOI", name: "Noise Token",
      coingecko_id: "noise-token", decimals: 6, market_cap_usd: 5e8,
      market_rank: 20, price_usd: 3, price_change_24h: -0.5,
    });
    signalTokenId = signalToken.id;
    noiseTokenId = noiseToken.id;

    // --- Signal token: netflow[h] -> return[h + LEAD] ---
    const rng = makeRng(7);
    const flow = new Array(HOURS).fill(0);
    for (let h = 0; h < HOURS; h++) {
      // Flow in ~65% of hours, so the series is realistically sparse.
      if (rng() > 0.65) continue;
      const magnitude = 2e6 + rng() * 8e6;
      flow[h] = (rng() > 0.5 ? 1 : -1) * magnitude;
    }

    const returns = new Array(HOURS).fill(0);
    for (let h = 0; h < HOURS; h++) {
      if (h + LEAD < HOURS) returns[h + LEAD] = flow[h] * 2e-9;
    }

    const signalPrices: { ts: Date; price: number }[] = [];
    let price = 100;
    for (let h = 0; h < HOURS; h++) {
      price *= Math.exp(returns[h]);
      signalPrices.push({ ts: hourAt(h), price });
    }
    await db.upsertPricePoints(signalTokenId, signalPrices);

    const transfers: Parameters<typeof db.insertTransfers>[0] = [];
    let logIndex = 0;
    for (let h = 0; h < HOURS; h++) {
      if (flow[h] === 0) continue;
      const usd = Math.abs(flow[h]);
      const other = counterparty(h);
      const inbound = flow[h] > 0;
      transfers.push({
        chain_id: 1, token_id: signalTokenId,
        block_number: 20_000_000 + h * 300,
        block_time: hourAt(h).toISOString(),
        tx_hash: `0x${(h + 1).toString(16).padStart(64, "0")}`,
        log_index: logIndex++,
        from_addr: inbound ? other : WHALE,
        to_addr: inbound ? WHALE : other,
        qty: usd / signalPrices[h].price,
        usd_value: usd,
      });
    }

    // --- Noise token: flow and price are independent ---
    const rngN = makeRng(99);
    const noisePrices: { ts: Date; price: number }[] = [];
    let np = 3;
    for (let h = 0; h < HOURS; h++) {
      np *= Math.exp((rngN() - 0.5) * 0.02);
      noisePrices.push({ ts: hourAt(h), price: np });
    }
    await db.upsertPricePoints(noiseTokenId, noisePrices);

    for (let h = 0; h < HOURS; h++) {
      if (rngN() > 0.6) continue;
      const usd = 1e6 + rngN() * 4e6;
      const inbound = rngN() > 0.5;
      const other = counterparty(100000 + h);
      transfers.push({
        chain_id: 1, token_id: noiseTokenId,
        block_number: 20_000_000 + h * 300,
        block_time: hourAt(h).toISOString(),
        tx_hash: `0xaa${(h + 1).toString(16).padStart(62, "0")}`,
        log_index: logIndex++,
        from_addr: inbound ? other : NOISE_WHALE,
        to_addr: inbound ? NOISE_WHALE : other,
        qty: usd / noisePrices[h].price,
        usd_value: usd,
      });
    }

    const inserted = await db.insertTransfers(transfers);
    assert.equal(inserted, transfers.length, "every seeded transfer should insert");
  });

  test("insertTransfers is idempotent on (chain, tx, log_index)", async () => {
    const before = (await db.pipelineStats()).transfers;
    const dupe = await db.insertTransfers([
      {
        chain_id: 1, token_id: signalTokenId, block_number: 20_000_000,
        block_time: hourAt(0).toISOString(),
        tx_hash: `0x${(1).toString(16).padStart(64, "0")}`,
        log_index: 0, from_addr: WHALE, to_addr: counterparty(0),
        qty: 1, usd_value: 1,
      },
    ]);
    assert.equal(dupe, 0, "re-inserting the same log must be a no-op");
    assert.equal((await db.pipelineStats()).transfers, before);
  });

  test("rebuildWhales ranks by volume and excludes token contracts", async () => {
    // Only the two accumulators should qualify; every counterparty is unique
    // and therefore tiny.
    const count = await db.rebuildWhales(30, 2);
    assert.equal(count, 2);

    const { rows } = await db.listWhales({ limit: 10 });
    const addresses = rows.map((r) => r.address);
    assert.ok(addresses.includes(WHALE), "the signal whale must be ranked");
    assert.ok(addresses.includes(NOISE_WHALE), "the noise whale must be ranked");
    assert.equal(rows[0].rank, 1);
    assert.ok(!addresses.includes(TOKEN_CONTRACT), "a token contract is never a whale");

    const whale = await db.getWhale(WHALE);
    assert.ok(whale);
    assert.ok(Number(whale.volume_usd) > 0);
    // Inflow and outflow must reconcile with total volume.
    assert.ok(
      Math.abs(Number(whale.inflow_usd) + Number(whale.outflow_usd) - Number(whale.volume_usd)) < 1,
      "inflow + outflow should equal volume"
    );
  });

  test("rebuildWhales demotes addresses that fall out of the top set", async () => {
    await db.rebuildWhales(30, 1);
    const { rows, total } = await db.listWhales({ limit: 10 });
    assert.equal(total, 1, "only one whale should remain in_top");
    assert.equal(rows[0].rank, 1);

    // The demoted row must still exist, so labels and history survive.
    const demoted = await db.getWhale(rows[0].address === WHALE ? NOISE_WHALE : WHALE);
    assert.ok(demoted, "a demoted whale is kept, not deleted");
    assert.equal(demoted.in_top, false);
    assert.equal(demoted.rank, null);

    await db.rebuildWhales(30, 2); // restore for the remaining tests
  });

  test("labels survive a rebuild", async () => {
    await db.setWhaleLabel(WHALE, "Test Desk");
    await db.rebuildWhales(30, 2);
    const whale = await db.getWhale(WHALE);
    assert.equal(whale?.label, "Test Desk");
    await db.setWhaleLabel(WHALE, null);
  });

  test("movers reports both tokens with correct volume", async () => {
    // Window is wider than the seeded span so the boundary cannot clip a row.
    const rows = await movers({ hours: 24 * 30, limit: 10 });
    assert.equal(rows.length, 2);

    const sig = rows.find((r) => r.symbol === "SIG");
    assert.ok(sig, "SIG should appear");
    assert.ok(sig.gross_usd > 0);
    assert.equal(sig.whales, 1, "exactly one tracked whale touched SIG");
    assert.ok(sig.transfers > 100);

    // Gross must equal the sum of the underlying transfers.
    const { rows: check } = await db.pool.query<{ total: number }>(
      "SELECT SUM(usd_value)::float8 AS total FROM transfers WHERE token_id = $1",
      [sig.token_id]
    );
    assert.ok(Math.abs(sig.gross_usd - check[0].total) < 1, "gross must reconcile with raw rows");
  });

  test("correlateToken recovers the planted +2h lead", async () => {
    const report = await correlateToken(signalTokenId, { windowDays: 30, maxLag: 6 });
    assert.ok(report);
    assert.ok(report.buckets.length > 400, `got ${report.buckets.length} buckets`);
    assert.ok(report.activeBuckets > 100, `got ${report.activeBuckets} active buckets`);

    assert.equal(report.scan.best?.lag, LEAD, "the scan must find the planted lag");
    assert.ok((report.scan.best?.pearson ?? 0) > 0.9, `r was ${report.scan.best?.pearson}`);
    assert.ok(report.scan.bestIsSignificant);
    assert.equal(report.verdict, "flow-leads-price");
    // Direction should agree essentially always for a noiseless plant.
    assert.ok(report.hitRate.rate > 0.95, `hit rate ${report.hitRate.rate}`);
  });

  test("correlateToken reports no relationship on independent series", async () => {
    const report = await correlateToken(noiseTokenId, { windowDays: 30, maxLag: 6 });
    assert.ok(report);
    assert.ok(report.activeBuckets > 100, "the noise token has plenty of flow");
    assert.equal(
      report.verdict,
      "no-relationship",
      `independent series must not produce a verdict (best r ${report.scan.best?.pearson})`
    );
    assert.equal(report.scan.bestIsSignificant, false);
  });

  test("whaleTokenBreakdown nets inflow against outflow", async () => {
    const rows = await db.whaleTokenBreakdown(WHALE, 30);
    assert.equal(rows.length, 1, "the signal whale only touched SIG");
    const r = rows[0];
    assert.equal(r.symbol, "SIG");
    assert.ok(
      Math.abs(Number(r.net_usd) - (Number(r.inflow_usd) - Number(r.outflow_usd))) < 1,
      "net must equal inflow minus outflow"
    );
  });

  test("recentTransfers filters and flags whales on both sides", async () => {
    const rows = await db.recentTransfers({ limit: 20, whalesOnly: true, minUsd: 5_000_000 });
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.ok(Number(r.usd_value) >= 5_000_000, "min_usd must be respected");
      assert.ok(r.from_is_whale || r.to_is_whale, "whalesOnly must exclude retail-to-retail");
    }
    // Descending by time.
    for (let i = 1; i < rows.length; i++) {
      assert.ok(new Date(rows[i - 1].block_time) >= new Date(rows[i].block_time));
    }
  });

  test("teardown", async () => {
    await db.pool.query("TRUNCATE transfers, price_points, whales, ingest_runs, tokens RESTART IDENTITY CASCADE");
    await db.pool.end();
  });
}
