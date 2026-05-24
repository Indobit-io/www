"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLoanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [form, setForm] = useState({
    name: "",
    principal_idr: "",
    term_months: "12",
    start_date: new Date().toISOString().slice(0, 10),
    xrp_qty: "",
    xrp_buy_price_idr: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function fetchCurrentPrice() {
    setFetchingPrice(true);
    try {
      const res = await fetch("/api/xrp-price");
      const data = await res.json();
      set("xrp_buy_price_idr", String(Math.round(data.idr)));
    } catch {
      setError("Gagal ambil harga XRP. Isi manual.");
    } finally {
      setFetchingPrice(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          principal_idr: Number(form.principal_idr.replace(/\D/g, "")),
          term_months: Number(form.term_months),
          xrp_qty: Number(form.xrp_qty),
          xrp_buy_price_idr: form.xrp_buy_price_idr
            ? Number(form.xrp_buy_price_idr.replace(/\D/g, ""))
            : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan");
      }
      const loan = await res.json();
      router.push(`/loans/${loan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  }

  const monthlyInterest = form.principal_idr
    ? Math.round(Number(form.principal_idr.replace(/\D/g, "")) * 0.02)
    : 0;
  const monthlyCapital =
    form.principal_idr && form.term_months
      ? Math.round(Number(form.principal_idr.replace(/\D/g, "")) / Number(form.term_months))
      : 0;
  const monthlyTotal = monthlyInterest + monthlyCapital;
  const totalInterest = monthlyInterest * Number(form.term_months || 0);
  const totalRepayment =
    Number(form.principal_idr.replace(/\D/g, "") || 0) + totalInterest;

  return (
    <main className="min-h-screen bg-terminal-bg text-terminal-text">
      <header className="sticky top-0 z-10 border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="font-mono text-[10px] text-terminal-text-muted hover:text-terminal-green transition-colors">
            ← KEMBALI
          </a>
          <span className="text-terminal-border">|</span>
          <h1 className="font-mono text-xs font-bold text-terminal-green tracking-wider">
            TAMBAH PINJAMAN BARU
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="border border-red-900 bg-red-950 text-terminal-red font-mono text-xs px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Loan details */}
          <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4 space-y-4">
            <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted">
              DETAIL PINJAMAN
            </div>

            <Field label="NAMA PINJAMAN" hint="misal: XRP Loan BCA 2025">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="XRP Loan BCA 2025"
                className="input-field"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="JUMLAH PINJAMAN (IDR)">
                <input
                  type="text"
                  required
                  value={form.principal_idr}
                  onChange={(e) => set("principal_idr", e.target.value)}
                  placeholder="50000000"
                  className="input-field"
                />
              </Field>
              <Field label="TENOR (BULAN)">
                <input
                  type="number"
                  required
                  min={1}
                  max={360}
                  value={form.term_months}
                  onChange={(e) => set("term_months", e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>

            <Field label="TANGGAL MULAI">
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="input-field"
              />
            </Field>
          </div>

          {/* XRP purchase */}
          <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4 space-y-4">
            <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted">
              PEMBELIAN XRP
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="JUMLAH XRP DIBELI">
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={form.xrp_qty}
                  onChange={(e) => set("xrp_qty", e.target.value)}
                  placeholder="5000"
                  className="input-field"
                />
              </Field>
              <Field label="HARGA BELI XRP (IDR)">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={form.xrp_buy_price_idr}
                    onChange={(e) => set("xrp_buy_price_idr", e.target.value)}
                    placeholder="10000"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={fetchCurrentPrice}
                    disabled={fetchingPrice}
                    className="font-mono text-[9px] px-2 border border-terminal-green-muted text-terminal-green hover:bg-terminal-green hover:text-terminal-bg rounded transition-colors flex-shrink-0"
                  >
                    {fetchingPrice ? "..." : "LIVE"}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Preview */}
          {monthlyTotal > 0 && (
            <div className="border border-terminal-green-muted bg-terminal-surface rounded-lg p-4">
              <div className="font-mono text-[9px] tracking-widest text-terminal-green mb-3">
                RINGKASAN CICILAN
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Bunga/bulan (2% flat)", value: `Rp ${monthlyInterest.toLocaleString("id-ID")}`, color: "text-terminal-red" },
                  { label: "Cicilan pokok/bulan", value: `Rp ${monthlyCapital.toLocaleString("id-ID")}`, color: "text-terminal-text-dim" },
                  { label: "Total bayar/bulan", value: `Rp ${monthlyTotal.toLocaleString("id-ID")}`, color: "text-terminal-amber" },
                  { label: "Total bunga keseluruhan", value: `Rp ${totalInterest.toLocaleString("id-ID")}`, color: "text-terminal-red" },
                  { label: "Total pengembalian", value: `Rp ${totalRepayment.toLocaleString("id-ID")}`, color: "text-terminal-text-dim" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="font-mono text-[9px] text-terminal-text-muted">{label}</div>
                    <div className={`font-mono text-xs font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Field label="CATATAN (opsional)">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Info tambahan tentang pinjaman..."
              className="input-field resize-none"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full font-mono text-sm py-3 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg rounded transition-colors disabled:opacity-50"
          >
            {saving ? "MENYIMPAN..." : "SIMPAN PINJAMAN"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[9px] tracking-widest text-terminal-text-muted block">
        {label}
        {hint && <span className="ml-2 text-terminal-border normal-case font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
