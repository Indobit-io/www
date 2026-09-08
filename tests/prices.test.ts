// The price sync's job is to finish inside a wall-clock budget and to make
// forward progress across runs. Both are verified here against a stub
// CoinGecko that behaves like the throttled free tier.
//
//   DATABASE_URL=postgres://... npm run test:db

import test from "node:test";
import assert from "node:assert/strict";

const HAS_DB = Boolean(process.env.DATABASE_URL);

if (!HAS_DB) {
  test("price sync (skipped: DATABASE_URL not set)", { skip: true }, () => {});
}

if (HAS_DB) {
  const db = await import("../lib/db.ts");
  const cg = await import("../lib/coingecko.ts");
  const ingest = await import("../lib/ingest.ts");

  const TOKEN_COUNT = 12;
  /** Each stubbed fetch costs this much, like a rate-limited call. */
  const CALL_COST_MS = 300;

  let calls: { id: string; days: number }[] = [];

  /** Stands in for CoinGecko: costs real time, honours the deadline, can fail. */
  function stubChart(failFor: Set<string> = new Set()) {
    return async (id: string, days: number, deadline?: number) => {
      if (deadline && Date.now() + CALL_COST_MS >= deadline) throw new cg.DeadlineExceeded();
      await new Promise((r) => setTimeout(r, CALL_COST_MS));
      calls.push({ id, days });
      if (failFor.has(id)) throw new Error("CoinGecko HTTP 500");
      const now = Date.now();
      const points = [];
      for (let h = days * 24; h >= 0; h--) {
        points.push({ ts: new Date(now - h * 3_600_000), price: 100 + h });
      }
      return points;
    };
  }

  test("setup", async () => {
    await db.init();
    await db.pool.query(
      "TRUNCATE transfers, price_points, whales, ingest_runs, tokens RESTART IDENTITY CASCADE"
    );
    for (let i = 0; i < TOKEN_COUNT; i++) {
      await db.upsertToken({
        chain_id: 1,
        contract: `0x${(i + 1).toString(16).padStart(40, "b")}`.slice(0, 42),
        symbol: `T${i}`,
        name: `Token ${i}`,
        coingecko_id: `coin-${i}`,
        decimals: 18,
        market_cap_usd: 1e9 - i,
        market_rank: i + 1,
        price_usd: 1,
        price_change_24h: 0,
      });
    }
    await db.retrackTopTokens(TOKEN_COUNT);
  });

  test("a budget too small for every token stops cleanly instead of overrunning", async () => {
    calls = [];
    // Room for ~4 calls, not 12.
    const budgetMs = CALL_COST_MS * 4 + 200;
    const started = Date.now();
    const res = await ingest.syncPrices({ budgetMs, days: 30, fetchChart: stubChart() });
    const elapsed = Date.now() - started;

    assert.ok(res.budgetExhausted, "must report that it ran out of budget");
    assert.ok(res.tokens > 0, "must still price something");
    assert.ok(res.tokens < TOKEN_COUNT, `priced ${res.tokens}, expected a partial pass`);
    assert.ok(res.remaining > 0, "must report how many are left");
    assert.ok(
      elapsed < budgetMs + CALL_COST_MS * 2,
      `overran the budget: ${elapsed}ms against ${budgetMs}ms`
    );
    assert.ok(res.points > 0, "the tokens it did reach must have been written");
  });

  test("the next run picks up the tail instead of repeating the head", async () => {
    const firstPass = new Set(calls.map((c) => c.id));
    calls = [];
    const res = await ingest.syncPrices({ budgetMs: CALL_COST_MS * 4 + 200, days: 30, fetchChart: stubChart() });
    const secondPass = calls.map((c) => c.id);

    assert.ok(secondPass.length > 0, "second run must do work");
    for (const id of secondPass) {
      assert.ok(!firstPass.has(id), `${id} was re-priced instead of rotating to the tail`);
    }
    assert.ok(res.tokens > 0);
  });

  test("repeated runs eventually cover every token", async () => {
    for (let i = 0; i < 6; i++) {
        await ingest.syncPrices({ budgetMs: CALL_COST_MS * 4 + 200, days: 30, fetchChart: stubChart() });
    }
    const { rows } = await db.pool.query<{ n: number }>(
      "SELECT COUNT(DISTINCT token_id)::int AS n FROM price_points"
    );
    assert.equal(rows[0].n, TOKEN_COUNT, "every tracked token should have prices by now");
  });

  test("a freshly priced token is skipped, and a stale one is backfilled", async () => {
    calls = [];
    // Everything was just priced by the previous test, so nothing needs work.
    const res = await ingest.syncPrices({ budgetMs: 60_000, days: 30, fetchChart: stubChart() });
    assert.equal(res.skippedFresh, TOKEN_COUNT, "all tokens are fresh");
    assert.equal(calls.length, 0, "no network calls for fresh tokens");

    // Age one token past the incremental window but not past the stale window.
    await db.pool.query(
      "UPDATE price_points SET ts = ts - INTERVAL '3 hours' WHERE token_id = 1"
    );
    calls = [];
    const res2 = await ingest.syncPrices({ budgetMs: 60_000, days: 30, fetchChart: stubChart() });
    assert.equal(calls.length, 1, "only the aged token is refetched");
    assert.equal(calls[0].days, 2, "a recent token takes the cheap incremental window");
    assert.equal(res2.incremental, 1);
    assert.equal(res2.backfilled, 0);

    // Age it far past the stale threshold: now a full backfill is required.
    await db.pool.query(
      "UPDATE price_points SET ts = ts - INTERVAL '5 days' WHERE token_id = 2"
    );
    calls = [];
    const res3 = await ingest.syncPrices({ budgetMs: 60_000, days: 30, fetchChart: stubChart() });
    assert.equal(calls[0].days, 30, "a stale token must backfill the full window");
    assert.equal(res3.backfilled, 1);
  });

  test("one broken coin does not block the rotation behind it", async () => {
    await db.pool.query("UPDATE price_points SET ts = ts - INTERVAL '4 hours'");
    calls = [];
    const res = await ingest.syncPrices({
      budgetMs: 60_000,
      days: 30,
      fetchChart: stubChart(new Set(["coin-0"])),
    });

    assert.equal(res.errors.length, 1, `expected one error, got ${JSON.stringify(res.errors)}`);
    assert.ok(res.tokens >= TOKEN_COUNT - 1, "every other coin still got priced");

    // The failing coin must have been marked attempted, so the next run moves on.
    const { rows } = await db.pool.query<{ last_priced_at: string | null }>(
      "SELECT last_priced_at FROM tokens WHERE coingecko_id = 'coin-0'"
    );
    assert.ok(rows[0].last_priced_at, "a failed coin is still marked attempted");
  });

  test("teardown", async () => {
    await db.pool.query(
      "TRUNCATE transfers, price_points, whales, ingest_runs, tokens RESTART IDENTITY CASCADE"
    );
    await db.pool.end();
  });
}
