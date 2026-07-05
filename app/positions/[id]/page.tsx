import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosition, getSales } from "@/lib/db";
import { buildBatches, buildSummary } from "@/lib/calc";
import { fetchXrpPrice } from "@/lib/coingecko";
import { PositionChart } from "@/components/PositionChart";
import { BatchTable } from "@/components/BatchTable";
import { LiveStatus } from "@/components/LiveStatus";
import { SellProgress } from "@/components/SellProgress";
import { idr, xrp, date } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = await getPosition(Number(id));
  if (!position) notFound();

  const [sales, livePrice] = await Promise.all([
    getSales(position.id),
    fetchXrpPrice().catch(() => null),
  ]);

  const batches = buildBatches(position, sales);
  const summary = buildSummary(position, sales);

  const currentXrpPrice = livePrice?.idr ?? null;

  const nextBatch = batches.find((b) => b.saleId == null) ?? null;
  const allSold = summary.qtyRemaining <= 0 || nextBatch == null;

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors flex-shrink-0">
              ← Kembali
            </Link>
            <span className="text-cmc-border">|</span>
            <h1 className="text-sm font-semibold text-cmc-text truncate">{position.name}</h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {livePrice && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-cmc-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-cmc-green animate-pulse inline-block" />
                <span className="font-semibold text-cmc-text">{idr(livePrice.idr)}</span>
                <span>/ XRP</span>
              </div>
            )}
            {!allSold && nextBatch && (
              <Link
                href={`/positions/${position.id}/sell?batch=${nextBatch.batchNumber}`}
                className="text-xs font-semibold px-3 py-2 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors"
              >
                + Jual Batch {nextBatch.batchNumber}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Position info strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Dibeli", value: xrp(position.xrp_qty, 0) },
            { label: "Harga Beli", value: idr(position.buy_price_idr) },
            { label: "Tanggal Beli", value: date(position.start_date) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-cmc-surface border border-cmc-border rounded-xl p-3">
              <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
              <div className="text-sm font-semibold text-cmc-text">{value}</div>
            </div>
          ))}
        </div>

        {/* Key metrics — live polling every 2s */}
        <LiveStatus
          qtyRemaining={summary.qtyRemaining}
          cashIdr={summary.cashIdr}
          realizedPnl={summary.realizedPnl}
          purchaseCost={summary.purchaseCost}
          buyPriceIdr={position.buy_price_idr}
          initialXrpPrice={currentXrpPrice}
        />

        {/* Sell progress + break-even — live polling */}
        <SellProgress
          summary={summary}
          totalBatches={position.total_batches}
          initialXrpPrice={currentXrpPrice}
        />

        {/* Chart */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
            Grafik Portofolio per Batch
          </div>
          <PositionChart rows={batches} purchaseCost={summary.purchaseCost} />
          <div className="flex gap-5 mt-3 text-xs text-cmc-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cmc-blue inline-block rounded" /> Total (cash + kripto)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cmc-yellow inline-block rounded" /> Cash</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cmc-green inline-block rounded" /> Nilai Kripto</span>
          </div>
        </div>

        {/* Batch table */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted">
              Riwayat Batch Penjualan
            </div>
            {!allSold && nextBatch && (
              <Link
                href={`/positions/${position.id}/sell?batch=${nextBatch.batchNumber}`}
                className="text-xs text-cmc-blue hover:text-blue-400 font-medium transition-colors"
              >
                + Jual batch {nextBatch.batchNumber}
              </Link>
            )}
          </div>
          <BatchTable rows={batches} positionId={position.id} />
        </div>

        {/* Position cost summary */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
            Ringkasan Posisi
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Modal Beli" value={idr(summary.purchaseCost)} color="text-cmc-text-secondary" />
            <Metric label="Cash Terkumpul" value={idr(summary.cashIdr)} color="text-cmc-yellow" />
            <Metric
              label="Realized P/L"
              value={idr(summary.realizedPnl)}
              color={summary.realizedPnl >= 0 ? "text-cmc-green" : "text-cmc-red"}
            />
            <Metric label="Harga Beli XRP" value={idr(position.buy_price_idr)} color="text-cmc-text-secondary" />
          </div>
        </div>

      </div>
    </main>
  );
}

function Metric({
  label, value, color, sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
      <div className={`font-bold text-sm ${color}`}>{value}</div>
      {sub && <div className="text-xs text-cmc-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
