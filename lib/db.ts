import { Pool, types } from "pg";

// pg returns BIGINT (OID 20) and NUMERIC (OID 1700) as strings by default.
types.setTypeParser(20, Number);    // BIGINT → number
types.setTypeParser(1700, Number);  // NUMERIC → number

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

let _initialized = false;

async function init() {
  if (_initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      asset TEXT NOT NULL DEFAULT 'XRP',
      xrp_qty NUMERIC NOT NULL,
      buy_price_idr NUMERIC NOT NULL,
      total_batches INTEGER NOT NULL DEFAULT 6,
      start_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
      batch_number INTEGER NOT NULL,
      sale_date DATE NOT NULL,
      sell_price_idr NUMERIC NOT NULL,
      xrp_qty_sold NUMERIC NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(position_id, batch_number)
    );
  `);
  _initialized = true;
}

export interface Position {
  id: number;
  name: string;
  asset: string;
  xrp_qty: number;
  buy_price_idr: number;
  total_batches: number;
  start_date: string;
  notes: string | null;
  created_at: string;
}

export interface Sale {
  id: number;
  position_id: number;
  batch_number: number;
  sale_date: string;
  sell_price_idr: number;
  xrp_qty_sold: number;
  notes: string | null;
  created_at: string;
}

export async function getPositions(): Promise<Position[]> {
  await init();
  const r = await pool.query("SELECT * FROM positions ORDER BY start_date DESC");
  return r.rows;
}

export async function getPosition(id: number): Promise<Position | null> {
  await init();
  const r = await pool.query("SELECT * FROM positions WHERE id = $1", [id]);
  return r.rows[0] ?? null;
}

export async function createPosition(data: Omit<Position, "id" | "created_at">): Promise<Position> {
  await init();
  const r = await pool.query(
    `INSERT INTO positions
       (name, asset, xrp_qty, buy_price_idr, total_batches, start_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      data.name, data.asset, data.xrp_qty, data.buy_price_idr,
      data.total_batches, data.start_date, data.notes,
    ]
  );
  return r.rows[0];
}

export async function updatePosition(
  id: number,
  data: Partial<Omit<Position, "id" | "created_at">>
): Promise<Position | null> {
  await init();
  const fields = Object.keys(data);
  if (!fields.length) return getPosition(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const r = await pool.query(
    `UPDATE positions SET ${sets} WHERE id = $1 RETURNING *`,
    [id, ...fields.map((f) => (data as Record<string, unknown>)[f])]
  );
  return r.rows[0] ?? null;
}

export async function deletePosition(id: number): Promise<void> {
  await init();
  await pool.query("DELETE FROM positions WHERE id = $1", [id]);
}

export async function getSales(positionId: number): Promise<Sale[]> {
  await init();
  const r = await pool.query(
    "SELECT * FROM sales WHERE position_id = $1 ORDER BY batch_number ASC",
    [positionId]
  );
  return r.rows;
}

export async function upsertSale(
  positionId: number,
  data: Pick<Sale, "batch_number" | "sale_date" | "sell_price_idr" | "xrp_qty_sold" | "notes">
): Promise<Sale> {
  await init();
  const r = await pool.query(
    `INSERT INTO sales (position_id, batch_number, sale_date, sell_price_idr, xrp_qty_sold, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (position_id, batch_number) DO UPDATE SET
       sale_date = EXCLUDED.sale_date,
       sell_price_idr = EXCLUDED.sell_price_idr,
       xrp_qty_sold = EXCLUDED.xrp_qty_sold,
       notes = EXCLUDED.notes
     RETURNING *`,
    [positionId, data.batch_number, data.sale_date, data.sell_price_idr, data.xrp_qty_sold, data.notes]
  );
  return r.rows[0];
}

export async function deleteSale(positionId: number, batchNumber: number): Promise<void> {
  await init();
  await pool.query(
    "DELETE FROM sales WHERE position_id = $1 AND batch_number = $2",
    [positionId, batchNumber]
  );
}
