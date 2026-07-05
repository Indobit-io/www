// Pure portfolio math — no DB or React imports

import type { Position, Sale } from "./db";

export interface BatchRow {
  batchNumber: number;
  saleId: number | null;
  saleDate: string | null;
  sellPriceIdr: number | null;
  qtySold: number | null;
  proceedsIdr: number | null;       // qtySold × sellPrice (cash in)
  costBasisIdr: number | null;      // qtySold × buyPrice
  pnlIdr: number | null;            // proceeds − costBasis
  pnlPct: number | null;            // (sellPrice − buyPrice) / buyPrice × 100
  qtyRemainingAfter: number;        // crypto left after this batch
  cumulativeCashIdr: number;        // total cash after this batch
  cumulativeRealizedPnl: number;    // realized P/L after this batch
  suggestedQty: number | null;      // for unsold batches: remaining / batches left
  notes: string | null;
}

export interface PositionSummary {
  purchaseCost: number;             // xrp_qty × buy_price (modal)
  qtyBought: number;
  qtySold: number;
  qtyRemaining: number;
  batchesSold: number;
  batchesRemaining: number;
  cashIdr: number;                  // Σ proceeds from all sales
  realizedPnl: number;              // Σ qtySold × (sellPrice − buyPrice)
  avgSellPriceIdr: number | null;   // cash / qtySold
  // Price the remaining coins must sell at for cash to fully cover the modal.
  // null when already recovered (cash ≥ cost) or nothing left to sell.
  breakEvenPriceIdr: number | null;
}

export function buildBatches(position: Position, sales: Sale[]): BatchRow[] {
  const buyPrice = position.buy_price_idr;
  const saleMap = new Map(sales.map((s) => [s.batch_number, s]));
  const rows: BatchRow[] = [];

  let qtyRemaining = position.xrp_qty;
  let cumulativeCash = 0;
  let cumulativeRealized = 0;

  for (let b = 1; b <= position.total_batches; b++) {
    const sale = saleMap.get(b) ?? null;

    if (sale) {
      const proceeds = sale.xrp_qty_sold * sale.sell_price_idr;
      const costBasis = sale.xrp_qty_sold * buyPrice;
      const pnl = proceeds - costBasis;
      qtyRemaining -= sale.xrp_qty_sold;
      cumulativeCash += proceeds;
      cumulativeRealized += pnl;

      rows.push({
        batchNumber: b,
        saleId: sale.id,
        saleDate: sale.sale_date,
        sellPriceIdr: sale.sell_price_idr,
        qtySold: sale.xrp_qty_sold,
        proceedsIdr: proceeds,
        costBasisIdr: costBasis,
        pnlIdr: pnl,
        pnlPct: buyPrice > 0 ? ((sale.sell_price_idr - buyPrice) / buyPrice) * 100 : null,
        qtyRemainingAfter: qtyRemaining,
        cumulativeCashIdr: cumulativeCash,
        cumulativeRealizedPnl: cumulativeRealized,
        suggestedQty: null,
        notes: sale.notes,
      });
    } else {
      const batchesLeft = position.total_batches - b + 1;
      rows.push({
        batchNumber: b,
        saleId: null,
        saleDate: null,
        sellPriceIdr: null,
        qtySold: null,
        proceedsIdr: null,
        costBasisIdr: null,
        pnlIdr: null,
        pnlPct: null,
        qtyRemainingAfter: qtyRemaining,
        cumulativeCashIdr: cumulativeCash,
        cumulativeRealizedPnl: cumulativeRealized,
        suggestedQty: batchesLeft > 0 ? qtyRemaining / batchesLeft : null,
        notes: null,
      });
    }
  }

  return rows;
}

export function buildSummary(position: Position, sales: Sale[]): PositionSummary {
  const purchaseCost = position.xrp_qty * position.buy_price_idr;

  const qtySold = sales.reduce((s, sale) => s + sale.xrp_qty_sold, 0);
  const qtyRemaining = Math.max(0, position.xrp_qty - qtySold);
  const cashIdr = sales.reduce((s, sale) => s + sale.xrp_qty_sold * sale.sell_price_idr, 0);
  const realizedPnl = cashIdr - qtySold * position.buy_price_idr;

  const batchesSold = sales.length;
  const batchesRemaining = Math.max(0, position.total_batches - batchesSold);

  const avgSellPriceIdr = qtySold > 0 ? cashIdr / qtySold : null;

  const shortfall = purchaseCost - cashIdr;
  const breakEvenPriceIdr =
    shortfall > 0 && qtyRemaining > 0 ? shortfall / qtyRemaining : null;

  return {
    purchaseCost,
    qtyBought: position.xrp_qty,
    qtySold,
    qtyRemaining,
    batchesSold,
    batchesRemaining,
    cashIdr,
    realizedPnl,
    avgSellPriceIdr,
    breakEvenPriceIdr,
  };
}

// Live valuation on top of a summary, given the current market price.
export interface LiveValuation {
  cryptoValueIdr: number;           // qtyRemaining × price
  totalValueIdr: number;            // cash + cryptoValue
  unrealizedPnl: number;            // qtyRemaining × (price − buyPrice)
  totalPnl: number;                 // realized + unrealized
  roiPct: number | null;            // totalPnl / purchaseCost × 100
}

export function valueAtPrice(
  summary: PositionSummary,
  buyPriceIdr: number,
  currentPriceIdr: number
): LiveValuation {
  const cryptoValueIdr = summary.qtyRemaining * currentPriceIdr;
  const totalValueIdr = summary.cashIdr + cryptoValueIdr;
  const unrealizedPnl = summary.qtyRemaining * (currentPriceIdr - buyPriceIdr);
  const totalPnl = summary.realizedPnl + unrealizedPnl;
  const roiPct =
    summary.purchaseCost > 0 ? (totalPnl / summary.purchaseCost) * 100 : null;
  return { cryptoValueIdr, totalValueIdr, unrealizedPnl, totalPnl, roiPct };
}
