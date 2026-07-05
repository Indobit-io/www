// Portfolio-wide analytics — pure aggregation, no DB or React imports

import type { Position, SaleWithPosition } from "./db";

export interface PortfolioTotals {
  invested: number;            // Σ qty_bought × buy_price
  cash: number;                // Σ proceeds
  realizedPnl: number;
  unrealizedPnl: number | null; // null when any live price is missing
  totalPnl: number | null;
  roiPct: number | null;
  portfolioValue: number | null; // cash + Σ remaining × live price
  qtySoldPct: number;          // % of bought value already sold (by cost basis)
}

export interface AssetBreakdown {
  asset: string;
  invested: number;
  cash: number;
  realizedPnl: number;
  qtyRemaining: number;
  valueNow: number | null;     // cash + remaining × live price
  unrealizedPnl: number | null;
  allocationPct: number | null; // share of total portfolio value
}

export interface MonthlyPnl {
  month: string;               // "2026-01"
  proceeds: number;
  realizedPnl: number;
}

export interface CumulativePoint {
  t: number;                   // unix ms of the sale
  cash: number;                // cumulative proceeds
  realizedPnl: number;         // cumulative realized P/L
}

export interface SaleHighlight {
  positionName: string;
  asset: string;
  batchNumber: number;
  saleDate: string;            // ISO yyyy-mm-dd
  pnlIdr: number;
  pnlPct: number;
}

export interface SaleStats {
  count: number;
  winCount: number;
  winRatePct: number | null;   // % of batches sold above buy price
  avgUpliftPct: number | null; // mean (sell − buy)/buy across sales
  avgHoldingDays: number | null; // mean days between buy date and sale date
  best: SaleHighlight | null;
  worst: SaleHighlight | null;
}

