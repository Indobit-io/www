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