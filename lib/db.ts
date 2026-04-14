import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Neon
    ssl: { rejectUnauthorized: false },
});

let _initialized = false;

async function init() {
    if (_initialized) return;

    await pool.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      metric_id TEXT NOT NULL,
      value DOUBLE PRECISION NOT NULL,
      source TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_metric
      ON snapshots(metric_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS signal_events (
      id SERIAL PRIMARY KEY,
      signal_id TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT,
      first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

    _initialized = true;
}

export interface Snapshot {
    id: number;
    timestamp: string;
    metric_id: string;
    value: number;
    source: string | null;
}

export interface SignalEvent {
  id: number;
  signal_id: string;
  tag: string;
  level: string;
  message: string | null;
  first_seen: string;
  last_seen: string;
}

export async function insertSnapshot(
    metricId: string,
    value: number,
    source: string
): Promise<void> {
    await init();
    await pool.query(
        "INSERT INTO snapshots (metric_id, value, source) VALUES ($1, $2, $3)",
        [metricId, value, source]
    );
}

export async function getHistory(
    metricId: string,
    limit = 52
): Promise<Snapshot[]> {
    await init();

    const result = await pool.query(
        `SELECT * FROM (
        SELECT * FROM snapshots
        WHERE metric_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      ) sub
      ORDER BY timestamp ASC`,
        [metricId, limit]
    );

    return result.rows;
}

export async function getAllLatest(): Promise<
    Record<string, { current: number; updated: string; source: string | null }>
> {
    await init();

    const result = await pool.query(`
    SELECT s.metric_id, s.value, s.timestamp, s.source
    FROM snapshots s
    INNER JOIN (
      SELECT metric_id, MAX(timestamp) AS max_ts
      FROM snapshots GROUP BY metric_id
    ) m ON s.metric_id = m.metric_id AND s.timestamp = m.max_ts
  `);

    const out: Record<
        string,
        { current: number; updated: string; source: string | null }
    > = {};

    for (const row of result.rows) {
        out[row.metric_id] = {
            current: row.value,
            updated: row.timestamp,
            source: row.source,
        };
    }

    return out;
}

export async function upsertSignalEvents(
  signals: Array<{ signal_id: string; tag: string; level: string; message: string }>
): Promise<void> {
  if (signals.length === 0) return;
  await init();
  for (const s of signals) {
    await pool.query(
      `INSERT INTO signal_events (signal_id, tag, level, message, first_seen, last_seen)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (signal_id) DO UPDATE SET
         last_seen = NOW(),
         tag = EXCLUDED.tag,
         level = EXCLUDED.level,
         message = EXCLUDED.message`,
      [s.signal_id, s.tag, s.level, s.message]
    );
  }
}

export async function clearInactiveSignals(activeIds: string[]): Promise<void> {
  await init();
  if (activeIds.length === 0) {
    await pool.query("DELETE FROM signal_events");
    return;
  }
  // Delete signals not in the active list
  const placeholders = activeIds.map((_, i) => `$${i + 1}`).join(", ");
  await pool.query(
    `DELETE FROM signal_events WHERE signal_id NOT IN (${placeholders})`,
    activeIds
  );
}

export async function getSignalEvents(): Promise<SignalEvent[]> {
  await init();
  const result = await pool.query(
    "SELECT * FROM signal_events ORDER BY first_seen ASC"
  );
  return result.rows.map((r) => ({
    id: r.id as number,
    signal_id: r.signal_id as string,
    tag: r.tag as string,
    level: r.level as string,
    message: r.message as string | null,
    first_seen: r.first_seen instanceof Date ? r.first_seen.toISOString() : r.first_seen as string,
    last_seen: r.last_seen instanceof Date ? r.last_seen.toISOString() : r.last_seen as string,
  }));
}