export interface PortfolioAnalytics {
  totals: PortfolioTotals;
  perAsset: AssetBreakdown[];
  monthly: MonthlyPnl[];
  cumulative: CumulativePoint[];
  saleStats: SaleStats;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function buildPortfolioAnalytics(
  positions: Position[],
  sales: SaleWithPosition[],
  livePricesIdr: Map<string, number>
): PortfolioAnalytics {
  const salesByPosition = new Map<number, SaleWithPosition[]>();
  for (const s of sales) {
    const list = salesByPosition.get(s.position_id) ?? [];
    list.push(s);
    salesByPosition.set(s.position_id, list);
  }

  // ---- Totals + per-asset ----
  let invested = 0;
  let cash = 0;
  let realizedPnl = 0;
  let soldCostBasis = 0;
  let unrealizedPnl: number | null = 0;
  let remainingValue: number | null = 0;

  const byAsset = new Map<string, AssetBreakdown>();

  for (const p of positions) {
    const pSales = salesByPosition.get(p.id) ?? [];
    const pInvested = p.xrp_qty * p.buy_price_idr;
    const pQtySold = pSales.reduce((s, x) => s + x.xrp_qty_sold, 0);
    const pCash = pSales.reduce((s, x) => s + x.xrp_qty_sold * x.sell_price_idr, 0);
    const pRealized = pCash - pQtySold * p.buy_price_idr;
    const pRemaining = Math.max(0, p.xrp_qty - pQtySold);

    invested += pInvested;
    cash += pCash;
    realizedPnl += pRealized;
    soldCostBasis += pQtySold * p.buy_price_idr;

    const price = livePricesIdr.get(p.asset);
    if (price == null) {
      unrealizedPnl = null;
      remainingValue = null;
    } else if (unrealizedPnl != null && remainingValue != null) {
      unrealizedPnl += pRemaining * (price - p.buy_price_idr);
      remainingValue += pRemaining * price;
    }

    const a = byAsset.get(p.asset) ?? {
      asset: p.asset,
      invested: 0,
      cash: 0,
      realizedPnl: 0,
      qtyRemaining: 0,
      valueNow: 0 as number | null,
      unrealizedPnl: 0 as number | null,
      allocationPct: null,
    };
    a.invested += pInvested;
    a.cash += pCash;
    a.realizedPnl += pRealized;
    a.qtyRemaining += pRemaining;
    if (price == null) {
      a.valueNow = null;
      a.unrealizedPnl = null;
    } else {
      if (a.valueNow != null) a.valueNow += pCash + pRemaining * price;
      if (a.unrealizedPnl != null) a.unrealizedPnl += pRemaining * (price - p.buy_price_idr);
    }
    byAsset.set(p.asset, a);
  }

  const portfolioValue = remainingValue != null ? cash + remainingValue : null;
  const totalPnl = unrealizedPnl != null ? realizedPnl + unrealizedPnl : null;

  const perAsset = [...byAsset.values()].sort(
    (a, b) => (b.valueNow ?? b.invested) - (a.valueNow ?? a.invested)
  );
  if (portfolioValue != null && portfolioValue > 0) {
    for (const a of perAsset) {
      a.allocationPct = a.valueNow != null ? (a.valueNow / portfolioValue) * 100 : null;
    }
  }

  const totals: PortfolioTotals = {
    invested,
    cash,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    roiPct: totalPnl != null && invested > 0 ? (totalPnl / invested) * 100 : null,
    portfolioValue,
    qtySoldPct: invested > 0 ? (soldCostBasis / invested) * 100 : 0,
  };

  // ---- Monthly realized P/L ----
  const monthlyMap = new Map<string, MonthlyPnl>();
  for (const s of sales) {
    const month = isoDay(s.sale_date).slice(0, 7);
    const proceeds = s.xrp_qty_sold * s.sell_price_idr;
    const pnl = proceeds - s.xrp_qty_sold * s.buy_price_idr;
    const m = monthlyMap.get(month) ?? { month, proceeds: 0, realizedPnl: 0 };
    m.proceeds += proceeds;
    m.realizedPnl += pnl;
    monthlyMap.set(month, m);
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  // ---- Cumulative cash / realized P/L timeline ----
  const chronological = [...sales].sort(
    (a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
  );
  const cumulative: CumulativePoint[] = [];
  let cumCash = 0;
  let cumPnl = 0;
  for (const s of chronological) {
    const proceeds = s.xrp_qty_sold * s.sell_price_idr;
    cumCash += proceeds;
    cumPnl += proceeds - s.xrp_qty_sold * s.buy_price_idr;
    cumulative.push({ t: new Date(s.sale_date).getTime(), cash: cumCash, realizedPnl: cumPnl });
  }

  // ---- Sale performance stats ----
  const startDates = new Map(positions.map((p) => [p.id, new Date(p.start_date).getTime()]));
  let winCount = 0;
  let upliftSum = 0;
  let holdingSum = 0;
  let holdingCount = 0;
  let best: SaleHighlight | null = null;
  let worst: SaleHighlight | null = null;

  for (const s of chronological) {
    const proceeds = s.xrp_qty_sold * s.sell_price_idr;
    const pnl = proceeds - s.xrp_qty_sold * s.buy_price_idr;
    const pnlPct = s.buy_price_idr > 0 ? ((s.sell_price_idr - s.buy_price_idr) / s.buy_price_idr) * 100 : 0;
    if (pnl > 0) winCount++;
    upliftSum += pnlPct;

    const bought = startDates.get(s.position_id);
    if (bought != null) {
      const days = (new Date(s.sale_date).getTime() - bought) / DAY_MS;
      if (days >= 0) {
        holdingSum += days;
        holdingCount++;
      }
    }

    const highlight: SaleHighlight = {
      positionName: s.position_name,
      asset: s.asset,
      batchNumber: s.batch_number,
      saleDate: isoDay(s.sale_date),
      pnlIdr: pnl,
      pnlPct,
    };
    if (best == null || pnlPct > best.pnlPct) best = highlight;
    if (worst == null || pnlPct < worst.pnlPct) worst = highlight;
  }

  const saleStats: SaleStats = {
    count: chronological.length,
    winCount,
    winRatePct: chronological.length > 0 ? (winCount / chronological.length) * 100 : null,
    avgUpliftPct: chronological.length > 0 ? upliftSum / chronological.length : null,
    avgHoldingDays: holdingCount > 0 ? holdingSum / holdingCount : null,
    best,
    worst,
  };

  return { totals, perAsset, monthly, cumulative, saleStats };
}
