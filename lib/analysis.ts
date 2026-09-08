// Turns raw transfers + prices into the two questions the app exists to answer:
// which tokens are whales moving right now, and does that movement have any
// relationship to price.

import { pool } from "./db";
import * as db from "./db";
import {
  directionalHitRate,
  lagScan,
  zScore,
  type HitRate,
  type LagScan,
} from "./stats";

const HOUR_MS = 3_600_000;

// --- Movers --------------------------------------------------------------

export interface Mover {
  token_id: number;
  symbol: string;
  name: string;
  chain_id: number;
  contract: string;
  price_usd: number | null;
  price_change_24h: number | null;
  market_rank: number | null;
  /** Total USD moved in transfers touching a tracked whale. */
  gross_usd: number;
  /** Whale inflow minus outflow. Positive = whales accumulating. */
  net_usd: number;
  transfers: number;
  whales: number;
  /** Window volume scaled to a daily rate, vs the trailing daily baseline. */
  volume_z: number;
  baseline_daily_usd: number | null;
  baseline_days: number;
}

interface MoverRow {
  token_id: number;
  symbol: string;
  name: string;
  chain_id: number;
  contract: string;
  price_usd: number | null;
  price_change_24h: number | null;
  market_rank: number | null;
  gross_usd: number;
  net_usd: number;
  transfers: number;
  whales: number;
  mean_daily: number | null;
  sd_daily: number | null;
  baseline_days: number;
}

/**
 * Ranks tokens by whale activity in the trailing window. The z-score compares
 * this window's volume against the token's own 30-day daily baseline, so a
 * quiet token waking up outranks a token that is always busy.
 */
export async function movers(opts: { hours?: number; limit?: number } = {}): Promise<Mover[]> {
  await db.init();
  const hours = opts.hours ?? 24;
  const limit = Math.min(opts.limit ?? 50, 200);

  const { rows } = await pool.query<MoverRow>(
    `WITH scoped AS (
       SELECT t.token_id, t.usd_value, t.from_addr, t.to_addr,
              wf.address AS whale_from, wt.address AS whale_to
       FROM transfers t
       LEFT JOIN whales wf ON wf.address = t.from_addr AND wf.in_top
       LEFT JOIN whales wt ON wt.address = t.to_addr   AND wt.in_top
       WHERE t.block_time >= NOW() - ($1 || ' hours')::interval
         AND (wf.address IS NOT NULL OR wt.address IS NOT NULL)
     ),
     win AS (
       SELECT token_id,
              SUM(usd_value) AS gross_usd,
              SUM(CASE WHEN whale_to IS NOT NULL THEN usd_value ELSE 0 END)
            - SUM(CASE WHEN whale_from IS NOT NULL THEN usd_value ELSE 0 END) AS net_usd,
              COUNT(*)::int AS transfers
       FROM scoped GROUP BY token_id
     ),
     uniq AS (
       SELECT token_id, COUNT(DISTINCT addr)::int AS whales FROM (
         SELECT token_id, whale_from AS addr FROM scoped WHERE whale_from IS NOT NULL
         UNION
         SELECT token_id, whale_to   AS addr FROM scoped WHERE whale_to   IS NOT NULL
       ) x GROUP BY token_id
     ),
     daily AS (
       SELECT token_id, date_trunc('day', block_time) AS d, SUM(usd_value) AS v
       FROM transfers
       WHERE block_time >= NOW() - INTERVAL '30 days'
         AND block_time <  date_trunc('day', NOW())
       GROUP BY 1, 2
     ),
     base AS (
       SELECT token_id, AVG(v) AS mean_daily, STDDEV_SAMP(v) AS sd_daily,
              COUNT(*)::int AS baseline_days
       FROM daily GROUP BY token_id
     )
     SELECT tk.id AS token_id, tk.symbol, tk.name, tk.chain_id, tk.contract,
            tk.price_usd, tk.price_change_24h, tk.market_rank,
            w.gross_usd, w.net_usd, w.transfers,
            COALESCE(u.whales, 0) AS whales,
            b.mean_daily, b.sd_daily, COALESCE(b.baseline_days, 0) AS baseline_days
     FROM win w
     JOIN tokens tk ON tk.id = w.token_id
     LEFT JOIN uniq u ON u.token_id = w.token_id
     LEFT JOIN base b ON b.token_id = w.token_id
     ORDER BY w.gross_usd DESC
     LIMIT $2`,
    [hours, limit]
  );

  return rows.map((r) => {
    // Scale the window to a daily rate so it is comparable to the baseline.
    const dailyRate = (Number(r.gross_usd) * 24) / hours;
    const mean = r.mean_daily === null ? null : Number(r.mean_daily);
    const sd = r.sd_daily === null ? null : Number(r.sd_daily);
    const volume_z =
      mean !== null && sd !== null && sd > 0 && r.baseline_days >= 3 ? (dailyRate - mean) / sd : 0;

    return {
      token_id: r.token_id,
      symbol: r.symbol,
      name: r.name,
      chain_id: r.chain_id,
      contract: r.contract,
      price_usd: r.price_usd === null ? null : Number(r.price_usd),
      price_change_24h: r.price_change_24h === null ? null : Number(r.price_change_24h),
      market_rank: r.market_rank,
      gross_usd: Number(r.gross_usd),
      net_usd: Number(r.net_usd),
      transfers: r.transfers,
      whales: r.whales,
      volume_z,
      baseline_daily_usd: mean,
      baseline_days: r.baseline_days,
    };
  });
}

