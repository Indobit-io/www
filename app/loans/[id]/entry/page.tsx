"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Loan {
  id: number;
  name: string;
  principal_idr: number;
  term_months: number;
  start_date: string;
  xrp_qty: number;
}

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loanId, setLoanId] = useState<string | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    month_number: searchParams.get("month") ?? "1",
    entry_date: new Date().toISOString().slice(0, 10),
    xrp_price_idr: "",
    xrp_qty_held: "",
    notes: "",
  });

  useEffect(() => {
    params.then(({ id }) => {
      setLoanId(id);
      fetch(`/api/loans/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setLoan(data);
          if (!form.xrp_qty_held) {
            setForm((f) => ({ ...f, xrp_qty_held: String(data.xrp_qty ?? "") }));
          }
        });
    });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function fetchPrice() {
    setFetchingPrice(true);
    try {
      const res = await fetch("/api/xrp-price");
      const data = await res.json();
      set("xrp_price_idr", String(Math.round(data.idr)));
    } catch {
      setError("Gagal ambil harga. Isi manual.");
    } finally {
      setFetchingPrice(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loanId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/loans/${loanId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          month_number: Number(form.month_number),
          xrp_price_idr: Number(form.xrp_price_idr.replace(/\D/g, "")),
          xrp_qty_held: Number(form.xrp_qty_held),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan");
      }
      router.push(`/loans/${loanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  }

  const portfolioValue =
    form.xrp_price_idr && form.xrp_qty_held
      ? Number(form.xrp_price_idr.replace(/\D/g, "")) * Number(form.xrp_qty_held)
      : null;

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <a
            href={loanId ? `/loans/${loanId}` : "/"}
            className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors"
          >
            ← Kembali
          </a>
          <span className="text-cmc-border">|</span>
          <h1 className="text-sm font-semibold text-cmc-text">
            Catat Bulan {form.month_number}{loan ? ` — ${loan.name}` : ""}
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="border border-cmc-red/30 bg-cmc-red/10 text-cmc-red text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted">
              Data Bulan Ini
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-cmc-text-muted block">Nomor Bulan</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={loan?.term_months ?? 360}
                  value={form.month_number}
                  onChange={(e) => set("month_number", e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-cmc-text-muted block">Tanggal Catat</label>
                <input
                  type="date"
                  required
                  value={form.entry_date}
                  onChange={(e) => set("entry_date", e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-cmc-text-muted block">Harga XRP/IDR</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={form.xrp_price_idr}
                  onChange={(e) => set("xrp_price_idr", e.target.value)}
                  placeholder="misal: 15000"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={fetchPrice}
                  disabled={fetchingPrice}
                  className="text-xs font-semibold px-3 bg-cmc-blue/20 border border-cmc-blue/30 text-cmc-blue hover:bg-cmc-blue hover:text-white rounded-lg transition-colors flex-shrink-0"
                >
                  {fetchingPrice ? "..." : "↻ Live"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-cmc-text-muted block">
                Jumlah XRP Dipegang
              </label>
              <input
                type="number"
                step="any"
                min={0}
                required
                value={form.xrp_qty_held}
                onChange={(e) => set("xrp_qty_held", e.target.value)}
                placeholder={loan ? String(loan.xrp_qty) : "5000"}
                className="input-field"
              />
              <p className="text-xs text-cmc-text-muted">
                Ubah jika ada pembelian/penjualan tambahan bulan ini
              </p>
            </div>
          </div>

          {/* Live preview */}
          {portfolioValue != null && loan && (
            <div className="bg-cmc-surface border border-cmc-blue/20 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-blue mb-4">
                Preview Bulan {form.month_number}
              </div>
              {(() => {
                const monthlyCapital = Math.round(loan.principal_idr / loan.term_months);
                const monthlyInterest = Math.round(loan.principal_idr * 0.02);
                const cumulativePaid = (monthlyCapital + monthlyInterest) * Number(form.month_number);
                const remainingPrincipal = Math.max(0, loan.principal_idr - monthlyCapital * Number(form.month_number));
                const netPnl = portfolioValue - cumulativePaid;
                const netPos = portfolioValue - remainingPrincipal;

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Nilai Portfolio", value: `Rp ${portfolioValue.toLocaleString("id-ID")}`, color: "text-cmc-green" },
                      { label: "Sisa Hutang", value: `Rp ${remainingPrincipal.toLocaleString("id-ID")}`, color: "text-cmc-text-secondary" },
                      { label: "Net P&L", value: `Rp ${netPnl.toLocaleString("id-ID")}`, color: netPnl >= 0 ? "text-cmc-green" : "text-cmc-red" },
                      { label: "Posisi vs Hutang", value: `Rp ${netPos.toLocaleString("id-ID")}`, color: netPos >= 0 ? "text-cmc-green" : "text-cmc-red" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="text-xs text-cmc-text-muted mb-0.5">{label}</div>
                        <div className={`text-sm font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-cmc-text-muted block">Catatan (opsional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Kondisi pasar, alasan beli/jual, dll..."
              className="input-field resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full text-sm font-semibold py-3 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Data Bulan Ini"}
          </button>
        </form>
      </div>
    </main>
  );
}
