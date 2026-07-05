"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Position {
  id: number;
  name: string;
  xrp_qty: number;
  buy_price_idr: number;
  total_batches: number;
}

interface Sale {
  batch_number: number;
  sell_price_idr: number;
  xrp_qty_sold: number;
}

export default function SellPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [positionId, setPositionId] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    batch_number: searchParams.get("batch") ?? "1",
    sale_date: new Date().toISOString().slice(0, 10),
    sell_price_idr: "",
    xrp_qty_sold: "",
    notes: "",
  });

  useEffect(() => {
    params.then(({ id }) => {
      setPositionId(id);
      Promise.all([
        fetch(`/api/positions/${id}`).then((r) => r.json()),
        fetch(`/api/positions/${id}/sales`).then((r) => r.json()),
      ]).then(([pos, salesData]: [Position, Sale[]]) => {
        setPosition(pos);
        setSales(salesData);
      });
    });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const batchNum = Number(form.batch_number || 0);
  const qtySoldElsewhere = sales
    .filter((s) => s.batch_number !== batchNum)
    .reduce((sum, s) => sum + Number(s.xrp_qty_sold), 0);
  const qtyAvailable = position ? Number(position.xrp_qty) - qtySoldElsewhere : 0;
  const batchesLeft = position
    ? position.total_batches - sales.filter((s) => s.batch_number !== batchNum).length
    : 0;
  const suggestedQty = batchesLeft > 0 ? qtyAvailable / batchesLeft : 0;

  // Prefill qty with the even-split suggestion once data arrives
  useEffect(() => {
    if (position && !form.xrp_qty_sold && suggestedQty > 0) {
      setForm((f) =>
        f.xrp_qty_sold ? f : { ...f, xrp_qty_sold: String(Math.round(suggestedQty * 100) / 100) }
      );
    }
  }, [position, sales]);

  async function fetchPrice() {
    setFetchingPrice(true);
    try {
      const res = await fetch("/api/xrp-price");
      const data = await res.json();
      set("sell_price_idr", String(Math.round(data.idr)));
    } catch {
      setError("Gagal ambil harga. Isi manual.");
    } finally {
      setFetchingPrice(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${positionId}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          batch_number: Number(form.batch_number),
          sell_price_idr: Number(form.sell_price_idr.replace(/\D/g, "")),
          xrp_qty_sold: Number(form.xrp_qty_sold),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal menyimpan");
      }
      router.push(`/positions/${positionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  }

  const sellPrice = Number(form.sell_price_idr.replace(/\D/g, "") || 0);
  const qtySold = Number(form.xrp_qty_sold || 0);
  const proceeds = sellPrice > 0 && qtySold > 0 ? sellPrice * qtySold : null;

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
          <h1 className="text-sm font-semibold text-cmc-text">
            Jual Batch {form.batch_number}{position ? ` — ${position.name}` : ""}
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
              Data Penjualan
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-cmc-text-muted block">Nomor Batch</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={position?.total_batches ?? 100}
                  value={form.batch_number}
                  onChange={(e) => set("batch_number", e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-cmc-text-muted block">Tanggal Jual</label>
                <input
                  type="date"
                  required
                  value={form.sale_date}
                  onChange={(e) => set("sale_date", e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-cmc-text-muted block">Harga Jual XRP/IDR</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={form.sell_price_idr}
                  onChange={(e) => set("sell_price_idr", e.target.value)}
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
                Jumlah XRP Dijual
              </label>
              <input
                type="number"
                step="any"
                min={0}
                max={qtyAvailable || undefined}
                required
                value={form.xrp_qty_sold}
                onChange={(e) => set("xrp_qty_sold", e.target.value)}
                placeholder={suggestedQty > 0 ? String(Math.round(suggestedQty)) : "1000"}
                className="input-field"
              />
              {position && (
                <p className="text-xs text-cmc-text-muted">
                  Tersedia {qtyAvailable.toLocaleString("id-ID")} XRP · saran {Math.round(suggestedQty).toLocaleString("id-ID")} XRP ({batchesLeft} batch tersisa)
                </p>
              )}
            </div>
          </div>

          {/* Live preview */}
          {proceeds != null && position && (
            <div className="bg-cmc-surface border border-cmc-blue/20 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-blue mb-4">
                Preview Batch {form.batch_number}
              </div>
              {(() => {
                const buyPrice = Number(position.buy_price_idr);
                const costBasis = qtySold * buyPrice;
                const pnl = proceeds - costBasis;
                const pnlPct = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;
                const remainingAfter = qtyAvailable - qtySold;

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Cash Masuk", value: `Rp ${proceeds.toLocaleString("id-ID")}`, color: "text-cmc-yellow" },
                      { label: "Modal Batch Ini", value: `Rp ${Math.round(costBasis).toLocaleString("id-ID")}`, color: "text-cmc-text-secondary" },
                      { label: "P/L Batch", value: `Rp ${Math.round(pnl).toLocaleString("id-ID")} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)`, color: pnl >= 0 ? "text-cmc-green" : "text-cmc-red" },
                      { label: "Sisa XRP Setelahnya", value: remainingAfter.toLocaleString("id-ID"), color: "text-cmc-text" },
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
              placeholder="Kondisi pasar, alasan jual, dll..."
              className="input-field resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full text-sm font-semibold py-3 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Penjualan"}
          </button>
        </form>
      </div>
    </main>
  );
}