// --- Correlation ---------------------------------------------------------

export interface FlowBucket {
  /** Bucket start, ISO. */
  ts: string;
  net_usd: number;
  gross_usd: number;
  price_usd: number;
  /** Log return over the previous bucket. */
  ret: number;
  /** True when the price was carried forward because CoinGecko had a gap. */
  filled: boolean;
}

export interface CorrelationReport {
  token: db.Token;
  windowDays: number;
  includeHubs: boolean;
  buckets: FlowBucket[];
  /** Buckets with any whale flow at all — the real sample size. */
  activeBuckets: number;
  filledBuckets: number;
  scan: LagScan;
  hitRate: HitRate;
  /** Same scan run on log-scaled flow, which tames the fat tail. */
  scanSigned: LagScan;
  warnings: string[];
  verdict: string;
}

/** Signed log scaling: keeps direction, compresses magnitude. */
function signedLog(x: number): number {
  return Math.sign(x) * Math.log1p(Math.abs(x));
}

function floorHour(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS;
}

/**
 * Builds an hourly grid of whale netflow against price return and reports how
 * they relate — at lag 0 and across a lead/lag scan.
 *
 * Sign convention: netflow is positive when whales receive (accumulate) and
 * negative when they send. A positive correlation at a positive lag means
 * whale accumulation preceded a price rise.
 */
