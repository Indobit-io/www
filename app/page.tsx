import Link from "next/link";
import { getPositions, getSales } from "@/lib/db";
import { buildSummary, valueAtPrice } from "@/lib/calc";
import { fetchAssetPrice, isSupportedAsset, type AssetPrice } from "@/lib/coingecko";
import { PositionCard } from "@/components/PositionCard";
import { LogoutButton } from "@/components/LogoutButton";
import { idr } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const positions = await getPositions();

  // One price fetch per distinct asset across all positions
  const assets = [...new Set(positions.map((p) => p.asset).filter(isSupportedAsset))];
  if (assets.length === 0) assets.push("XRP");
  const priceList = await Promise.all(
    assets.map((a) => fetchAssetPrice(a).catch(() => null))
  );
  const prices = new Map<string, AssetPrice>();
  priceList.forEach((p) => p && prices.set(p.asset, p));

  const authEnabled = Boolean(process.env.APP_PASSWORD);

  const positionsWithSummary = await Promise.all(
    positions.map(async (position) => {
      const sales = await getSales(position.id);
      const summary = buildSummary(position, sales);
      const livePrice = prices.get(position.asset) ?? null;
      const live = livePrice
        ? valueAtPrice(summary, position.buy_price_idr, livePrice.idr)
        : null;
      return { position, summary, live };
    })
  );

  const totals = positionsWithSummary.reduce(
    (acc, { summary, live }) => ({
      cost: acc.cost + summary.purchaseCost,
      cash: acc.cash + summary.cashIdr,
      value: acc.value + summary.cashIdr + (live?.cryptoValueIdr ?? 0),
    }),
    { cost: 0, cash: 0, value: 0 }
  );

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cmc-blue rounded-lg flex items-center justify-center text-white text-sm font-bold">
              C
            </div>
            <div>
              <h1 className="text-sm font-bold text-cmc-text">Crypto Sell Tracker</h1>
              <div className="text-xs text-cmc-text-muted">Jual bertahap, pantau cash & P/L</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-xs text-cmc-text-muted">
              {assets.map((a) => {
                const p = prices.get(a);
                if (!p) return null;
                return (
                  <span key={a} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cmc-green animate-pulse inline-block" />
                    <span>{a} <span className="text-cmc-text font-semibold">{idr(p.idr)}</span></span>
                  </span>
                );
              })}
            </div>
            <Link
              href="/positions/new"
              className="text-xs font-semibold px-4 py-2 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors"
            >
              + Posisi
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-16 h-16 bg-cmc-surface rounded-2xl flex items-center justify-center text-3xl">
              📊
            </div>
            <div className="text-base font-semibold text-cmc-text">Belum ada posisi</div>
            <p className="text-sm text-cmc-text-muted max-w-xs leading-relaxed">
              Catat pembelian kripto Anda, lalu jual bertahap dalam beberapa batch sambil memantau cash dan P/L.
            </p>
            <Link
              href="/positions/new"
              className="text-sm font-semibold px-5 py-2.5 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors"
            >
              + Tambah Posisi Pertama
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Aggregate summary */}
            {positionsWithSummary.length > 1 && (
              <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-4 grid grid-cols-3 gap-4">
                {[
                  { label: "Total Modal", value: idr(totals.cost, true), color: "text-cmc-text" },
                  { label: "Total Cash", value: idr(totals.cash, true), color: "text-cmc-yellow" },
                  { label: "Total Nilai", value: idr(totals.value, true), color: "text-cmc-green" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
                    <div className={`text-sm font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {positionsWithSummary.map(({ position, summary, live }) => (
                <PositionCard key={position.id} position={position} summary={summary} live={live} />
              ))}
            </div>
          </div>
        )}

        {/* Footer utilities */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-cmc-border/50 text-xs text-cmc-text-muted">
          <div className="flex items-center gap-4">
            <span>Export:</span>
            <a href="/api/export?format=csv" className="hover:text-cmc-text transition-colors">
              ⬇ CSV penjualan
            </a>
            <a href="/api/export" className="hover:text-cmc-text transition-colors">
              ⬇ JSON backup
            </a>
          </div>
          {authEnabled && <LogoutButton />}
        </div>
      </div>
    </main>
  );
}
