"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPositionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [form, setForm] = useState({
    name: "",
    xrp_qty: "",
    buy_price_idr: "",
    total_batches: "6",
    start_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function fetchCurrentPrice() {
    setFetchingPrice(true);
    try {
      const res = await fetch("/api/xrp-price");
      const data = await res.json();
      set("buy_price_idr", String(Math.round(data.idr)));
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
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          xrp_qty: Number(form.xrp_qty),
          buy_price_idr: Number(form.buy_price_idr.replace(/\D/g, "")),
          total_batches: Number(form.total_batches),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan");
      }
      const position = await res.json();
      router.push(`/positions/${position.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  }

  const qty = Number(form.xrp_qty || 0);
  const buyPrice = Number(form.buy_price_idr.replace(/\D/g, "") || 0);
  const batches = Number(form.total_batches || 0);
  const purchaseCost = qty * buyPrice;
  const qtyPerBatch = qty > 0 && batches > 0 ? qty / batches : 0;

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors">
            ← Kembali
          </a>
          <span className="text-cmc-border">|</span>
          <h1 className="text-sm font-semibold text-cmc-text">Tambah Posisi Baru</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="border border-cmc-red/30 bg-cmc-red/10 text-cmc-red text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Purchase details */}
          <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted">
              Detail Pembelian
            </div>

            <Field label="Nama Posisi" hint="misal: XRP Batch Jual 2026">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="XRP Batch Jual 2026"
                className="input-field"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Jumlah XRP Dibeli">
                <input
                  type="number"
                  step="any"
                  min={0}
                  required
                  value={form.xrp_qty}
                  onChange={(e) => set("xrp_qty", e.target.value)}
                  placeholder="5000"
                  className="input-field"
                />
              </Field>
              <Field label="Harga Beli XRP (IDR)">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={form.buy_price_idr}
                    onChange={(e) => set("buy_price_idr", e.target.value)}
                    placeholder="10000"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={fetchCurrentPrice}
                    disabled={fetchingPrice}
                    className="text-xs font-semibold px-3 bg-cmc-blue/20 border border-cmc-blue/30 text-cmc-blue hover:bg-cmc-blue hover:text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {fetchingPrice ? "..." : "Live"}
                  </button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Jumlah Batch Penjualan" hint="misal: 6">
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={form.total_batches}
                  onChange={(e) => set("total_batches", e.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Tanggal Beli">
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>
          </div>

          {/* Preview */}
          {purchaseCost > 0 && (
            <div className="bg-cmc-surface border border-cmc-blue/20 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-blue mb-4">
                Ringkasan Posisi
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Modal beli (qty × harga)", value: `Rp ${purchaseCost.toLocaleString("id-ID")}`, color: "text-cmc-text" },
                  { label: "Rencana penjualan", value: `${batches} batch`, color: "text-cmc-text-secondary" },
                  { label: "± XRP per batch", value: qtyPerBatch.toLocaleString("id-ID", { maximumFractionDigits: 2 }), color: "text-cmc-yellow" },
                  { label: "± Modal per batch", value: `Rp ${Math.round(purchaseCost / (batches || 1)).toLocaleString("id-ID")}`, color: "text-cmc-text-secondary" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="text-xs text-cmc-text-muted mb-0.5">{label}</div>
                    <div className={`text-sm font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Field label="Catatan (opsional)">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Info tambahan tentang posisi ini..."
              className="input-field resize-none"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full text-sm font-semibold py-3 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Posisi"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-cmc-text-muted block">
        {label}
        {hint && <span className="ml-2 text-cmc-text-muted/60 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
