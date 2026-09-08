// The pipeline. Four jobs, each idempotent and each safe to run on a cron:
//
//   syncUniverse  — which tokens exist and where their contracts live
//   syncPrices    — hourly price series backing the correlation
//   ingestFlow    — walk Transfer logs, keep the large ones
//   refreshWhales — recompute the top-N registry from observed flow
//
// Everything is budgeted. Etherscan's free tier is 100k calls/day and
// eth_getLogs has no value filter, so a high-volume token like USDT can
// consume an entire run on its own. `callBudget` plus least-recently-ingested
// ordering keeps one token from starving the rest.

import { indexedChains, type Chain } from "./chains";
import * as cg from "./coingecko";
import * as es from "./etherscan";
import { TRANSFER_TOPIC, decodeTransfer, fetchDecimals, isBurnAddress, toUnits } from "./erc20";
import * as db from "./db";

/** Transfers below this are noise, not whale activity. */
export const MIN_TRANSFER_USD = Number(process.env.MIN_TRANSFER_USD ?? 250_000);

/** How many top-market-cap tokens to consider for the universe. */
const UNIVERSE_SIZE = Number(process.env.UNIVERSE_SIZE ?? 250);

/** How many of those we actually walk logs for. */
const TRACKED_TOKENS = Number(process.env.TRACKED_TOKENS ?? 40);

/** Trailing window that defines "whale". */
export const WHALE_WINDOW_DAYS = Number(process.env.WHALE_WINDOW_DAYS ?? 30);

/** First run starts this far back rather than at genesis. */
const BACKFILL_HOURS = Number(process.env.BACKFILL_HOURS ?? 24);

// --- Universe ------------------------------------------------------------

export interface UniverseResult {
  chains: string[];
  considered: number;
  matched: number;
  inserted: number;
  tracked: number;
  skippedNoContract: number;
}

/**
 * Builds the token universe from CoinGecko's market-cap ranking joined against
 * its platform map. No contract address is ever hardcoded — they all come from
 * CoinGecko and decimals are read on-chain.
 */
export async function syncUniverse(): Promise<UniverseResult> {
  await db.init();
  const chains = indexedChains();

  const pages = Math.ceil(UNIVERSE_SIZE / 250);
  const markets: cg.MarketCoin[] = [];
  for (let page = 1; page <= pages; page++) {
    markets.push(...(await cg.topMarkets(250, page)));
  }
  const top = markets.slice(0, UNIVERSE_SIZE);

  const list = await cg.coinListWithPlatforms();
  const platformsById = new Map(list.map((c) => [c.id, c.platforms ?? {}]));

  const existing = await db.listTokens();
  const knownDecimals = new Map(existing.map((t) => [`${t.chain_id}:${t.contract}`, t.decimals]));

  let matched = 0;
  let inserted = 0;
  let skippedNoContract = 0;

  for (const coin of top) {
    const platforms = platformsById.get(coin.id);
    if (!platforms) {
      skippedNoContract++;
      continue;
    }
    let placed = false;

    for (const chain of chains) {
      const raw = platforms[chain.coingeckoPlatform];
      if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw.trim())) continue;
      const contract = raw.trim().toLowerCase();
      placed = true;
      matched++;

      const key = `${chain.id}:${contract}`;
      const decimals =
        knownDecimals.get(key) ?? (await fetchDecimals(chain.id, contract));

      await db.upsertToken({
        chain_id: chain.id,
        contract,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        coingecko_id: coin.id,
        decimals,
        market_cap_usd: coin.market_cap,
        market_rank: coin.market_cap_rank,
        price_usd: coin.current_price,
        price_change_24h: coin.price_change_percentage_24h,
      });
      if (!knownDecimals.has(key)) inserted++;
    }
    // Native coins (BTC, native ETH, SOL…) have no ERC-20 contract to index.
    if (!placed) skippedNoContract++;
  }

  const tracked = await db.retrackTopTokens(TRACKED_TOKENS);

  return {
    chains: chains.map((c) => c.name),
    considered: top.length,
    matched,
    inserted,
    tracked,
    skippedNoContract,
  };
}

// --- Prices --------------------------------------------------------------

export interface PriceResult {
  tokens: number;
  points: number;
  errors: string[];
}

