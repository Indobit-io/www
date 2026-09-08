import { Pool, types } from "pg";

// pg hands back BIGINT (OID 20) and NUMERIC (OID 1700) as strings by default.
types.setTypeParser(20, Number);
types.setTypeParser(1700, Number);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX ?? 5),
});

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** How many addresses the whale registry keeps. */
export const WHALE_COUNT = Number(process.env.WHALE_COUNT ?? 500);

let initialized: Promise<void> | null = null;

export function init(): Promise<void> {
  if (!initialized) initialized = runInit();
  return initialized;
}

async function runInit(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tokens (
      id             SERIAL PRIMARY KEY,
      chain_id       INTEGER NOT NULL,
      contract       TEXT NOT NULL,
      symbol         TEXT NOT NULL,
      name           TEXT NOT NULL,
      coingecko_id   TEXT NOT NULL,
      decimals       INTEGER NOT NULL DEFAULT 18,
      market_cap_usd NUMERIC,
      market_rank    INTEGER,
      price_usd      NUMERIC,
      price_change_24h NUMERIC,
      tracked        BOOLEAN NOT NULL DEFAULT TRUE,
      last_block     BIGINT,
      last_ingest_at TIMESTAMPTZ,
      last_priced_at TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (chain_id, contract)
    );

    CREATE TABLE IF NOT EXISTS whales (
      address            TEXT PRIMARY KEY,
      chain_id           INTEGER NOT NULL DEFAULT 1,
      label              TEXT,
      kind               TEXT NOT NULL DEFAULT 'unknown',
      is_contract        BOOLEAN,
      volume_usd         NUMERIC NOT NULL DEFAULT 0,
      inflow_usd         NUMERIC NOT NULL DEFAULT 0,
      outflow_usd        NUMERIC NOT NULL DEFAULT 0,
      transfer_count     INTEGER NOT NULL DEFAULT 0,
      counterparty_count INTEGER NOT NULL DEFAULT 0,
      token_count        INTEGER NOT NULL DEFAULT 0,
      rank               INTEGER,
      in_top             BOOLEAN NOT NULL DEFAULT FALSE,
      first_seen         TIMESTAMPTZ,
      last_seen          TIMESTAMPTZ,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id           BIGSERIAL PRIMARY KEY,
      chain_id     INTEGER NOT NULL,
      token_id     INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
      block_number BIGINT NOT NULL,
      block_time   TIMESTAMPTZ NOT NULL,
      tx_hash      TEXT NOT NULL,
      log_index    INTEGER NOT NULL,
      from_addr    TEXT NOT NULL,
      to_addr      TEXT NOT NULL,
      qty          NUMERIC NOT NULL,
      usd_value    NUMERIC NOT NULL,
      UNIQUE (chain_id, tx_hash, log_index)
    );

    CREATE TABLE IF NOT EXISTS price_points (
      token_id  INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
      ts        TIMESTAMPTZ NOT NULL,
      price_usd NUMERIC NOT NULL,
      PRIMARY KEY (token_id, ts)
    );

    CREATE TABLE IF NOT EXISTS ingest_runs (
      id          SERIAL PRIMARY KEY,
      kind        TEXT NOT NULL,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      ok          BOOLEAN,
      detail      JSONB,
      error       TEXT
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    ALTER TABLE tokens ADD COLUMN IF NOT EXISTS last_priced_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS transfers_token_time ON transfers (token_id, block_time DESC);
    CREATE INDEX IF NOT EXISTS transfers_time       ON transfers (block_time DESC);
    CREATE INDEX IF NOT EXISTS transfers_from       ON transfers (from_addr, block_time DESC);
    CREATE INDEX IF NOT EXISTS transfers_to         ON transfers (to_addr, block_time DESC);
    CREATE INDEX IF NOT EXISTS transfers_usd        ON transfers (usd_value DESC);
    CREATE INDEX IF NOT EXISTS whales_rank          ON whales (rank) WHERE in_top;
    CREATE INDEX IF NOT EXISTS tokens_tracked       ON tokens (tracked, market_rank);
  `);
}

// --- Meta ----------------------------------------------------------------

/**
 * Set by the demo seeder. The UI reads it to banner every page, so synthetic
 * data can never be mistaken for a real on-chain finding.
 */
export async function isDemoData(): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'demo_data'`
    );
    return rows[0]?.value === "true";
  } catch {
    return false;
  }
}

// --- Types ---------------------------------------------------------------

