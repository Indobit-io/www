import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";

const DB_PATH =
  process.env.NODE_ENV === "production"
    ? "/tmp/liquidity.db"
    : path.join(process.cwd(), "data", "liquidity.db");

let _client: Client | null = null;
let _initialized = false;

async function getClient(): Promise<Client> {
  if (!_client) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _client = createClient({ url: `file:${DB_PATH}` });
  }

  if (!_initialized) {
    await _client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        metric_id TEXT NOT NULL,
        value REAL NOT NULL,
        source TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_metric
        ON snapshots(metric_id, timestamp DESC);
    `);
    _initialized = true;
  }

  return _client;
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
  const db = await getClient();
  await db.execute({
    sql: "INSERT INTO snapshots (metric_id, value, source) VALUES (?, ?, ?)",
    args: [metricId, value, source],
  });
}

export async function getHistory(
  metricId: string,
  limit = 52
): Promise<Snapshot[]> {
  const db = await getClient();
  const result = await db.execute({
    sql: `SELECT * FROM (
            SELECT * FROM snapshots WHERE metric_id = ? ORDER BY timestamp DESC LIMIT ?
          ) ORDER BY timestamp ASC`,
    args: [metricId, limit],
  });
  return result.rows.map((r) => ({
    id: r.id as number,
    timestamp: r.timestamp as string,
    metric_id: r.metric_id as string,
    value: r.value as number,
    source: r.source as string | null,
  }));
}

export async function getAllLatest(): Promise<
  Record<string, { current: number; updated: string; source: string | null }>
> {
  const db = await getClient();
  const result = await db.execute(`
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
    out[row.metric_id as string] = {
      current: row.value as number,
      updated: row.timestamp as string,
      source: row.source as string | null,
    };
  }
  return out;
}
