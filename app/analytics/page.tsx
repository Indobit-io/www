import Link from "next/link";
import { getPositions, getAllSales } from "@/lib/db";
import { buildPortfolioAnalytics } from "@/lib/analytics";
import { fetchAssetPrice, isSupportedAsset } from "@/lib/coingecko";
import { MonthlyPnlChart } from "@/components/MonthlyPnlChart";
import { CumulativePnlChart } from "@/components/CumulativePnlChart";
import { idr, qty, pct, pnlColor } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [positions, sales] = await Promise.all([getPositions(), getAllSales()]);

  const assets = [...new Set(positions.map((p) => p.asset).filter(isSupportedAsset))];
  const priceList = await Promise.all(
    assets.map((a) => fetchAssetPrice(a).catch(() => null))
  );
  const prices = new Map<string, number>();
  priceList.forEach((p) => p && prices.set(p.asset, p.idr));

  const a = buildPortfolioAnalytics(positions, sales, prices);
  const { totals, perAsset, monthly, cumulative, saleStats } = a;

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors">
            ← Kembali
          </Link>
          <span className="text-cmc-border">|</span>
          <h1 className="text-sm font-semibold text-cmc-text">Analitik Portofolio</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-16 h-16 bg-cmc-surface rounded-2xl flex items-center justify-center text-3xl">
              📈
            </div>
            <div className="text-base font-semibold text-cmc-text">Belum ada data</div>
            <p className="text-sm text-cmc-text-muted max-w-xs leading-relaxed">
              Tambahkan posisi dan catat penjualan untuk melihat analitik portofolio.
            </p>
          </div>
        ) : (
          <>
            {/* Hero numbers */}
            <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="text-xs text-cmc-text-muted mb-1">Nilai Portofolio</div>
                  <div className="text-xl font-bold text-cmc-text">{idr(totals.portfolioValue)}</div>
                  <div className="text-xs text-cmc-text-muted mt-0.5">
                    modal {idr(totals.invested, true)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cmc-text-muted mb-1">Total P/L</div>
                  <div className={`text-xl font-bold ${pnlColor(totals.totalPnl)}`}>
                    {idr(totals.totalPnl, true)}
                  </div>
                  <div className={`text-xs mt-0.5 ${pnlColor(totals.totalPnl)}`}>
                    {pct(totals.roiPct)} ROI
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-cmc-border/60">
                <Metric label="Cash Terkumpul" value={idr(totals.cash, true)} color="text-cmc-yellow" />
                <Metric
                  label="Realized P/L"
                  value={idr(totals.realizedPnl, true)}
                  color={pnlColor(totals.realizedPnl)}
                />
                <Metric
                  label="Unrealized P/L"
                  value={idr(totals.unrealizedPnl, true)}
                  color={pnlColor(totals.unrealizedPnl)}
                />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-cmc-text-muted mb-1.5">
                  <span>Modal terjual</span>
                  <span className="font-medium">{pct(totals.qtySoldPct, 0).replace("+", "")}</span>
                </div>
                <div className="h-1.5 bg-cmc-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cmc-blue rounded-full"
                    style={{ width: `${Math.min(100, totals.qtySoldPct)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Asset allocation */}
            <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
                Alokasi per Aset
              </div>
              <div className="space-y-4">
                {perAsset.map((row) => (
                  <div key={row.asset}>
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="font-semibold text-cmc-text">
                        {row.asset}
                        <span className="ml-2 font-normal text-cmc-text-muted">
                          sisa {qty(row.qtyRemaining, 0, row.asset)}
                        </span>
                      </span>
                      <span className="text-cmc-text-secondary font-medium">
                        {idr(row.valueNow, true)}
                        {row.allocationPct != null && (
                          <span className="ml-1.5 text-cmc-text-muted font-normal">
                            {row.allocationPct.toFixed(0)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 bg-cmc-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cmc-blue rounded-full"
                        style={{ width: `${Math.min(100, row.allocationPct ?? 0)}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-cmc-text-muted">
                      <span>modal {idr(row.invested, true)}</span>
                      <span className={pnlColor(row.realizedPnl)}>
                        realized {idr(row.realizedPnl, true)}
                      </span>
                      <span className={pnlColor(row.unrealizedPnl)}>
                        unrealized {idr(row.unrealizedPnl, true)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly realized P/L */}
            <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
                Realized P/L per Bulan
              </div>
              <MonthlyPnlChart monthly={monthly} />
            </div>

            {/* Cumulative timeline */}
            <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
                Perkembangan Kumulatif
              </div>
              <CumulativePnlChart points={cumulative} />
              <div className="flex gap-5 mt-3 text-xs text-cmc-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cmc-blue inline-block rounded" /> Realized P/L
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cmc-yellow inline-block rounded" /> Cash
                </span>
              </div>
            </div>

            {/* Sale performance */}
            <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
                Statistik Penjualan
              </div>
              {saleStats.count === 0 ? (
                <p className="text-sm text-cmc-text-muted">Belum ada penjualan.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Metric
                      label="Batch Terjual"
                      value={String(saleStats.count)}
                      color="text-cmc-text"
                    />
                    <Metric
                      label="Win Rate"
                      value={saleStats.winRatePct != null ? `${saleStats.winRatePct.toFixed(0)}%` : "—"}
                      color={
                        saleStats.winRatePct != null && saleStats.winRatePct >= 50
                          ? "text-cmc-green"
                          : "text-cmc-yellow"
                      }
                      sub={`${saleStats.winCount} profit`}
                    />
                    <Metric
                      label="Rata-rata Margin"
                      value={pct(saleStats.avgUpliftPct)}
                      color={pnlColor(saleStats.avgUpliftPct)}
                      sub="vs harga beli"
                    />
                    <Metric
                      label="Rata-rata Holding"
                      value={
                        saleStats.avgHoldingDays != null
                          ? `${Math.round(saleStats.avgHoldingDays)} hari`
                          : "—"
                      }
                      color="text-cmc-text-secondary"
                      sub="beli → jual"
                    />
                  </div>

                  {(saleStats.best || saleStats.worst) && (
                    <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-cmc-border/60">
                      {saleStats.best && (
                        <HighlightCard
                          title="Batch Terbaik"
                          highlight={saleStats.best}
                          color="text-cmc-green"
                        />
                      )}
                      {saleStats.worst && saleStats.worst !== saleStats.best && (
                        <HighlightCard
                          title="Batch Terburuk"
                          highlight={saleStats.worst}
                          color="text-cmc-red"
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
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

function HighlightCard({
  title, highlight, color,
}: {
  title: string;
  highlight: { positionName: string; asset: string; batchNumber: number; saleDate: string; pnlIdr: number; pnlPct: number };
  color: string;
}) {
  return (
    <div className="bg-cmc-bg border border-cmc-border rounded-xl p-3.5">
      <div className="text-xs text-cmc-text-muted mb-1.5">{title}</div>
      <div className="text-sm font-semibold text-cmc-text">
        {highlight.positionName} · Batch {highlight.batchNumber}
      </div>
      <div className={`text-sm font-bold mt-1 ${color}`}>
        {idr(highlight.pnlIdr, true)}
        <span className="ml-1.5 text-xs font-medium">{pct(highlight.pnlPct)}</span>
      </div>
      <div className="text-xs text-cmc-text-muted mt-1">{highlight.saleDate}</div>
    </div>
  );
}