export interface Token {
  id: number;
  chain_id: number;
  contract: string;
  symbol: string;
  name: string;
  coingecko_id: string;
  decimals: number;
  market_cap_usd: number | null;
  market_rank: number | null;
  price_usd: number | null;
  price_change_24h: number | null;
  tracked: boolean;
  last_block: number | null;
  last_ingest_at: string | null;
  last_priced_at: string | null;
}

export type WhaleKind = "unknown" | "hub" | "contract" | "wallet";

export interface Whale {
  address: string;
  chain_id: number;
  label: string | null;
  kind: WhaleKind;
  is_contract: boolean | null;
  volume_usd: number;
  inflow_usd: number;
  outflow_usd: number;
  transfer_count: number;
  counterparty_count: number;
  token_count: number;
  rank: number | null;
  in_top: boolean;
  first_seen: string | null;
  last_seen: string | null;
}

export interface Transfer {
  id: number;
  chain_id: number;
  token_id: number;
  block_number: number;
  block_time: string;
  tx_hash: string;
  log_index: number;
  from_addr: string;
  to_addr: string;
  qty: number;
  usd_value: number;
}

// --- Tokens --------------------------------------------------------------

export async function upsertToken(t: {
  chain_id: number;
  contract: string;
  symbol: string;
  name: string;
  coingecko_id: string;
  decimals: number;
  market_cap_usd: number | null;
  market_rank: number | null;
  price_usd: number | null;
  price_change_24h: number | null;
}): Promise<Token> {
  const { rows } = await pool.query<Token>(
    `INSERT INTO tokens (chain_id, contract, symbol, name, coingecko_id, decimals,
                         market_cap_usd, market_rank, price_usd, price_change_24h)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (chain_id, contract) DO UPDATE SET
       symbol = EXCLUDED.symbol,
       name = EXCLUDED.name,
       coingecko_id = EXCLUDED.coingecko_id,
       market_cap_usd = EXCLUDED.market_cap_usd,
       market_rank = EXCLUDED.market_rank,
       price_usd = EXCLUDED.price_usd,
       price_change_24h = EXCLUDED.price_change_24h
     RETURNING *`,
    [
      t.chain_id,
      t.contract,
      t.symbol,
      t.name,
      t.coingecko_id,
      t.decimals,
      t.market_cap_usd,
      t.market_rank,
      t.price_usd,
      t.price_change_24h,
    ]
  );
  return rows[0];
}

export async function listTokens(opts: { trackedOnly?: boolean } = {}): Promise<Token[]> {
  const { rows } = await pool.query<Token>(
    `SELECT * FROM tokens
     ${opts.trackedOnly ? "WHERE tracked" : ""}
     ORDER BY market_rank NULLS LAST, symbol`
  );
  return rows;
}

export async function tokenBySymbol(symbol: string): Promise<Token | null> {
  const { rows } = await pool.query<Token>(
    `SELECT * FROM tokens WHERE UPPER(symbol) = UPPER($1)
     ORDER BY market_rank NULLS LAST LIMIT 1`,
    [symbol]
  );
  return rows[0] ?? null;
}

export async function setTokenCursor(id: number, lastBlock: number): Promise<void> {
  await pool.query(
    `UPDATE tokens SET last_block = $2, last_ingest_at = NOW() WHERE id = $1`,
    [id, lastBlock]
  );
}

