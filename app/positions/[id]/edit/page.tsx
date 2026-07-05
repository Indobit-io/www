"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_ASSETS } from "@/lib/coingecko";

interface Position {
  id: number;
  name: string;
  asset: string;
  xrp_qty: number;
  buy_price_idr: number;
  total_batches: number;
  start_date: string;
  notes: string | null;
}

export default function EditPositionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [positionId, setPositionId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    asset: "XRP",
    xrp_qty: "",
    buy_price_idr: "",
    total_batches: "6",
    start_date: "",
    notes: "",
  });

  useEffect(() => {
    params.then(({ id }) => {
      setPositionId(id);
      fetch(`/api/positions/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            setLoadState("notfound");
            return;
          }
          const pos: Position = await res.json();
          setForm({
            name: pos.name,
            asset: pos.asset,
            xrp_qty: String(pos.xrp_qty),
            buy_price_idr: String(pos.buy_price_idr),
            total_batches: String(pos.total_batches),
            start_date: String(pos.start_date).slice(0, 10),
            notes: pos.notes ?? "",
          });
          setLoadState("ready");
        })
        .catch(() => setLoadState("notfound"));
    });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          asset: form.asset,
          xrp_qty: Number(form.xrp_qty),
          buy_price_idr: Number(form.buy_price_idr.replace(/\D/g, "")),
          total_batches: Number(form.total_batches),
          start_date: form.start_date,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan");
      }
      router.push(`/positions/${positionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <main className="min-h-screen bg-cmc-bg text-cmc-text flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-cmc-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-cmc-blue animate-pulse inline-block" />
          Memuat data posisi…
        </div>
      </main>
    );
  }

  if (loadState === "notfound") {
    return (
      <main className="min-h-screen bg-cmc-bg text-cmc-text flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-3xl">🔍</div>
          <div className="text-sm font-semibold">Posisi tidak ditemukan</div>
          <p className="text-xs text-cmc-text-muted">Posisi ini mungkin sudah dihapus.</p>
          <a href="/" className="inline-block text-xs font-semibold px-4 py-2 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors">
            ← Kembali ke Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <a
            href={positionId ? `/positions/${positionId}` : "/"}
            className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors"
          >
            ← Kembali
          </a>
          <span className="text-cmc-border">|</span>
          <h1 className="text-sm font-semibold text-cmc-text">Edit Posisi — {form.name}</h1>
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
              Detail Pembelian
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Nama Posisi">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label="Aset">
                <select
                  value={form.asset}
                  onChange={(e) => set("asset", e.target.value)}
                  className="input-field"
                >
                  {Object.entries(SUPPORTED_ASSETS).map(([symbol, { label }]) => (
                    <option key={symbol} value={symbol}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={`Jumlah ${form.asset} Dibeli`}>
                <input
                  type="number"
                  step="any"
                  min={0}
                  required
                  value={form.xrp_qty}
                  onChange={(e) => set("xrp_qty", e.target.value)}
                  className="input-field"
                />
              </Field>
              <Field label={`Harga Beli ${form.asset} (IDR)`}>
                <input
                  type="text"
                  required
                  value={form.buy_price_idr}
                  onChange={(e) => set("buy_price_idr", e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Jumlah Batch Penjualan" hint="≥ batch yang sudah terjual">
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

            <Field label="Catatan (opsional)">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className="input-field resize-none"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full text-sm font-semibold py-3 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
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
