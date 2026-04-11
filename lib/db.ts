import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Use /tmp for Vercel (read-only FS except /tmp), local data/ dir otherwise
const DB_PATH =
  process.env.NODE_ENV === "production"
    ? "/tmp/liquidity.db"
    : path.join(process.cwd(), "data", "liquidity.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure directory exists (local dev)
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create schema
  db.exec(`
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

  return db;
}

export interface Snapshot {
  id: number;
  timestamp: string;
  metric_id: string;
  value: number;
  source: string | null;
}

export function insertSnapshot(
  metricId: string,
  value: number,
  source: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO snapshots (metric_id, value, source) VALUES (?, ?, ?)`
  ).run(metricId, value, source);
}

export function getLatest(metricId: string): Snapshot | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM snapshots WHERE metric_id = ? ORDER BY timestamp DESC LIMIT 1`
    )
    .get(metricId) as Snapshot | undefined;
}

export function getHistory(metricId: string, limit = 52): Snapshot[] {
  const db = getDb();
  // Get latest N points ordered ascending for charting
  const rows = db
    .prepare(
      `SELECT * FROM (
        SELECT * FROM snapshots WHERE metric_id = ? ORDER BY timestamp DESC LIMIT ?
      ) ORDER BY timestamp ASC`
    )
    .all(metricId, limit) as Snapshot[];
  return rows;
}

export function getAllLatest(): Record<
  string,
  { current: number; updated: string; source: string | null }
> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.metric_id, s.value, s.timestamp, s.source
       FROM snapshots s
       INNER JOIN (
         SELECT metric_id, MAX(timestamp) AS max_ts
         FROM snapshots GROUP BY metric_id
       ) m ON s.metric_id = m.metric_id AND s.timestamp = m.max_ts`
    )
    .all() as Snapshot[];

  const result: Record<
    string,
    { current: number; updated: string; source: string | null }
  > = {};
  for (const row of rows) {
    result[row.metric_id] = {
      current: row.value,
      updated: row.timestamp,
      source: row.source,
    };
  }
  return result;
}