/** Keeps the tracked set to the top N by market cap that we can actually index. */
export async function retrackTopTokens(limit: number): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE tokens SET tracked = (id IN (
       SELECT id FROM tokens ORDER BY market_rank NULLS LAST, market_cap_usd DESC NULLS LAST LIMIT $1
     ))`,
    [limit]
  );
  return rowCount ?? 0;
}

/**
 * Tracked tokens ordered least-recently-priced first. The price sync runs under
 * a wall-clock budget, so a fixed order would price the same head every run and
 * starve the tail forever; rotating means every token gets its turn.
 */
export async function tokensByPriceStaleness(): Promise<Token[]> {
  const { rows } = await pool.query<Token>(
    `SELECT * FROM tokens WHERE tracked
     ORDER BY last_priced_at ASC NULLS FIRST, market_rank NULLS LAST`
  );
  return rows;
}

export async function setTokenPriced(id: number): Promise<void> {
  await pool.query(`UPDATE tokens SET last_priced_at = NOW() WHERE id = $1`, [id]);
}

/** Newest stored price point per token, in one query rather than N. */
export async function newestPricePointByToken(): Promise<Map<number, Date>> {
  const { rows } = await pool.query<{ token_id: number; newest: string }>(
    `SELECT token_id, MAX(ts) AS newest FROM price_points GROUP BY token_id`
  );
  return new Map(rows.map((r) => [r.token_id, new Date(r.newest)]));
}

// --- Transfers -----------------------------------------------------------

export async function insertTransfers(rows: Omit<Transfer, "id">[]): Promise<number> {
  if (!rows.length) return 0;

  // Batched multi-row insert; ON CONFLICT makes re-ingesting a block range safe.
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((r, j) => {
      const b = j * 10;
      values.push(
        r.chain_id,
        r.token_id,
        r.block_number,
        r.block_time,
        r.tx_hash,
        r.log_index,
        r.from_addr,
        r.to_addr,
        r.qty,
        r.usd_value
      );
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10})`;
    });
    const res = await pool.query(
      `INSERT INTO transfers (chain_id, token_id, block_number, block_time, tx_hash,
                              log_index, from_addr, to_addr, qty, usd_value)
       VALUES ${tuples.join(",")}
       ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING`,
      values
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

export interface TransferRow extends Transfer {
  symbol: string;
  token_name: string;
  from_label: string | null;
  to_label: string | null;
  from_is_whale: boolean;
  to_is_whale: boolean;
}

export async function recentTransfers(opts: {
  limit?: number;
  tokenId?: number;
  address?: string;
  minUsd?: number;
  whalesOnly?: boolean;
}): Promise<TransferRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.tokenId) {
    params.push(opts.tokenId);
    where.push(`t.token_id = $${params.length}`);
  }
  if (opts.address) {
    params.push(opts.address.toLowerCase());
    where.push(`(t.from_addr = $${params.length} OR t.to_addr = $${params.length})`);
  }
  if (opts.minUsd) {
    params.push(opts.minUsd);
    where.push(`t.usd_value >= $${params.length}`);
  }
  if (opts.whalesOnly) {
    where.push(`(wf.address IS NOT NULL OR wt.address IS NOT NULL)`);
  }
  params.push(Math.min(opts.limit ?? 100, 500));

  const { rows } = await pool.query<TransferRow>(
    `SELECT t.*, tk.symbol, tk.name AS token_name,
            wf.label AS from_label, wt.label AS to_label,
            (wf.address IS NOT NULL) AS from_is_whale,
            (wt.address IS NOT NULL) AS to_is_whale
     FROM transfers t
     JOIN tokens tk ON tk.id = t.token_id
     LEFT JOIN whales wf ON wf.address = t.from_addr AND wf.in_top
     LEFT JOIN whales wt ON wt.address = t.to_addr AND wt.in_top
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY t.block_time DESC, t.usd_value DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

// --- Whales --------------------------------------------------------------

/**
 * Rebuilds the whale registry from observed flow. Whales are defined by
 * behaviour over the trailing window, not by a hand-curated address list:
 * the top N addresses by USD moved become the tracked set. Runs in one
 * transaction so readers never see a half-rebuilt registry.
 */
export async function rebuildWhales(windowDays: number, limit: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Materialise the new top set first, so demotion can be an exact set
    // difference rather than a guess based on update timestamps.
    await client.query(
      `CREATE TEMP TABLE _new_whales ON COMMIT DROP AS
       WITH legs AS (
         SELECT t.to_addr   AS address, t.from_addr AS counterparty, t.token_id,
                t.usd_value AS usd, t.usd_value AS inflow, 0::numeric AS outflow, t.block_time
         FROM transfers t WHERE t.block_time >= NOW() - ($1 || ' days')::interval
         UNION ALL
         SELECT t.from_addr, t.to_addr, t.token_id,
                t.usd_value, 0::numeric, t.usd_value, t.block_time
         FROM transfers t WHERE t.block_time >= NOW() - ($1 || ' days')::interval
       ),
       agg AS (
         SELECT address,
                SUM(usd)                          AS volume_usd,
                SUM(inflow)                       AS inflow_usd,
                SUM(outflow)                      AS outflow_usd,
                COUNT(*)::int                     AS transfer_count,
                COUNT(DISTINCT counterparty)::int AS counterparty_count,
                COUNT(DISTINCT token_id)::int     AS token_count,
                MIN(block_time)                   AS first_seen,
                MAX(block_time)                   AS last_seen
         FROM legs
         WHERE address NOT IN ('0x0000000000000000000000000000000000000000',
                               '0x000000000000000000000000000000000000dead')
           AND address NOT IN (SELECT contract FROM tokens)
         GROUP BY address
       )
       SELECT *, ROW_NUMBER() OVER (ORDER BY volume_usd DESC, address)::int AS rank
       FROM agg
       ORDER BY volume_usd DESC
       LIMIT $2`,
      [windowDays, limit]
    );

    await client.query(
      `INSERT INTO whales (address, volume_usd, inflow_usd, outflow_usd, transfer_count,
                           counterparty_count, token_count, first_seen, last_seen,
                           rank, in_top, updated_at)
       SELECT address, volume_usd, inflow_usd, outflow_usd, transfer_count,
              counterparty_count, token_count, first_seen, last_seen,
              rank, TRUE, NOW()
       FROM _new_whales
       ON CONFLICT (address) DO UPDATE SET
         volume_usd = EXCLUDED.volume_usd,
         inflow_usd = EXCLUDED.inflow_usd,
         outflow_usd = EXCLUDED.outflow_usd,
         transfer_count = EXCLUDED.transfer_count,
         counterparty_count = EXCLUDED.counterparty_count,
         token_count = EXCLUDED.token_count,
         first_seen = LEAST(whales.first_seen, EXCLUDED.first_seen),
         last_seen = EXCLUDED.last_seen,
         rank = EXCLUDED.rank,
         in_top = TRUE,
         updated_at = NOW()`
    );

    // Anything that was in the set and is not in the new one drops out. Its
    // history and any manual label are kept.
    await client.query(
      `UPDATE whales SET in_top = FALSE, rank = NULL
       WHERE in_top AND address NOT IN (SELECT address FROM _new_whales)`
    );

    // A "hub" churns huge counts across huge numbers of counterparties:
    // exchange hot wallets, bridges, routers. Their flow means roughly the
    // opposite of a private whale's, so the UI can separate them. This is a
    // threshold on observed behaviour, not a verified identity.
    await client.query(
      `UPDATE whales SET kind = CASE
         WHEN transfer_count >= 500 AND counterparty_count >= 250 THEN 'hub'
         WHEN is_contract IS TRUE THEN 'contract'
         WHEN is_contract IS FALSE THEN 'wallet'
         ELSE 'unknown' END
       WHERE in_top`
    );

    const { rows } = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM whales WHERE in_top`
    );
    await client.query("COMMIT");
    return rows[0]?.count ?? 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function whalesNeedingCodeCheck(limit: number): Promise<string[]> {
  const { rows } = await pool.query<{ address: string }>(
    `SELECT address FROM whales WHERE in_top AND is_contract IS NULL
     ORDER BY rank LIMIT $1`,
    [limit]
  );
  return rows.map((r) => r.address);
}

