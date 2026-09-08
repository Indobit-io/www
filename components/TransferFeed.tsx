"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { addressUrl, txUrl } from "@/lib/chains";
import { addr, ago, qty, usd } from "@/lib/fmt";
import type { TransferRow } from "@/lib/db";

const REFRESH_MS = 20_000;

/** Live tail of large transfers. Polls rather than streams — the ingester only
 *  writes every few minutes, so a socket would sit idle. */
export default function TransferFeed({
  initial,
  minUsd,
}: {
  initial: TransferRow[];
  minUsd: number;
}) {
  const [rows, setRows] = useState(initial);
  const [threshold, setThreshold] = useState(minUsd);
  const [whalesOnly, setWhalesOnly] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: "150",
        min_usd: String(threshold),
        ...(whalesOnly ? { whales: "1" } : {}),
      });
      const res = await fetch(`/api/transfers?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { transfers: TransferRow[] };
      setRows(data.transfers);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  }, [threshold, whalesOnly]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const thresholds = [minUsd, 1_000_000, 5_000_000, 25_000_000].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {thresholds.map((t) => (
          <button
            key={t}
            onClick={() => setThreshold(t)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
              t === threshold
                ? "border-cmc-blue bg-cmc-blue/10 text-cmc-text"
                : "border-cmc-border text-cmc-text-secondary hover:text-cmc-text"
            }`}
          >
            ≥ {usd(t)}
          </button>
        ))}
        <button
          onClick={() => setWhalesOnly((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
            whalesOnly
              ? "border-cmc-blue bg-cmc-blue/10 text-cmc-text"
              : "border-cmc-border text-cmc-text-secondary hover:text-cmc-text"
          }`}
        >
          {whalesOnly ? "Tracked whales only" : "All large transfers"}
        </button>
        <span className="ml-auto text-[12px] text-cmc-text-muted">
          {error ? (
            <span className="text-cmc-red">{error}</span>
          ) : updatedAt ? (
            `updated ${updatedAt.toLocaleTimeString()}`
          ) : (
            "loading…"
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-10 text-center text-[13px] text-cmc-text-secondary">
          Nothing above {usd(threshold)} in the stored window.
        </div>
      ) : (
        <div className="card scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Token</th>
                <th>From</th>
                <th>To</th>
                <th className="num">Amount</th>
                <th className="num">Value</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-cmc-text-secondary">{ago(t.block_time)}</td>
                  <td>
                    <Link href={`/tokens/${t.symbol}`} className="font-medium hover:underline">
                      {t.symbol}
                    </Link>
                  </td>
                  <td>
                    {t.from_is_whale ? (
                      <Link href={`/whales/${t.from_addr}`} className="mono text-cmc-red hover:underline">
                        {t.from_label ?? addr(t.from_addr)}
                      </Link>
                    ) : (
                      <a
                        href={addressUrl(t.chain_id, t.from_addr)}
                        target="_blank"
                        rel="noreferrer"
                        className="mono text-cmc-text-muted hover:text-cmc-blue"
                      >
                        {addr(t.from_addr)}
                      </a>
                    )}
                  </td>
                  <td>
                    {t.to_is_whale ? (
                      <Link href={`/whales/${t.to_addr}`} className="mono text-cmc-green hover:underline">
                        {t.to_label ?? addr(t.to_addr)}
                      </Link>
                    ) : (
                      <a
                        href={addressUrl(t.chain_id, t.to_addr)}
                        target="_blank"
                        rel="noreferrer"
                        className="mono text-cmc-text-muted hover:text-cmc-blue"
                      >
                        {addr(t.to_addr)}
                      </a>
                    )}
                  </td>
                  <td className="num mono">{qty(Number(t.qty), t.symbol)}</td>
                  <td className="num mono font-medium">{usd(Number(t.usd_value))}</td>
                  <td>
                    <a
                      href={txUrl(t.chain_id, t.tx_hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-cmc-text-muted hover:text-cmc-blue"
                    >
                      {addr(t.tx_hash, 4)} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
