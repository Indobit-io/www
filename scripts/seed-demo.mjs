#!/usr/bin/env node
/**
 * Fills the database with SYNTHETIC data so the UI can be developed without an
 * Etherscan key or a live chain.
 *
 *   node scripts/seed-demo.mjs          # seed
 *   node scripts/seed-demo.mjs --clear  # wipe everything, including the flag
 *
 * The numbers are generated. Two tokens carry a deliberately planted lead-lag
 * relationship and the rest are noise, so the correlation view has something to
 * both find and correctly reject. A `demo_data` flag is written to app_meta and
 * the UI banners every page while it is set.
 */

import { Pool } from "pg";

const HOUR_MS = 3_600_000;
const HOURS = 24 * 30;
const CLEAR = process.argv.includes("--clear");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Deterministic PRNG so re-seeding produces the same database. */
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const TOKENS = [
  { symbol: "WETH", name: "Wrapped Ether",  price: 3200,   lead: 2,    strength: 0.85, rank: 2 },
  { symbol: "LINK", name: "Chainlink",      price: 18.4,   lead: 4,    strength: 0.55, rank: 14 },
  { symbol: "UNI",  name: "Uniswap",        price: 9.1,    lead: null, strength: 0,    rank: 22 },
  { symbol: "AAVE", name: "Aave",           price: 148,    lead: -3,   strength: 0.6,  rank: 38 },
  { symbol: "PEPE", name: "Pepe",           price: 0.0000094, lead: null, strength: 0, rank: 41 },
  { symbol: "MKR",  name: "Maker",          price: 1420,   lead: 1,    strength: 0.3,  rank: 55 },
];

function contractFor(i) {
  return `0x${(i + 1).toString(16).padStart(40, "e")}`.slice(0, 42);
}
function whaleFor(i) {
  return `0x${(i + 1).toString(16).padStart(40, "a")}`.slice(0, 42);
}
function retailFor(i) {
  return `0x${(i + 1).toString(16).padStart(40, "7")}`.slice(0, 42);
}

async function clear() {
  await pool.query(
    "TRUNCATE transfers, price_points, whales, ingest_runs, tokens RESTART IDENTITY CASCADE"
  );
  await pool.query("DELETE FROM app_meta WHERE key = 'demo_data'");
  console.log("Cleared all data and removed the demo flag.");
}

async function seed() {
  const rng = makeRng(20260908);
  const startTs = Date.now() - HOURS * HOUR_MS;
  const hourAt = (h) => new Date(startTs + h * HOUR_MS);

  await clear();

  // 120 whales so the leaderboard has something to page through; the real
  // registry targets 500 but that needs real chain volume behind it.
  const WHALES = 120;
  let txCounter = 0;

  for (let ti = 0; ti < TOKENS.length; ti++) {
    const spec = TOKENS[ti];
    const { rows } = await pool.query(
      `INSERT INTO tokens (chain_id, contract, symbol, name, coingecko_id, decimals,
                           market_cap_usd, market_rank, price_usd, price_change_24h, tracked)
       VALUES (1,$1,$2,$3,$4,18,$5,$6,$7,$8,TRUE) RETURNING id`,
      [
        contractFor(ti),
        spec.symbol,
        spec.name,
        spec.symbol.toLowerCase(),
        1e9 / (spec.rank || 1),
        spec.rank,
        spec.price,
        (rng() - 0.45) * 8,
      ]
    );
    const tokenId = rows[0].id;

    // Whale netflow per hour, sparse and heavy-tailed like the real thing.
    const flow = new Array(HOURS).fill(0);
    for (let h = 0; h < HOURS; h++) {
      if (rng() > 0.35) continue;
      const heavy = rng() > 0.94 ? 12 : 1; // occasional monster transfer
      flow[h] = (rng() > 0.5 ? 1 : -1) * (5e5 + rng() * 6e6) * heavy;
    }

    // Returns: an idiosyncratic component plus, for some tokens, a component
    // driven by flow at the planted lead.
    const returns = new Array(HOURS).fill(0);
    for (let h = 0; h < HOURS; h++) returns[h] = (rng() - 0.5) * 0.012;
    if (spec.lead !== null && spec.strength > 0) {
      const scale = spec.strength * 4e-9;
      for (let h = 0; h < HOURS; h++) {
        const target = h + spec.lead;
        if (target >= 0 && target < HOURS) returns[target] += flow[h] * scale;
      }
    }

    const prices = [];
    let price = spec.price;
    for (let h = 0; h < HOURS; h++) {
      price *= Math.exp(returns[h]);
      prices.push([tokenId, hourAt(h), price]);
    }
    for (let i = 0; i < prices.length; i += 500) {
      const chunk = prices.slice(i, i + 500);
      const values = chunk.flat();
      const tuples = chunk.map((_, j) => `($${j * 3 + 1},$${j * 3 + 2},$${j * 3 + 3})`);
      await pool.query(
        `INSERT INTO price_points (token_id, ts, price_usd) VALUES ${tuples.join(",")}
         ON CONFLICT DO NOTHING`,
        values
      );
    }
    await pool.query(`UPDATE tokens SET price_usd = $2 WHERE id = $1`, [tokenId, price]);

    const transfers = [];
    for (let h = 0; h < HOURS; h++) {
      if (flow[h] === 0) continue;
      const usd = Math.abs(flow[h]);
      const inbound = flow[h] > 0;
      // Weight whale selection so the leaderboard has a real head and tail.
      const whaleIdx = Math.floor(rng() ** 2.2 * WHALES);
      const whale = whaleFor(whaleIdx);
      const other = rng() > 0.15 ? retailFor(Math.floor(rng() * 4000)) : whaleFor(Math.floor(rng() ** 2.2 * WHALES));
      if (other === whale) continue;

      txCounter++;
      transfers.push([
        1,
        tokenId,
        20_000_000 + h * 300 + (txCounter % 200),
        hourAt(h),
        `0x${txCounter.toString(16).padStart(64, "0")}`,
        txCounter % 400,
        inbound ? other : whale,
        inbound ? whale : other,
        usd / prices[h][2],
        usd,
      ]);
    }

    for (let i = 0; i < transfers.length; i += 300) {
      const chunk = transfers.slice(i, i + 300);
      const values = chunk.flat();
      const tuples = chunk.map((_, j) => {
        const b = j * 10;
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10})`;
      });
      await pool.query(
        `INSERT INTO transfers (chain_id, token_id, block_number, block_time, tx_hash,
                                log_index, from_addr, to_addr, qty, usd_value)
         VALUES ${tuples.join(",")} ON CONFLICT DO NOTHING`,
        values
      );
    }
    console.log(`  ${spec.symbol}: ${transfers.length} transfers, ${prices.length} price points`);
  }

  await pool.query(
    `INSERT INTO app_meta (key, value) VALUES ('demo_data', 'true')
     ON CONFLICT (key) DO UPDATE SET value = 'true'`
  );

  console.log("\nSeeded synthetic data. Now rebuild the whale registry:");
  console.log("  curl -X POST localhost:3000/api/cron/whales");
}

const run = CLEAR ? clear : seed;
run()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
