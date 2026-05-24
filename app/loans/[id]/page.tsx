import Link from "next/link";
import { notFound } from "next/navigation";
import { getLoan, getEntries } from "@/lib/db";
import { buildSchedule, buildSummary } from "@/lib/calc";
import { fetchXrpPrice } from "@/lib/coingecko";
import { LoanChart } from "@/components/LoanChart";
import { MonthlyTable } from "@/components/MonthlyTable";
import { idr, xrp, pct, date, pnlColor } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loan = await getLoan(Number(id));
  if (!loan) notFound();

  const [entries, livePrice] = await Promise.all([
    getEntries(loan.id),
    fetchXrpPrice().catch(() => null),
  ]);

  const schedule = buildSchedule(loan, entries);
  const summary = buildSummary(loan, entries);

  // Use live price when no entries exist yet, or always for the "current" row
  const currentXrpPrice = livePrice?.idr ?? summary.currentXrpPrice;

  // Live portfolio value uses live price × qty from latest entry (or initial qty)
  const xrpQty =
    entries.length > 0
      ? Number(entries[entries.length - 1].xrp_qty_held)
      : Number(loan.xrp_qty);
  const livePortfolioValue = currentXrpPrice != null ? currentXrpPrice * xrpQty : null;

  // Recompute P&L with live price
  const liveNetPnl =
    livePortfolioValue != null ? livePortfolioValue - summary.totalPaidSoFar : null;
  const liveNetPosition =
    livePortfolioValue != null ? livePortfolioValue - summary.remainingPrincipal : null;
  const liveRoi =
    liveNetPnl != null && summary.totalPaidSoFar > 0
      ? (liveNetPnl / summary.totalPaidSoFar) * 100
      : null;

  const nextMonth =
    summary.monthsElapsed < loan.term_months ? summary.monthsElapsed + 1 : null;

  const isBelowBreakEven =
    currentXrpPrice != null &&
    summary.breakEvenPriceIdr != null &&
    currentXrpPrice < summary.breakEvenPriceIdr;

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text">
      <header className="sticky top-0 z-10 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors flex-shrink-0">
              ← Kembali
            </Link>
            <span className="text-cmc-border">|</span>
            <h1 className="text-sm font-semibold text-cmc-text truncate">{loan.name}</h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {livePrice && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-cmc-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-cmc-green animate-pulse inline-block" />
                <span className="font-semibold text-cmc-text">{idr(livePrice.idr)}</span>
                <span>/ XRP</span>
              </div>
            )}
            {nextMonth && (
              <Link
                href={`/loans/${loan.id}/entry?month=${nextMonth}`}
                className="text-xs font-semibold px-3 py-2 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors"
              >
                + Bulan {nextMonth}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Loan info strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Pokok", value: idr(loan.principal_idr, true) },
            { label: "Tenor", value: `${loan.term_months} bulan` },
            { label: "Mulai", value: date(loan.start_date) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-cmc-surface border border-cmc-border rounded-xl p-3">
              <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
              <div className="text-sm font-semibold text-cmc-text">{value}</div>
            </div>
          ))}
        </div>

        {/* Key metrics */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
            Status Terkini
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Metric label="Nilai Portfolio (live)" value={idr(livePortfolioValue)} color="text-cmc-green" large />
            <Metric label="Net P&L (live)" value={idr(liveNetPnl, true)} color={pnlColor(liveNetPnl)} sub={pct(liveRoi)} large />
            <Metric label="Sisa Hutang" value={idr(summary.remainingPrincipal, true)} color="text-cmc-red" />
            <Metric label="Total Dibayar" value={idr(summary.totalPaidSoFar, true)} color="text-cmc-yellow" />
            <Metric label="Posisi vs Hutang" value={idr(liveNetPosition, true)} color={pnlColor(liveNetPosition)} />
            <Metric label="XRP Dipegang" value={xrp(xrpQty)} color="text-cmc-text-secondary" />
          </div>
        </div>

        {/* Break-even */}
        <div
          className="border rounded-2xl p-5"
          style={{
            borderColor: isBelowBreakEven ? "#f0b90b30" : "#16c78430",
            background: isBelowBreakEven ? "#f0b90b08" : "#16c78408",
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
            Break-Even Analysis
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Metric label="Harga XRP Saat Ini" value={idr(currentXrpPrice)} color="text-cmc-green" />
            <Metric
              label="Harga Break-Even"
              value={idr(summary.breakEvenPriceIdr)}
              color={
                currentXrpPrice != null && summary.breakEvenPriceIdr != null
                  ? currentXrpPrice >= summary.breakEvenPriceIdr ? "text-cmc-green" : "text-cmc-yellow"
                  : "text-cmc-text-muted"
              }
            />
            <Metric
              label="Cicilan/Bulan"
              value={idr(summary.monthlyPayment, true)}
              color="text-cmc-yellow"
              sub={`pokok ${idr(summary.monthlyCapital, true)} + bunga ${idr(summary.monthlyInterest, true)}`}
            />
            <Metric
              label="Progress"
              value={`Bulan ${summary.monthsElapsed}/${loan.term_months}`}
              color="text-cmc-text-secondary"
              sub={`sisa ${summary.monthsRemaining} bulan`}
            />
          </div>

          <div className="mt-4">
            <div className="h-1.5 bg-cmc-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(summary.monthsElapsed / loan.term_months) * 100}%`,
                  background: isBelowBreakEven ? "#f0b90b" : "#16c784",
                }}
              />
            </div>
          </div>

          {currentXrpPrice != null && summary.breakEvenPriceIdr != null && (
            <p className="text-xs text-cmc-text-muted mt-3 leading-relaxed">
              {currentXrpPrice >= summary.breakEvenPriceIdr
                ? `✓ Harga XRP saat ini sudah melewati break-even. Portfolio dapat menutup seluruh sisa kewajiban pinjaman.`
                : `Butuh kenaikan ${pct(((summary.breakEvenPriceIdr - currentXrpPrice) / currentXrpPrice) * 100)} lagi agar portofolio bisa menutup sisa hutang + bunga.`}
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
            Grafik Kinerja
          </div>
          <LoanChart rows={schedule} principalIdr={loan.principal_idr} />
          <div className="flex gap-5 mt-3 text-xs text-cmc-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cmc-green inline-block rounded" /> Portfolio</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cmc-red inline-block rounded" /> Sisa Hutang</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cmc-yellow inline-block rounded" /> Total Dibayar</span>
          </div>
        </div>

        {/* Monthly table */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted">
              Riwayat Bulanan
            </div>
            {nextMonth && (
              <Link
                href={`/loans/${loan.id}/entry?month=${nextMonth}`}
                className="text-xs text-cmc-blue hover:text-blue-400 font-medium transition-colors"
              >
                + Catat bulan {nextMonth}
              </Link>
            )}
          </div>
          <MonthlyTable rows={schedule} loanId={loan.id} />
        </div>

        {/* Loan cost summary */}
        <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-cmc-text-muted mb-4">
            Biaya Total Pinjaman
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Pokok Pinjaman" value={idr(loan.principal_idr, true)} color="text-cmc-text-secondary" />
            <Metric label="Total Bunga (2%×pokok×bulan)" value={idr(summary.totalInterestCost, true)} color="text-cmc-red" />
            <Metric label="Total Pengembalian" value={idr(summary.totalRepayment, true)} color="text-cmc-yellow" />
            <Metric label="Harga Beli XRP" value={idr(loan.xrp_buy_price_idr)} color="text-cmc-text-secondary" />
          </div>
        </div>

      </div>
    </main>
  );
}

function Metric({
  label, value, color, sub, large,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
      <div className={`font-bold ${large ? "text-lg" : "text-sm"} ${color}`}>{value}</div>
      {sub && <div className="text-xs text-cmc-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
