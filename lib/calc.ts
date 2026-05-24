// Pure loan math — no DB or React imports

import type { Loan, MonthlyEntry } from "./db";

export interface LoanScheduleRow {
  monthNumber: number;
  monthLabel: string;
  capitalPayment: number;
  interestPayment: number;
  totalPayment: number;
  cumulativePaid: number;
  remainingPrincipal: number;
  xrpPriceIdr: number | null;
  xrpQtyHeld: number | null;
  portfolioValueIdr: number | null;
  netPosition: number | null;   // portfolioValue - remainingPrincipal
  netPnl: number | null;        // portfolioValue - totalRepayment (full loan cost)
  monthlyReturn: number | null;
  entryId: number | null;
  entryDate: string | null;
  notes: string | null;
}

export interface LoanSummary {
  totalInterestCost: number;
  totalRepayment: number;           // principal + totalInterestCost (full cost of loan)
  monthlyCapital: number;
  monthlyInterest: number;
  monthlyPayment: number;
  monthsElapsed: number;
  monthsRemaining: number;
  currentPortfolioValue: number | null;
  currentXrpPrice: number | null;
  netPosition: number | null;       // portfolioValue - remainingPrincipal
  netPnl: number | null;            // portfolioValue - (remainingPrincipal + remainingInterest)
  breakEvenPriceIdr: number | null;
  totalPaidSoFar: number;
  remainingPrincipal: number;
  roi: number | null;               // netPnl / totalRepayment × 100
}

function monthLabel(startDate: string, monthIndex: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + monthIndex);
  return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

export function buildSchedule(loan: Loan, entries: MonthlyEntry[]): LoanScheduleRow[] {
  const monthlyCapital = Math.round(loan.principal_idr / loan.term_months);
  const monthlyInterest = Math.round(loan.principal_idr * Number(loan.monthly_interest_rate));
  const totalPayment = monthlyCapital + monthlyInterest;
  const totalRepayment = loan.principal_idr + monthlyInterest * loan.term_months;

  const entryMap = new Map(entries.map((e) => [e.month_number, e]));
  const rows: LoanScheduleRow[] = [];

  for (let m = 1; m <= loan.term_months; m++) {
    const cumulativePaid = totalPayment * m;
    const remainingPrincipal = loan.principal_idr - monthlyCapital * m;
    const entry = entryMap.get(m) ?? null;
    const prevEntry = entryMap.get(m - 1) ?? null;

    let portfolioValueIdr: number | null = null;
    let netPosition: number | null = null;
    let netPnl: number | null = null;
    let monthlyReturn: number | null = null;

    if (entry) {
      portfolioValueIdr = Number(entry.xrp_price_idr) * Number(entry.xrp_qty_held);
      netPosition = portfolioValueIdr - remainingPrincipal;
      const remainingInterest = monthlyInterest * (loan.term_months - m);
      netPnl = portfolioValueIdr - (Math.max(0, remainingPrincipal) + remainingInterest);

      if (prevEntry) {
        const prevValue = Number(prevEntry.xrp_price_idr) * Number(prevEntry.xrp_qty_held);
        if (prevValue > 0) {
          monthlyReturn = ((portfolioValueIdr - prevValue) / prevValue) * 100;
        }
      }
    }

    rows.push({
      monthNumber: m,
      monthLabel: monthLabel(loan.start_date, m - 1),
      capitalPayment: monthlyCapital,
      interestPayment: monthlyInterest,
      totalPayment,
      cumulativePaid,
      remainingPrincipal: Math.max(0, remainingPrincipal),
      xrpPriceIdr: entry ? Number(entry.xrp_price_idr) : null,
      xrpQtyHeld: entry ? Number(entry.xrp_qty_held) : null,
      portfolioValueIdr,
      netPosition,
      netPnl,
      monthlyReturn,
      entryId: entry?.id ?? null,
      entryDate: entry?.entry_date ?? null,
      notes: entry?.notes ?? null,
    });
  }

  return rows;
}

export function buildSummary(loan: Loan, entries: MonthlyEntry[]): LoanSummary {
  const monthlyCapital = Math.round(loan.principal_idr / loan.term_months);
  const monthlyInterest = Math.round(loan.principal_idr * Number(loan.monthly_interest_rate));
  const monthlyPayment = monthlyCapital + monthlyInterest;
  const totalInterestCost = monthlyInterest * loan.term_months;
  const totalRepayment = loan.principal_idr + totalInterestCost;

  const monthsElapsed = entries.length;
  const monthsRemaining = loan.term_months - monthsElapsed;
  const totalPaidSoFar = monthlyPayment * monthsElapsed;
  const remainingPrincipal = Math.max(0, loan.principal_idr - monthlyCapital * monthsElapsed);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const currentXrpPrice = latest ? Number(latest.xrp_price_idr) : null;
  const currentXrpQty = latest ? Number(latest.xrp_qty_held) : Number(loan.xrp_qty);

  const currentPortfolioValue =
    currentXrpPrice != null && currentXrpQty != null
      ? currentXrpPrice * currentXrpQty
      : null;

  const netPosition =
    currentPortfolioValue != null ? currentPortfolioValue - remainingPrincipal : null;
  // Break-even = price to cover remaining principal + remaining interest
  const remainingInterest = monthlyInterest * monthsRemaining;
  const netPnl =
    currentPortfolioValue != null ? currentPortfolioValue - (remainingPrincipal + remainingInterest) : null;
  const breakEvenPriceIdr =
    currentXrpQty != null && currentXrpQty > 0
      ? (remainingPrincipal + remainingInterest) / currentXrpQty
      : null;

  const roi =
    netPnl != null ? (netPnl / totalRepayment) * 100 : null;

  return {
    totalInterestCost,
    totalRepayment,
    monthlyCapital,
    monthlyInterest,
    monthlyPayment,
    monthsElapsed,
    monthsRemaining,
    currentPortfolioValue,
    currentXrpPrice,
    netPosition,
    netPnl,
    breakEvenPriceIdr,
    totalPaidSoFar,
    remainingPrincipal,
    roi,
  };
}
