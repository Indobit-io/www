import Link from "next/link";
import { notFound } from "next/navigation";
import { correlateToken, VERDICT_COPY } from "@/lib/analysis";
import { addressUrl, chain, txUrl } from "@/lib/chains";
import { hasDatabase, recentTransfers, tokenBySymbol } from "@/lib/db";
import { MIN_TRANSFER_USD } from "@/lib/ingest";
import {
  addr,
  ago,
  coef,
  num,
  pct,
  pValue,
  price,
  qty,
  signColor,
  strengthColor,
  strengthLabel,
  usd,
} from "@/lib/fmt";
import FlowPriceChart from "@/components/FlowPriceChart";
import FlowReturnScatter from "@/components/FlowReturnScatter";
import LagChart from "@/components/LagChart";
import Stat from "@/components/Stat";

export const dynamic = "force-dynamic";

const WINDOWS = [7, 14, 30, 90];
/** Hours rendered in the flow/price chart; the full window still drives the maths. */
const CHART_HOURS = 336;

export default async function TokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ days?: string; hubs?: string }>;
}) {
  const [{ symbol }, sp] = await Promise.all([params, searchParams]);
  if (!hasDatabase()) notFound();

  const token = await tokenBySymbol(decodeURIComponent(symbol));
  if (!token) notFound();

  const days = WINDOWS.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const includeHubs = sp.hubs !== "0";

  const [report, transfers] = await Promise.all([
    correlateToken(token.id, { windowDays: days, includeHubs }),
    recentTransfers({ tokenId: token.id, limit: 40, whalesOnly: true }),
  ]);
  if (!report) notFound();

  const verdict = VERDICT_COPY[report.verdict] ?? VERDICT_COPY["no-relationship"];
  const best = report.scan.best;
  const concurrent = report.scan.concurrent;
  const bestLag = best?.lag ?? 0;

  const chartData = report.buckets.slice(-CHART_HOURS);
  const scatter = report.buckets.map((b, i) => ({
    flow: b.net_usd,
    ret: report.buckets[i + bestLag]?.ret ?? 0,
    ts: b.ts,
  }));

  const href = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ days: String(days), hubs: includeHubs ? "1" : "0" });
    for (const [k, v] of Object.entries(over)) p.set(k, String(v));
    return `/tokens/${token.symbol}?${p}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{chain(token.chain_id).name}</span>
            {token.market_rank ? <span className="chip">mcap #{token.market_rank}</span> : null}
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            {token.symbol} <span className="text-cmc-text-muted">{token.name}</span>
          </h1>
          <a
            href={addressUrl(token.chain_id, token.contract)}
            target="_blank"
            rel="noreferrer"
            className="mono mt-1 block break-all text-[12px] text-cmc-text-secondary hover:text-cmc-blue"
          >
            {token.contract} ↗
          </a>
        </div>
        <div className="text-right">
          <div className="mono text-xl font-semibold">{price(token.price_usd)}</div>
          <div className={`mono text-[13px] ${signColor(token.price_change_24h)}`}>
            {pct(token.price_change_24h)} 24h
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((d) => (
          <Link
            key={d}
            href={href({ days: d })}
            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
              d === days
                ? "border-cmc-blue bg-cmc-blue/10 text-cmc-text"
                : "border-cmc-border text-cmc-text-secondary hover:text-cmc-text"
            }`}
          >
            {d}d
          </Link>
        ))}
        <Link
          href={href({ hubs: includeHubs ? 0 : 1 })}
          className={`ml-2 rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
            includeHubs
              ? "border-cmc-border text-cmc-text-secondary hover:text-cmc-text"
              : "border-cmc-blue bg-cmc-blue/10 text-cmc-text"
          }`}
        >
          {includeHubs ? "Exclude exchange-like hubs" : "Hubs excluded — include them"}
        </Link>
      </div>

      <div className="card p-5">
        <div className="text-[11px] uppercase tracking-wide text-cmc-text-muted">
          Does whale flow relate to price?
        </div>
        <div className={`mt-1 text-2xl font-semibold ${verdict.tone}`}>{verdict.label}</div>
        <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-cmc-text-secondary">
          {verdict.detail}
        </p>

        {best ? (
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat
              label="Best lag"
              value={`${bestLag > 0 ? "+" : ""}${bestLag}h`}
              sub={bestLag > 0 ? "flow first" : bestLag < 0 ? "price first" : "same hour"}
            />
            <Stat
              label="Pearson r"
              value={coef(best.pearson)}
              valueClass={strengthColor(best.pearson, report.scan.bestIsSignificant)}
              sub={strengthLabel(best.pearson, report.scan.bestIsSignificant)}
            />
            <Stat
              label="Spearman rho"
              value={coef(best.spearman)}
              sub="rank-based, outlier-resistant"
            />
            <Stat
              label="p-value"
              value={pValue(best.pValue)}
              sub={`threshold ${report.scan.bonferroniAlpha.toFixed(4)}`}
            />
            <Stat
              label="Direction hit rate"
              value={`${(report.hitRate.rate * 100).toFixed(0)}%`}
              sub={`${report.hitRate.hits}/${report.hitRate.n} · p ${pValue(report.hitRate.pValue)}`}
            />
          </div>
        ) : null}

        {concurrent ? (
          <p className="mt-4 text-[12px] text-cmc-text-muted">
            Same-hour (lag 0): r {coef(concurrent.pearson)}, ρ {coef(concurrent.spearman)}, p{" "}
            {pValue(concurrent.pValue)} over n = {concurrent.n}. Log-scaled flow at the same lag: r{" "}
            {coef(report.scanSigned.lags.find((l) => l.lag === bestLag)?.pearson ?? 0)}.
          </p>
        ) : null}
      </div>

      {report.warnings.length ? (
        <div className="card border-cmc-yellow/25 p-4">
          <div className="text-[11px] uppercase tracking-wide text-cmc-yellow">Read this first</div>
          <ul className="mt-2 space-y-1.5">
            {report.warnings.map((w, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-cmc-text-secondary">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Correlation by lag</h2>
          <p className="mb-2 mt-0.5 text-[12px] text-cmc-text-secondary">
            Whale netflow at hour t against the return at hour t + lag. Bars are coloured only where
            p clears {report.scan.bonferroniAlpha.toFixed(4)}.
          </p>
          <LagChart lags={report.scan.lags} alpha={report.scan.bonferroniAlpha} />
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold">Flow against return</h2>
          <p className="mb-2 mt-0.5 text-[12px] text-cmc-text-secondary">
            Each dot is one hour with whale flow, plotted against the return {bestLag >= 0 ? "+" : ""}
            {bestLag}h later.
          </p>
          <FlowReturnScatter points={scatter} lag={bestLag} />
        </section>
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold">Whale netflow and price</h2>
        <p className="mb-2 mt-0.5 text-[12px] text-cmc-text-secondary">
          Last {Math.min(CHART_HOURS, report.buckets.length)} hours. Bars are hourly netflow,
          the line is price.
        </p>
        <FlowPriceChart data={chartData} />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hours analysed" value={num(report.buckets.length)} sub={`${days}-day window`} />
        <Stat
          label="Hours with flow"
          value={num(report.activeBuckets)}
          sub={`${((report.activeBuckets / Math.max(report.buckets.length, 1)) * 100).toFixed(0)}% of hours`}
        />
        <Stat label="Forward-filled prices" value={num(report.filledBuckets)} sub="gaps in the price feed" />
        <Stat label="Hubs" value={includeHubs ? "included" : "excluded"} sub="exchange-like addresses" />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Recent whale transfers</h2>
        {transfers.length === 0 ? (
          <div className="card px-6 py-8 text-center text-[13px] text-cmc-text-secondary">
            No whale transfers recorded for {token.symbol} yet.
          </div>
        ) : (
          <div className="card scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="num">Amount</th>
                  <th className="num">Value</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-cmc-text-secondary">{ago(t.block_time)}</td>
                    <td>
                      {t.from_is_whale ? (
                        <Link href={`/whales/${t.from_addr}`} className="mono hover:underline">
                          {t.from_label ?? addr(t.from_addr)}
                        </Link>
                      ) : (
                        <span className="mono text-cmc-text-muted">{addr(t.from_addr)}</span>
                      )}
                    </td>
                    <td>
                      {t.to_is_whale ? (
                        <Link href={`/whales/${t.to_addr}`} className="mono hover:underline">
                          {t.to_label ?? addr(t.to_addr)}
                        </Link>
                      ) : (
                        <span className="mono text-cmc-text-muted">{addr(t.to_addr)}</span>
                      )}
                    </td>
                    <td className="num mono">{qty(Number(t.qty), t.symbol)}</td>
                    <td className="num mono">{usd(Number(t.usd_value))}</td>
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
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold">How this number is built</h2>
        <ol className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-cmc-text-secondary">
          <li>
            1. Every ERC-20 Transfer of {token.symbol} worth {usd(MIN_TRANSFER_USD)} or more that
            touches a tracked whale is bucketed into the hour it landed in.
          </li>
          <li>
            2. Netflow for an hour is whale inflow minus outflow. A transfer between two tracked
            whales nets to zero, because nothing left the group.
          </li>
          <li>
            3. Returns are log returns of the hourly price. Hours where the price feed had a gap are
            forward-filled and carry a zero return.
          </li>
          <li>
            4. Pearson and Spearman are computed at every lag from −6h to +6h. Because 13 lags are
            tested, significance uses a Bonferroni-adjusted threshold rather than a bare p &lt; 0.05.
          </li>
          <li>
            5. Correlation is not causation, and this is observational data with no control. A
            significant lead is a reason to look closer, never a reason to trade.
          </li>
        </ol>
      </section>
    </div>
  );
}