export async function correlateToken(
  tokenId: number,
  opts: { windowDays?: number; includeHubs?: boolean; maxLag?: number } = {}
): Promise<CorrelationReport | null> {
  await db.init();

  const windowDays = Math.min(Math.max(opts.windowDays ?? 30, 2), 90);
  const includeHubs = opts.includeHubs ?? true;
  const maxLag = Math.min(Math.max(opts.maxLag ?? 6, 1), 24);

  const { rows: tokenRows } = await pool.query<db.Token>(`SELECT * FROM tokens WHERE id = $1`, [
    tokenId,
  ]);
  const token = tokenRows[0];
  if (!token) return null;

  const { rows: flowRows } = await pool.query<{ bucket: string; net: number; gross: number }>(
    `SELECT date_trunc('hour', t.block_time) AS bucket,
            SUM(CASE WHEN wt.address IS NOT NULL THEN t.usd_value ELSE 0 END)
          - SUM(CASE WHEN wf.address IS NOT NULL THEN t.usd_value ELSE 0 END) AS net,
            SUM(t.usd_value) AS gross
     FROM transfers t
     LEFT JOIN whales wf ON wf.address = t.from_addr AND wf.in_top
                        AND ($3 OR wf.kind <> 'hub')
     LEFT JOIN whales wt ON wt.address = t.to_addr   AND wt.in_top
                        AND ($3 OR wt.kind <> 'hub')
     WHERE t.token_id = $1
       AND t.block_time >= NOW() - ($2 || ' days')::interval
       AND (wf.address IS NOT NULL OR wt.address IS NOT NULL)
     GROUP BY 1 ORDER BY 1`,
    [tokenId, windowDays, includeHubs]
  );

  const priceRows = await db.priceSeries(tokenId, windowDays);
  const warnings: string[] = [];

  if (priceRows.length < 24) {
    return {
      token,
      windowDays,
      includeHubs,
      buckets: [],
      activeBuckets: 0,
      filledBuckets: 0,
      scan: { lags: [], best: null, concurrent: null, bonferroniAlpha: 0.05, bestIsSignificant: false },
      hitRate: { n: 0, hits: 0, rate: 0, pValue: 1 },
      scanSigned: {
        lags: [], best: null, concurrent: null, bonferroniAlpha: 0.05, bestIsSignificant: false,
      },
      warnings: ["No price history yet — run the price sync before reading any correlation."],
      verdict: "insufficient-data",
    };
  }

  // Last observed price per hour bucket.
  const priceByHour = new Map<number, number>();
  for (const p of priceRows) {
    priceByHour.set(floorHour(new Date(p.ts).getTime()), Number(p.price_usd));
  }
  const flowByHour = new Map<number, { net: number; gross: number }>();
  for (const f of flowRows) {
    flowByHour.set(floorHour(new Date(f.bucket).getTime()), {
      net: Number(f.net),
      gross: Number(f.gross),
    });
  }

  const start = Math.min(...priceByHour.keys());
  const end = Math.max(...priceByHour.keys());

  const buckets: FlowBucket[] = [];
  let lastPrice: number | null = null;
  let filledBuckets = 0;

  for (let t = start; t <= end; t += HOUR_MS) {
    const observed = priceByHour.get(t);
    const filled = observed === undefined;
    const price: number | null = observed ?? lastPrice;
    if (price === null || price === undefined || price <= 0) continue;
    if (filled) filledBuckets++;

    const flow = flowByHour.get(t) ?? { net: 0, gross: 0 };
    // A forward-filled bucket has no new information, so its return is 0.
    const ret = lastPrice && !filled ? Math.log(price / lastPrice) : 0;

    buckets.push({
      ts: new Date(t).toISOString(),
      net_usd: flow.net,
      gross_usd: flow.gross,
      price_usd: price,
      ret,
      filled,
    });
    lastPrice = price;
  }

  const netFlow = buckets.map((b) => b.net_usd);
  const returns = buckets.map((b) => b.ret);
  const activeBuckets = netFlow.filter((v) => v !== 0).length;

  const scan = lagScan(netFlow, returns, maxLag);
  const scanSigned = lagScan(netFlow.map(signedLog), returns, maxLag);
  const bestLag = scan.best?.lag ?? 0;
  const hitRate = directionalHitRate(netFlow, returns, bestLag);

  // --- Honest caveats, surfaced rather than buried ---
  if (activeBuckets < 30) {
    warnings.push(
      `Only ${activeBuckets} of ${buckets.length} hours had any whale flow. Correlation over a mostly-zero series is dominated by the zeros — treat this as anecdote, not evidence.`
    );
  }
  if (filledBuckets > buckets.length * 0.2) {
    warnings.push(
      `${filledBuckets} of ${buckets.length} price buckets were forward-filled from gaps in the price feed.`
    );
  }
  if (scan.best && Math.abs(scan.best.pearson - (scanSigned.best?.pearson ?? 0)) > 0.25) {
    warnings.push(
      "Raw and log-scaled flow disagree sharply, which means a handful of very large transfers are driving the raw coefficient. Trust the log-scaled and Spearman numbers."
    );
  }
  if (scan.best && Math.abs(scan.best.pearson - scan.best.spearman) > 0.3) {
    warnings.push(
      "Pearson and Spearman diverge by more than 0.3 — the relationship is not linear, or outliers are steering it."
    );
  }
  if (scan.best && scan.best.lag < 0 && scan.bestIsSignificant) {
    warnings.push(
      "The strongest relationship sits at a negative lag: price moved first and whales followed. That is reactive flow, not a leading signal."
    );
  }
  warnings.push(
    `${scan.lags.length} lags were tested, so significance is judged at the Bonferroni-adjusted p < ${scan.bonferroniAlpha.toFixed(4)}, not p < 0.05.`
  );

  let verdict: string;
  if (activeBuckets < 30) verdict = "insufficient-data";
  else if (!scan.bestIsSignificant) verdict = "no-relationship";
  else if (bestLag > 0) verdict = "flow-leads-price";
  else if (bestLag < 0) verdict = "price-leads-flow";
  else verdict = "concurrent";

  return {
    token,
    windowDays,
    includeHubs,
    buckets,
    activeBuckets,
    filledBuckets,
    scan,
    scanSigned,
    hitRate,
    warnings,
    verdict,
  };
}

export const VERDICT_COPY: Record<string, { label: string; detail: string; tone: string }> = {
  "insufficient-data": {
    label: "Not enough data",
    detail: "Too few hours carry whale flow to say anything. Let the ingester run longer.",
    tone: "text-cmc-text-muted",
  },
  "no-relationship": {
    label: "No detectable relationship",
    detail:
      "No lag clears the multiple-comparison threshold. Whale flow on this token does not track price in this window.",
    tone: "text-cmc-text-secondary",
  },
  "flow-leads-price": {
    label: "Flow leads price",
    detail:
      "Whale netflow correlates with returns that came after it. Suggestive of a leading signal — still not proof of causation.",
    tone: "text-cmc-green",
  },
  "price-leads-flow": {
    label: "Price leads flow",
    detail:
      "Whales moved after the price did. This is reactive behaviour and has no predictive value.",
    tone: "text-cmc-yellow",
  },
  concurrent: {
    label: "Moves together",
    detail:
      "Flow and price move in the same hour with no lead either way — consistent with both reacting to the same event.",
    tone: "text-cmc-blue",
  },
};
