import Link from "next/link";
import { getLoans, getEntries } from "@/lib/db";
import { buildSummary } from "@/lib/calc";
import { fetchXrpPrice } from "@/lib/coingecko";
import { LoanCard } from "@/components/LoanCard";
import { idr } from "@/lib/fmt";

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
      if (livePrice && summary.currentXrpPrice == null) {
        const xrpQty = Number(loan.xrp_qty);
        summary.currentXrpPrice = livePrice.idr;
        summary.currentPortfolioValue = livePrice.idr * xrpQty;
        summary.netPosition = summary.currentPortfolioValue - summary.remainingPrincipal;
      }
      return { loan, summary };
    })
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
              <h1 className="text-sm font-bold text-cmc-text">Crypto Loan Tracker</h1>
              <div className="text-xs text-cmc-text-muted">Monitor kinerja pinjaman kripto</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {livePrice && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-cmc-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-cmc-green animate-pulse inline-block" />
                <span>XRP <span className="text-cmc-text font-semibold">{idr(livePrice.idr)}</span></span>
              </div>
            )}
            <Link
              href="/loans/new"
              className="text-xs font-semibold px-4 py-2 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors"
            >
              + Pinjaman
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-16 h-16 bg-cmc-surface rounded-2xl flex items-center justify-center text-3xl">
              📊
            </div>
            <div className="text-base font-semibold text-cmc-text">Belum ada pinjaman</div>
            <p className="text-sm text-cmc-text-muted max-w-xs leading-relaxed">
              Tambahkan detail pinjaman Anda untuk mulai melacak kinerja portfolio XRP vs biaya bunga.
            </p>
            <Link
              href="/loans/new"
              className="text-sm font-semibold px-5 py-2.5 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-lg transition-colors"
            >
              + Tambah Pinjaman Pertama
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Aggregate summary */}
            {loansWithSummary.length > 1 && (
              <div className="bg-cmc-surface border border-cmc-border rounded-2xl p-4 grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Pinjaman",
                    value: idr(loansWithSummary.reduce((s, { loan }) => s + loan.principal_idr, 0), true),
                    color: "text-cmc-text",
                  },
                  {
                    label: "Total Dibayar",
                    value: idr(loansWithSummary.reduce((s, { summary }) => s + summary.totalPaidSoFar, 0), true),
                    color: "text-cmc-yellow",
                  },
                  {
                    label: "Total Nilai",
                    value: idr(loansWithSummary.reduce((s, { summary }) => s + (summary.currentPortfolioValue ?? 0), 0), true),
                    color: "text-cmc-green",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="text-xs text-cmc-text-muted mb-1">{label}</div>
                    <div className={`text-sm font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            )}

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
