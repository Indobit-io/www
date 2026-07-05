"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { idr, qty, pct, pnlColor, date } from "@/lib/fmt";
import type { BatchRow } from "@/lib/calc";

interface Props {
  rows: BatchRow[];
  positionId: number;
  asset: string;
  currentPriceIdr: number | null;
}

function TargetCell({
  positionId, row, currentPriceIdr, onChanged,
}: {
  positionId: number;
  row: BatchRow;
  currentPriceIdr: number | null;
  onChanged: () => void;
}) {
  const sold = row.saleId != null;
  const [value, setValue] = useState(row.targetPriceIdr != null ? String(row.targetPriceIdr) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = Number(value.replace(/\D/g, ""));
    const current = row.targetPriceIdr;
    const cleared = !value.trim();
    if (cleared && current == null) return;
    if (!cleared && (!parsed || parsed === current)) return;

    setSaving(true);
    try {
      await fetch(`/api/positions/${positionId}/targets`, {
        method: cleared ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          cleared
            ? { batch_number: row.batchNumber }
            : { batch_number: row.batchNumber, target_price_idr: parsed }
        ),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  if (sold) {
    if (row.targetPriceIdr == null) return <span className="text-cmc-border">—</span>;
    const hit = row.sellPriceIdr != null && row.sellPriceIdr >= row.targetPriceIdr;
    return (
      <span className={`text-xs font-medium ${hit ? "text-cmc-green" : "text-cmc-text-muted"}`}>
        {idr(row.targetPriceIdr)}{hit ? " ✓" : ""}
      </span>
    );
  }

  const reached =
    row.targetPriceIdr != null && currentPriceIdr != null && currentPriceIdr >= row.targetPriceIdr;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        disabled={saving}
        placeholder="target"
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-24 bg-cmc-bg border border-cmc-border rounded-md px-2 py-1 text-xs text-right text-cmc-text placeholder:text-cmc-text-muted/50 outline-none focus:border-cmc-blue transition-colors disabled:opacity-50"
      />
      {reached && (
        <span className="text-[10px] font-semibold text-cmc-green">✓ tercapai</span>
      )}
    </div>
  );
}

function RowActions({
  positionId, row, onChanged,
}: {
  positionId: number;
  row: BatchRow;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (row.saleId == null) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/positions/${positionId}/sales`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_number: row.batchNumber }),
      });
      onChanged();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold text-cmc-red hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {deleting ? "..." : "Yakin?"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-xs text-cmc-text-muted hover:text-cmc-text transition-colors"
        >
          batal
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
      <Link
        href={`/positions/${positionId}/sell?batch=${row.batchNumber}`}
        className="text-xs text-cmc-blue hover:text-blue-400 font-medium transition-colors"
      >
        Edit
      </Link>
      <button
        onClick={() => setConfirming(true)}
        title="Hapus batch ini"
        className="text-xs text-cmc-text-muted hover:text-cmc-red transition-colors"
      >
        ✕
      </button>
    </span>
  );
}

export function BatchTable({ rows, positionId, asset, currentPriceIdr }: Props) {
  const router = useRouter();
  const totalProceeds = rows.reduce((s, r) => s + (r.proceedsIdr ?? 0), 0);
  const totalPnl = rows.reduce((s, r) => s + (r.pnlIdr ?? 0), 0);

  const refresh = () => router.refresh();

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm border-collapse min-w-[820px]">
        <thead>
          <tr className="border-b border-cmc-border text-xs font-semibold text-cmc-text-muted uppercase tracking-wide">
            <th className="text-left py-3 pr-3 whitespace-nowrap">Batch</th>
            <th className="text-left py-3 pr-3 whitespace-nowrap">Tanggal</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Target</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Harga Jual</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">{asset} Dijual</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Cash Masuk</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">P/L</th>
            <th className="text-right py-3 pr-3 whitespace-nowrap">Sisa {asset}</th>
            <th className="text-right py-3 whitespace-nowrap">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const sold = row.saleId != null;
            return (
              <tr
                key={row.batchNumber}
                className="border-b border-cmc-border/50 hover:bg-cmc-surface-2/50 transition-colors"
              >
                <td className="py-3 pr-3 text-cmc-text-muted text-xs">{row.batchNumber}</td>
                <td className="py-3 pr-3 text-cmc-text-secondary whitespace-nowrap">
                  {sold ? date(row.saleDate) : <span className="text-cmc-border">—</span>}
                  {row.notes && (
                    <span
                      title={row.notes}
                      className="ml-1.5 text-cmc-text-muted cursor-help"
                    >
                      💬
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right">
                  <TargetCell
                    positionId={positionId}
                    row={row}
                    currentPriceIdr={currentPriceIdr}
                    onChanged={refresh}
                  />
                </td>
                <td className="py-3 pr-3 text-right">
                  {sold ? (
                    <span className="text-cmc-text font-medium">{idr(row.sellPriceIdr)}</span>
                  ) : (
                    <Link
                      href={`/positions/${positionId}/sell?batch=${row.batchNumber}`}
                      className="text-cmc-blue hover:text-blue-400 transition-colors text-xs font-medium"
                    >
                      + Jual
                    </Link>
                  )}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-text">
                  {sold ? (
                    qty(row.qtySold, 0, asset)
                  ) : row.suggestedQty != null ? (
                    <span className="text-cmc-text-muted text-xs">≈ {qty(row.suggestedQty, 0, asset)}</span>
                  ) : (
                    <span className="text-cmc-border">—</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-yellow font-medium">
                  {sold ? idr(row.proceedsIdr, true) : <span className="text-cmc-border">—</span>}
                </td>
                <td className={`py-3 pr-3 text-right font-semibold ${pnlColor(row.pnlIdr)}`}>
                  {sold ? (
                    <>
                      {idr(row.pnlIdr, true)}
                      {row.pnlPct != null && (
                        <span className="ml-1 text-xs font-medium">{pct(row.pnlPct)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-cmc-border">—</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right text-cmc-text-secondary">
                  {sold ? qty(row.qtyRemainingAfter, 0, asset) : <span className="text-cmc-border">—</span>}
                </td>
                <td className="py-3 text-right">
                  <RowActions positionId={positionId} row={row} onChanged={refresh} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-cmc-border text-xs">
            <td colSpan={5} className="py-2.5 pr-3 font-semibold uppercase tracking-wide text-cmc-text-muted">
              Total Terjual
            </td>
            <td className="py-2.5 pr-3 text-right text-cmc-yellow font-semibold">
              {idr(totalProceeds, true)}
            </td>
            <td className={`py-2.5 pr-3 text-right font-semibold ${pnlColor(totalPnl)}`}>
              {idr(totalPnl, true)}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
