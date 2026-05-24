import Link from "next/link";
import { notFound } from "next/navigation";
import { getLoan, getEntries } from "@/lib/db";
import { buildSchedule, buildSummary } from "@/lib/calc";
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

  const entries = await getEntries(loan.id);
  const schedule = buildSchedule(loan, entries);
  const summary = buildSummary(loan, entries);

  const nextMonth =
    summary.monthsElapsed < loan.term_months ? summary.monthsElapsed + 1 : null;

  return (
    <main className="min-h-screen bg-terminal-bg text-terminal-text">
      <header className="sticky top-0 z-10 border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="font-mono text-[10px] text-terminal-text-muted hover:text-terminal-green transition-colors flex-shrink-0">
              ← KEMBALI
            </Link>
            <span className="text-terminal-border">|</span>
            <h1 className="font-mono text-xs font-bold text-terminal-green tracking-wider truncate">
              {loan.name}
            </h1>
          </div>
          {nextMonth && (
            <Link
              href={`/loans/${loan.id}/entry?month=${nextMonth}`}
              className="font-mono text-[10px] px-3 py-1.5 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg rounded transition-colors flex-shrink-0"
            >
              + BULAN {nextMonth}
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Loan info strip */}
        <div className="grid grid-cols-3 gap-2 font-mono text-[9px]">
          {[
            { label: "POKOK", value: idr(loan.principal_idr, true), color: "text-terminal-text-dim" },
            { label: "TENOR", value: `${loan.term_months} bulan`, color: "text-terminal-text-dim" },
            { label: "MULAI", value: date(loan.start_date), color: "text-terminal-text-dim" },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-terminal-border bg-terminal-surface rounded p-2.5">
              <div className="tracking-widest text-terminal-text-muted mb-0.5">{label}</div>
              <div className={`font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Key metrics */}
        <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
          <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-4">
            STATUS TERKINI
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Metric
              label="Nilai Portfolio"
              value={idr(summary.currentPortfolioValue)}
              color="text-terminal-green"
              large
            />
            <Metric
              label="Net P&L"
              value={idr(summary.netPnl, true)}
              color={pnlColor(summary.netPnl)}
              sub={pct(summary.roi)}
              large
            />
            <Metric
              label="Sisa Hutang"
              value={idr(summary.remainingPrincipal, true)}
              color="text-terminal-red"
            />
            <Metric
              label="Total Dibayar"
              value={idr(summary.totalPaidSoFar, true)}
              color="text-terminal-amber"
            />
            <Metric
              label="Posisi vs Hutang"
              value={idr(summary.netPosition, true)}
              color={pnlColor(summary.netPosition)}
            />
            <Metric
              label="XRP Dipegang"
              value={xrp(summary.currentPortfolioValue != null && summary.currentXrpPrice
                ? summary.currentPortfolioValue / summary.currentXrpPrice : null)}
              color="text-terminal-text-dim"
            />
          </div>
        </div>

        {/* Break-even */}
        <div
          className="border rounded-lg p-4 font-mono"
          style={{
            borderColor: summary.currentXrpPrice != null && summary.breakEvenPriceIdr != null
              && summary.currentXrpPrice >= summary.breakEvenPriceIdr
              ? "#00ff4130" : "#ffb30030",
            background: summary.currentXrpPrice != null && summary.breakEvenPriceIdr != null
              && summary.currentXrpPrice >= summary.breakEvenPriceIdr
              ? "#00ff4108" : "#ffb30008",
          }}
        >
          <div className="text-[9px] tracking-widest text-terminal-text-muted mb-3">BREAK-EVEN ANALYSIS</div>
          <div className="grid grid-cols-2 gap-4">
            <Metric
              label="Harga XRP Saat Ini"
              value={idr(summary.currentXrpPrice)}
              color="text-terminal-green"
            />
            <Metric
              label="Harga Break-Even"
              value={idr(summary.breakEvenPriceIdr)}
              color={
                summary.currentXrpPrice != null && summary.breakEvenPriceIdr != null
                  ? summary.currentXrpPrice >= summary.breakEvenPriceIdr
                    ? "text-terminal-green"
                    : "text-terminal-amber"
                  : "text-terminal-text-muted"
              }
            />
            <Metric
              label="Cicilan/Bulan"
              value={idr(summary.monthlyPayment, true)}
              color="text-terminal-amber"
              sub={`(pokok ${idr(summary.monthlyCapital, true)} + bunga ${idr(summary.monthlyInterest, true)})`}
            />
            <Metric
              label="Progress"
              value={`Bulan ${summary.monthsElapsed}/${loan.term_months}`}
              color="text-terminal-text-dim"
              sub={`sisa ${summary.monthsRemaining} bulan`}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-1.5 bg-terminal-border rounded-full overflow-hidden">
              <div
                className="h-full bg-terminal-green rounded-full transition-all duration-500"
                style={{ width: `${(summary.monthsElapsed / loan.term_months) * 100}%` }}
              />
            </div>
          </div>

          {summary.currentXrpPrice != null && summary.breakEvenPriceIdr != null && (
            <p className="text-[10px] text-terminal-text-muted mt-3 leading-relaxed">
              {summary.currentXrpPrice >= summary.breakEvenPriceIdr
                ? `✓ Harga XRP saat ini sudah melewati break-even. Portfolio dapat menutup seluruh sisa kewajiban pinjaman.`
                : `Butuh kenaikan ${pct(((summary.breakEvenPriceIdr - summary.currentXrpPrice) / summary.currentXrpPrice) * 100)} lagi agar portofolio bisa menutup sisa hutang + bunga.`}
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
          <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-3">
            GRAFIK KINERJA
          </div>
          <LoanChart rows={schedule} principalIdr={loan.principal_idr} />
          <div className="flex gap-4 mt-2 font-mono text-[9px] text-terminal-text-muted">
            <span className="text-terminal-green">── Portfolio</span>
            <span className="text-terminal-red">- - Sisa Hutang</span>
            <span className="text-terminal-amber">· · Total Dibayar</span>
          </div>
        </div>

        {/* Monthly table */}
        <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted">
              RIWAYAT BULANAN
            </div>
            {nextMonth && (
              <Link
                href={`/loans/${loan.id}/entry?month=${nextMonth}`}
                className="font-mono text-[9px] text-terminal-green hover:underline"
              >
                + catat bulan {nextMonth}
              </Link>
            )}
          </div>
          <MonthlyTable rows={schedule} loanId={loan.id} />
        </div>

        {/* Loan cost summary */}
        <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4">
          <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-3">
            BIAYA TOTAL PINJAMAN
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Pokok Pinjaman" value={idr(loan.principal_idr, true)} color="text-terminal-text-dim" />
            <Metric label="Total Bunga (2%×pokok×bulan)" value={idr(summary.totalInterestCost, true)} color="text-terminal-red" />
            <Metric label="Total Pengembalian" value={idr(summary.totalRepayment, true)} color="text-terminal-amber" />
            <Metric label="Harga Beli XRP" value={idr(loan.xrp_buy_price_idr)} color="text-terminal-text-dim" />
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
      <div className="font-mono text-[9px] text-terminal-text-muted tracking-wide mb-0.5">{label}</div>
      <div className={`font-mono font-bold ${large ? "text-base" : "text-xs"} ${color}`}>{value}</div>
      {sub && <div className="font-mono text-[9px] text-terminal-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