export async function setWhaleIsContract(address: string, isContract: boolean): Promise<void> {
  await pool.query(`UPDATE whales SET is_contract = $2 WHERE address = $1`, [address, isContract]);
}

export async function listWhales(opts: {
  limit?: number;
  offset?: number;
  kind?: string;
  search?: string;
}): Promise<{ rows: Whale[]; total: number }> {
  const where = ["in_top"];
  const params: unknown[] = [];

  if (opts.kind && opts.kind !== "all") {
    params.push(opts.kind);
    where.push(`kind = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    where.push(`(address LIKE $${params.length} OR LOWER(COALESCE(label,'')) LIKE $${params.length})`);
  }

  const clause = `WHERE ${where.join(" AND ")}`;
  const { rows: countRows } = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM whales ${clause}`,
    params
  );

  params.push(Math.min(opts.limit ?? 100, 500));
  params.push(opts.offset ?? 0);
  const { rows } = await pool.query<Whale>(
    `SELECT * FROM whales ${clause} ORDER BY rank
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function getWhale(address: string): Promise<Whale | null> {
  const { rows } = await pool.query<Whale>(`SELECT * FROM whales WHERE address = $1`, [
    address.toLowerCase(),
  ]);
  return rows[0] ?? null;
}

export async function setWhaleLabel(address: string, label: string | null): Promise<void> {
  await pool.query(`UPDATE whales SET label = $2 WHERE address = $1`, [
    address.toLowerCase(),
    label,
  ]);
}

export interface WhaleTokenPosition {
  token_id: number;
  symbol: string;
  name: string;
  inflow_usd: number;
  outflow_usd: number;
  net_usd: number;
  transfer_count: number;
  last_seen: string;
}

export async function whaleTokenBreakdown(
  address: string,
  windowDays: number
): Promise<WhaleTokenPosition[]> {
  const { rows } = await pool.query<WhaleTokenPosition>(
    `SELECT tk.id AS token_id, tk.symbol, tk.name,
            SUM(CASE WHEN t.to_addr   = $1 THEN t.usd_value ELSE 0 END) AS inflow_usd,
            SUM(CASE WHEN t.from_addr = $1 THEN t.usd_value ELSE 0 END) AS outflow_usd,
            SUM(CASE WHEN t.to_addr   = $1 THEN t.usd_value ELSE -t.usd_value END) AS net_usd,
            COUNT(*)::int AS transfer_count,
            MAX(t.block_time) AS last_seen
     FROM transfers t
     JOIN tokens tk ON tk.id = t.token_id
     WHERE (t.from_addr = $1 OR t.to_addr = $1)
       AND t.block_time >= NOW() - ($2 || ' days')::interval
     GROUP BY tk.id, tk.symbol, tk.name
     ORDER BY ABS(SUM(CASE WHEN t.to_addr = $1 THEN t.usd_value ELSE -t.usd_value END)) DESC`,
    [address.toLowerCase(), windowDays]
  );
  return rows;
}

// --- Prices --------------------------------------------------------------

export async function upsertPricePoints(
  tokenId: number,
  points: { ts: Date; price: number }[]
): Promise<number> {
  if (!points.length) return 0;
  const CHUNK = 500;
  let n = 0;
  for (let i = 0; i < points.length; i += CHUNK) {
    const chunk = points.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((p, j) => {
      values.push(tokenId, p.ts, p.price);
      return `($${j * 3 + 1},$${j * 3 + 2},$${j * 3 + 3})`;
    });
    const res = await pool.query(
      `INSERT INTO price_points (token_id, ts, price_usd) VALUES ${tuples.join(",")}
       ON CONFLICT (token_id, ts) DO UPDATE SET price_usd = EXCLUDED.price_usd`,
      values
    );
    n += res.rowCount ?? 0;
  }
  return n;
}

export async function priceSeries(
  tokenId: number,
  sinceDays: number
): Promise<{ ts: string; price_usd: number }[]> {
  const { rows } = await pool.query<{ ts: string; price_usd: number }>(
    `SELECT ts, price_usd FROM price_points
     WHERE token_id = $1 AND ts >= NOW() - ($2 || ' days')::interval
     ORDER BY ts`,
    [tokenId, sinceDays]
  );
  return rows;
}

/** Prices for pricing transfers at ingest time, oldest first. */
export async function priceLookupSeries(
  tokenId: number,
  sinceDays: number
): Promise<{ t: number; price: number }[]> {
  const rows = await priceSeries(tokenId, sinceDays);
  return rows.map((r) => ({ t: new Date(r.ts).getTime(), price: Number(r.price_usd) }));
}

// --- Run log -------------------------------------------------------------

export async function startRun(kind: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO ingest_runs (kind) VALUES ($1) RETURNING id`,
    [kind]
  );
  return rows[0].id;
}

export async function finishRun(
  id: number,
  ok: boolean,
  detail: unknown,
  error?: string
): Promise<void> {
  await pool.query(
    `UPDATE ingest_runs SET finished_at = NOW(), ok = $2, detail = $3, error = $4 WHERE id = $1`,
    [id, ok, JSON.stringify(detail ?? {}), error ?? null]
  );
}

export interface RunRow {
  id: number;
  kind: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  detail: Record<string, unknown> | null;
  error: string | null;
}

export async function recentRuns(limit = 20): Promise<RunRow[]> {
  const { rows } = await pool.query<RunRow>(
    `SELECT * FROM ingest_runs ORDER BY started_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export interface PipelineStats {
  tokens: number;
  tracked_tokens: number;
  whales: number;
  transfers: number;
  transfers_24h: number;
  price_points: number;
  earliest_transfer: string | null;
  latest_transfer: string | null;
}

export async function pipelineStats(): Promise<PipelineStats> {
  const { rows } = await pool.query<PipelineStats>(`
    SELECT
      (SELECT COUNT(*)::int FROM tokens) AS tokens,
      (SELECT COUNT(*)::int FROM tokens WHERE tracked) AS tracked_tokens,
      (SELECT COUNT(*)::int FROM whales WHERE in_top) AS whales,
      (SELECT COUNT(*)::int FROM transfers) AS transfers,
      (SELECT COUNT(*)::int FROM transfers WHERE block_time >= NOW() - INTERVAL '24 hours') AS transfers_24h,
      (SELECT COUNT(*)::int FROM price_points) AS price_points,
      (SELECT MIN(block_time) FROM transfers) AS earliest_transfer,
      (SELECT MAX(block_time) FROM transfers) AS latest_transfer
  `);
  return rows[0];
}
