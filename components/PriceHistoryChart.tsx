"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Props {
  asset: string;
  buyPriceIdr: number;
  breakEvenPriceIdr: number | null;
}

interface Point {
  t: number;
  price: number;
}

const RANGES = [7, 30, 90] as const;

function fmtAxis(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}jt`;
  return `${(v / 1_000).toFixed(1)}k`;
}

function fmtDate(t: number, days: number) {
  const d = new Date(t);
  if (days <= 7) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function TooltipContent({ active, payload, days }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Point }>;
  days: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-cmc-surface-2 border border-cmc-border px-3 py-2.5 rounded-xl text-xs space-y-1 shadow-xl">
      <div className="text-cmc-text-muted font-medium">{fmtDate(p.payload.t, days)}</div>
      <div className="text-cmc-text font-semibold">
        Rp {Number(p.value).toLocaleString("id-ID")}
      </div>
    </div>
  );
}

export function PriceHistoryChart({ asset, buyPriceIdr, breakEvenPriceIdr }: Props) {
  const [days, setDays] = useState<number>(30);
  const [points, setPoints] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/price-history?asset=${asset}&days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Point[]) => {
        if (!cancelled) {
          setPoints(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asset, days]);

  // Keep the buy/break-even reference lines inside the visible domain
  const values = (points ?? []).map((p) => p.price);
  const refs = [buyPriceIdr, ...(breakEvenPriceIdr != null ? [breakEvenPriceIdr] : [])];
  const lo = values.length ? Math.min(...values, ...refs) : 0;
  const hi = values.length ? Math.max(...values, ...refs) : 0;
  const pad = (hi - lo) * 0.06 || hi * 0.02;

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-3">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              days === r
                ? "bg-cmc-blue/20 text-cmc-blue"
                : "text-cmc-text-muted hover:text-cmc-text"
            }`}
          >
            {r}H
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-52 text-sm text-cmc-text-muted">
          Memuat grafik…
        </div>
      ) : error || !points?.length ? (
        <div className="flex items-center justify-center h-52 text-sm text-cmc-text-muted border border-dashed border-cmc-border rounded-xl">
          Riwayat harga tidak tersedia
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="t"
              tickFormatter={(t: number) =>
                new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
              }
              tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
              axisLine={{ stroke: "#21262d" }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              domain={[lo - pad, hi + pad]}
              tickFormatter={fmtAxis}
              tick={{ fill: "#5c6370", fontSize: 11, fontFamily: "Inter" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<TooltipContent days={days} />} />
            <ReferenceLine
              y={buyPriceIdr}
              stroke="#5c6370"
              strokeDasharray="4 4"
              label={{ value: "Beli", position: "insideBottomLeft", fill: "#5c6370", fontSize: 10 }}
            />
            {breakEvenPriceIdr != null && (
              <ReferenceLine
                y={breakEvenPriceIdr}
                stroke="#f0b90b"
                strokeDasharray="4 4"
                label={{ value: "BEP", position: "insideTopLeft", fill: "#f0b90b", fontSize: 10 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="price"
              name="Harga"
              stroke="#3861fb"
              strokeWidth={2}
              fill="#3861fb18"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
