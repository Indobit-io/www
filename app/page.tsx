import Link from "next/link";
import { getLoans, getEntries } from "@/lib/db";
import { buildSummary } from "@/lib/calc";
import { fetchXrpPrice } from "@/lib/coingecko";
import { LoanCard } from "@/components/LoanCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [loans, livePrice] = await Promise.all([
    getLoans(),
    fetchXrpPrice().catch(() => null),
  ]);

  const loansWithSummary = await Promise.all(
    loans.map(async (loan) => {
      const entries = await getEntries(loan.id);
      const summary = buildSummary(loan, entries);
      // Inject live price when no entries yet
      if (livePrice && summary.currentXrpPrice == null) {
        const xrpQty = Number(loan.xrp_qty);
        summary.currentXrpPrice = livePrice.idr;
        summary.currentPortfolioValue = livePrice.idr * xrpQty;
        summary.netPnl = summary.currentPortfolioValue - summary.totalPaidSoFar;
        summary.netPosition = summary.currentPortfolioValue - summary.remainingPrincipal;
        summary.roi = summary.totalPaidSoFar > 0
          ? (summary.netPnl / summary.totalPaidSoFar) * 100 : null;
      }
      return { loan, summary };
    })
  );

  return (
    <main className="min-h-screen bg-terminal-bg text-terminal-text">
      <header className="sticky top-0 z-10 border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-terminal-green font-mono text-xs opacity-50">▌</span>
            <div>
              <h1 className="font-mono text-xs font-bold text-terminal-green tracking-wider">
                CRYPTO LOAN TRACKER
              </h1>
              <div className="font-mono text-[9px] text-terminal-text-muted">
                monitor kinerja pinjaman beli aset kripto
              </div>
            </div>
          </div>
          <Link
            href="/loans/new"
            className="font-mono text-[10px] px-3 py-1.5 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg rounded transition-colors"
          >
            + PINJAMAN
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="font-mono text-terminal-green text-4xl opacity-30">₿</div>
            <div className="font-mono text-sm text-terminal-text-dim">Belum ada pinjaman</div>
            <p className="font-mono text-[10px] text-terminal-text-muted max-w-xs leading-relaxed">
              Tambahkan detail pinjaman Anda untuk mulai melacak kinerja portfolio XRP vs biaya bunga.
            </p>
            <Link
              href="/loans/new"
              className="font-mono text-xs px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg rounded transition-colors"
            >
              + Tambah Pinjaman Pertama
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Aggregate summary if multiple loans */}
            {loansWithSummary.length > 1 && (
              <div className="border border-terminal-border bg-terminal-surface rounded-lg p-4 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "TOTAL PINJAMAN",
                    value: `Rp ${loansWithSummary.reduce((s, { loan }) => s + loan.principal_idr, 0).toLocaleString("id-ID")}`,
                    color: "text-terminal-text-dim",
                  },
                  {
                    label: "TOTAL DIBAYAR",
                    value: `Rp ${loansWithSummary.reduce((s, { summary }) => s + summary.totalPaidSoFar, 0).toLocaleString("id-ID")}`,
                    color: "text-terminal-amber",
                  },
                  {
                    label: "TOTAL NILAI",
                    value: `Rp ${loansWithSummary.reduce((s, { summary }) => s + (summary.currentPortfolioValue ?? 0), 0).toLocaleString("id-ID")}`,
                    color: "text-terminal-green",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="font-mono text-[9px] tracking-widest text-terminal-text-muted mb-1">{label}</div>
                    <div className={`font-mono text-xs font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Loan cards */}
            <div className="space-y-3">
              {loansWithSummary.map(({ loan, summary }) => (
                <LoanCard key={loan.id} loan={loan} summary={summary} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