/** Pulls hourly price history for every tracked token. */
export async function syncPrices(days = WHALE_WINDOW_DAYS): Promise<PriceResult> {
  await db.init();
  const tokens = await db.listTokens({ trackedOnly: true });
  const errors: string[] = [];
  let points = 0;

  // CoinGecko returns hourly granularity for a 2-90 day range; outside it the
  // series is 5-minutely or daily and the hourly bucketing breaks down.
  const clamped = Math.min(Math.max(days, 2), 90);

  // Dedupe: several chains can carry the same CoinGecko coin.
  const seen = new Set<string>();

  for (const token of tokens) {
    if (seen.has(token.coingecko_id)) continue;
    try {
      const series = await cg.marketChart(token.coingecko_id, clamped);
      const sameCoin = tokens.filter((t) => t.coingecko_id === token.coingecko_id);
      for (const t of sameCoin) points += await db.upsertPricePoints(t.id, series);
      seen.add(token.coingecko_id);
    } catch (err) {
      errors.push(`${token.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { tokens: seen.size, points, errors };
}

// --- Flow ingestion ------------------------------------------------------

export interface FlowResult {
  tokensScanned: number;
  logsSeen: number;
  transfersKept: number;
  transfersInserted: number;
  callsUsed: number;
  budgetExhausted: boolean;
  perToken: { symbol: string; from: number; to: number; kept: number }[];
  errors: string[];
}

/** Nearest price at or before `t`, from an ascending series. */
function priceAt(series: { t: number; price: number }[], t: number, fallback: number): number {
  if (!series.length) return fallback;
  let lo = 0;
  let hi = series.length - 1;
  if (t < series[0].t) return series[0].price;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (series[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return series[lo].price ?? fallback;
}

export async function ingestFlow(
  opts: { callBudget?: number; maxBlockSpan?: number } = {}
): Promise<FlowResult> {
  await db.init();

  const callBudget = opts.callBudget ?? Number(process.env.INGEST_CALL_BUDGET ?? 120);
  const maxBlockSpan = opts.maxBlockSpan ?? Number(process.env.MAX_BLOCK_SPAN ?? 800);

  const result: FlowResult = {
    tokensScanned: 0,
    logsSeen: 0,
    transfersKept: 0,
    transfersInserted: 0,
    callsUsed: 0,
    budgetExhausted: false,
    perToken: [],
    errors: [],
  };

  const all = await db.listTokens({ trackedOnly: true });
  if (!all.length) return result;

  // Least-recently-ingested first, so the budget rotates across the universe.
  const queue = [...all].sort((a, b) => {
    const at = a.last_ingest_at ? new Date(a.last_ingest_at).getTime() : 0;
    const bt = b.last_ingest_at ? new Date(b.last_ingest_at).getTime() : 0;
    return at - bt;
  });

  const chainHeads = new Map<number, number>();
  const chainsToLoad = new Set(queue.map((t) => t.chain_id));
  for (const chainId of chainsToLoad) {
    try {
      chainHeads.set(chainId, await es.latestBlock(chainId));
      result.callsUsed++;
    } catch (err) {
      result.errors.push(`chain ${chainId} head: ${err instanceof Error ? err.message : err}`);
    }
  }

  for (const token of queue) {
    if (result.callsUsed >= callBudget) {
      result.budgetExhausted = true;
      break;
    }
    const head = chainHeads.get(token.chain_id);
    if (!head) continue;

    try {
      let fromBlock = token.last_block ? token.last_block + 1 : null;
      if (fromBlock === null) {
        const since = Date.now() / 1000 - BACKFILL_HOURS * 3600;
        fromBlock = (await es.blockNumberAt(token.chain_id, since)) + 1;
        result.callsUsed++;
      }
      if (fromBlock > head) continue;

      const prices = await db.priceLookupSeries(token.id, WHALE_WINDOW_DAYS + 2);
      const fallbackPrice = Number(token.price_usd ?? 0);
      if (!prices.length && !fallbackPrice) {
        result.errors.push(`${token.symbol}: no price data, cannot value transfers`);
        continue;
      }

      let span = Math.min(maxBlockSpan, head - fromBlock + 1);
      let toBlock = fromBlock + span - 1;
      let kept = 0;
      let attempts = 0;
      let logs: es.RawLog[] = [];

      // eth_getLogs caps at 1000 rows with no way to tell truncation apart from
      // a genuinely full page. Narrow the range until a page comes back short.
      while (attempts < 6) {
        if (result.callsUsed >= callBudget) {
          result.budgetExhausted = true;
          break;
        }
        logs = await es.getLogs({
          chainId: token.chain_id,
          address: token.contract,
          topic0: TRANSFER_TOPIC,
          fromBlock,
          toBlock,
        });
        result.callsUsed++;
        attempts++;

        if (logs.length < es.LOGS_PAGE_LIMIT) break;
        if (toBlock === fromBlock) {
          // A single block overflows the page — accept the partial read and
          // move on rather than looping forever.
          result.errors.push(
            `${token.symbol}: block ${fromBlock} exceeds ${es.LOGS_PAGE_LIMIT} logs, partial read`
          );
          break;
        }
        span = Math.max(1, Math.floor(span / 4));
        toBlock = fromBlock + span - 1;
      }
      if (result.budgetExhausted) break;

      result.logsSeen += logs.length;
      const rows: Omit<db.Transfer, "id">[] = [];

      for (const log of logs) {
        const decoded = decodeTransfer(log);
        if (!decoded) continue;
        // Mints and burns are supply events, not somebody moving a position.
        if (isBurnAddress(decoded.from) || isBurnAddress(decoded.to)) continue;
        if (decoded.from === decoded.to) continue;

        const units = toUnits(decoded.raw, token.decimals);
        if (!Number.isFinite(units) || units <= 0) continue;

        const price = priceAt(prices, decoded.blockTime.getTime(), fallbackPrice);
        const usdValue = units * price;
        if (!Number.isFinite(usdValue) || usdValue < MIN_TRANSFER_USD) continue;

        rows.push({
          chain_id: token.chain_id,
          token_id: token.id,
          block_number: decoded.blockNumber,
          block_time: decoded.blockTime.toISOString(),
          tx_hash: decoded.txHash,
          log_index: decoded.logIndex,
          from_addr: decoded.from,
          to_addr: decoded.to,
          qty: units,
          usd_value: usdValue,
        });
        kept++;
      }

      result.transfersInserted += await db.insertTransfers(rows);
      result.transfersKept += kept;
      result.tokensScanned++;
      result.perToken.push({ symbol: token.symbol, from: fromBlock, to: toBlock, kept });

      await db.setTokenCursor(token.id, toBlock);
    } catch (err) {
      result.errors.push(`${token.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

// --- Whale registry ------------------------------------------------------

export interface WhaleRefreshResult {
  whales: number;
  codeChecked: number;
  windowDays: number;
}

export async function refreshWhales(
  opts: { codeCheckLimit?: number } = {}
): Promise<WhaleRefreshResult> {
  await db.init();
  const whales = await db.rebuildWhales(WHALE_WINDOW_DAYS, db.WHALE_COUNT);

  // Contract-vs-EOA is one cheap call per new whale; do a bounded slice each
  // run so the registry fills in over a few cycles instead of one huge burst.
  let codeChecked = 0;
  if (es.hasEtherscanKey()) {
    const pending = await db.whalesNeedingCodeCheck(opts.codeCheckLimit ?? 40);
    for (const address of pending) {
      try {
        const code = await es.getCode(1, address);
        await db.setWhaleIsContract(address, Boolean(code && code !== "0x"));
        codeChecked++;
      } catch {
        break; // Rate limited or down — try again next run.
      }
    }
    if (codeChecked) await db.rebuildWhales(WHALE_WINDOW_DAYS, db.WHALE_COUNT);
  }

  return { whales, codeChecked, windowDays: WHALE_WINDOW_DAYS };
}

// --- Run wrapper ---------------------------------------------------------

export async function runJob<T>(kind: string, fn: () => Promise<T>): Promise<T> {
  await db.init();
  const id = await db.startRun(kind);
  try {
    const detail = await fn();
    await db.finishRun(id, true, detail);
    return detail;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.finishRun(id, false, null, message);
    throw err;
  }
}
