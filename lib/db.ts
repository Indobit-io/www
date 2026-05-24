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
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      asset TEXT NOT NULL DEFAULT 'XRP',
      principal_idr BIGINT NOT NULL,
      monthly_interest_rate NUMERIC NOT NULL DEFAULT 0.02,
      term_months INTEGER NOT NULL,
      start_date DATE NOT NULL,
      xrp_qty NUMERIC NOT NULL DEFAULT 0,
      xrp_buy_price_idr NUMERIC,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS monthly_entries (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      month_number INTEGER NOT NULL,
      entry_date DATE NOT NULL,
      xrp_price_idr NUMERIC NOT NULL,
      xrp_qty_held NUMERIC NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(loan_id, month_number)
    );
  `);
  _initialized = true;
}

export interface Loan {
  id: number;
  name: string;
  asset: string;
  principal_idr: number;
  monthly_interest_rate: number;
  term_months: number;
  start_date: string;
  xrp_qty: number;
  xrp_buy_price_idr: number | null;
  notes: string | null;
  created_at: string;
}

export interface MonthlyEntry {
  id: number;
  loan_id: number;
  month_number: number;
  entry_date: string;
  xrp_price_idr: number;
  xrp_qty_held: number;
  notes: string | null;
  created_at: string;
}

export async function getLoans(): Promise<Loan[]> {
  await init();
  const r = await pool.query("SELECT * FROM loans ORDER BY start_date DESC");
  return r.rows;
}

export async function getLoan(id: number): Promise<Loan | null> {
  await init();
  const r = await pool.query("SELECT * FROM loans WHERE id = $1", [id]);
  return r.rows[0] ?? null;
}

export async function createLoan(data: Omit<Loan, "id" | "created_at">): Promise<Loan> {
  await init();
  const r = await pool.query(
    `INSERT INTO loans
       (name, asset, principal_idr, monthly_interest_rate, term_months, start_date, xrp_qty, xrp_buy_price_idr, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      data.name, data.asset, data.principal_idr, data.monthly_interest_rate,
      data.term_months, data.start_date, data.xrp_qty, data.xrp_buy_price_idr, data.notes,
    ]
  );
  return r.rows[0];
}

export async function updateLoan(id: number, data: Partial<Omit<Loan, "id" | "created_at">>): Promise<Loan | null> {
  await init();
  const fields = Object.keys(data);
  if (!fields.length) return getLoan(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const r = await pool.query(
    `UPDATE loans SET ${sets} WHERE id = $1 RETURNING *`,
    [id, ...fields.map((f) => (data as Record<string, unknown>)[f])]
  );
  return r.rows[0] ?? null;
}

export async function deleteLoan(id: number): Promise<void> {
  await init();
  await pool.query("DELETE FROM loans WHERE id = $1", [id]);
}

export async function getEntries(loanId: number): Promise<MonthlyEntry[]> {
  await init();
  const r = await pool.query(
    "SELECT * FROM monthly_entries WHERE loan_id = $1 ORDER BY month_number ASC",
    [loanId]
  );
  return r.rows;
}

export async function upsertEntry(
  loanId: number,
  data: Pick<MonthlyEntry, "month_number" | "entry_date" | "xrp_price_idr" | "xrp_qty_held" | "notes">
): Promise<MonthlyEntry> {
  await init();
  const r = await pool.query(
    `INSERT INTO monthly_entries (loan_id, month_number, entry_date, xrp_price_idr, xrp_qty_held, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (loan_id, month_number) DO UPDATE SET
       entry_date = EXCLUDED.entry_date,
       xrp_price_idr = EXCLUDED.xrp_price_idr,
       xrp_qty_held = EXCLUDED.xrp_qty_held,
       notes = EXCLUDED.notes
     RETURNING *`,
    [loanId, data.month_number, data.entry_date, data.xrp_price_idr, data.xrp_qty_held, data.notes]
  );
  return r.rows[0];
}

export async function deleteEntry(loanId: number, monthNumber: number): Promise<void> {
  await init();
  await pool.query(
    "DELETE FROM monthly_entries WHERE loan_id = $1 AND month_number = $2",
    [loanId, monthNumber]
  );
}
