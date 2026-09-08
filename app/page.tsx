import Link from "next/link";
import { movers } from "@/lib/analysis";
import { hasDatabase, pipelineStats } from "@/lib/db";
import { hasEtherscanKey } from "@/lib/etherscan";
import { MIN_TRANSFER_USD } from "@/lib/ingest";
import { num, pct, signColor, usd } from "@/lib/fmt";
import SetupNotice from "@/components/SetupNotice";
import Stat from "@/components/Stat";

export const dynamic = "force-dynamic";

const WINDOWS = [
  { hours: 6, label: "6h" },
  { hours: 24, label: "24h" },
  { hours: 72, label: "3d" },
  { hours: 168, label: "7d" },
];

function zBadge(z: number) {
  if (z >= 3) return { text: "extreme", cls: "border-cmc-red/50 text-cmc-red" };
  if (z >= 2) return { text: "unusual", cls: "border-cmc-yellow/50 text-cmc-yellow" };
  if (z >= 1) return { text: "elevated", cls: "border-cmc-blue/50 text-cmc-blue" };
  return null;
}

export default async function MoversPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const sp = await searchParams;
  const hours = WINDOWS.some((w) => String(w.hours) === sp.hours) ? Number(sp.hours) : 24;

  if (!hasDatabase()) {
    return <SetupNotice missing={{ database: true, etherscan: !hasEtherscanKey(), noData: true }} />;
  }

  const [rows, stats] = await Promise.all([movers({ hours, limit: 60 }), pipelineStats()]);

  if (!rows.length) {
    return (
      <SetupNotice
        missing={{ database: false, etherscan: !hasEtherscanKey(), noData: true }}
      />
    );
  }

  const grossTotal = rows.reduce((a, r) => a + r.gross_usd, 0);
  const netTotal = rows.reduce((a, r) => a + r.net_usd, 0);
  const transfers = rows.reduce((a, r) => a + r.transfers, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tokens whales are moving</h1>
          <p className="mt-1 text-[13px] text-cmc-text-secondary">
            Transfers of {usd(MIN_TRANSFER_USD)} or more touching one of the top{" "}
            {num(stats.whales)} addresses by volume moved.
          </p>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.hours}
              href={`/?hours=${w.hours}`}
              className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                w.hours === hours
                  ? "border-cmc-blue bg-cmc-blue/10 text-cmc-text"
                  : "border-cmc-border text-cmc-text-secondary hover:text-cmc-text"
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Whale volume · ${hours}h`} value={usd(grossTotal)} sub={`${num(transfers)} transfers`} />
        <Stat
          label="Net accumulation"
          value={usd(netTotal, { sign: true })}
          valueClass={signColor(netTotal)}
          sub={netTotal >= 0 ? "whales received more than they sent" : "whales sent more than they received"}
        />
        <Stat label="Tokens active" value={num(rows.length)} sub={`of ${num(stats.tracked_tokens)} indexed`} />
        <Stat label="Whales tracked" value={num(stats.whales)} sub={`${num(stats.transfers)} transfers stored`} />
      </div>

      <div className="card scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Token</th>
              <th className="num">Whale volume</th>
              <th className="num">Net flow</th>
              <th className="num">vs baseline</th>
              <th className="num">Whales</th>
              <th className="num">Transfers</th>
              <th className="num">Price 24h</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const badge = zBadge(m.volume_z);
              return (
                <tr key={m.token_id}>
                  <td className="num text-cmc-text-muted">{i + 1}</td>
                  <td>
                    <Link href={`/tokens/${m.symbol}`} className="flex items-center gap-2 hover:underline">
                      <span className="font-medium">{m.symbol}</span>
                      <span className="hidden text-cmc-text-muted sm:inline">{m.name}</span>
                    </Link>
                  </td>
                  <td className="num mono">{usd(m.gross_usd)}</td>
                  <td className={`num mono ${signColor(m.net_usd)}`}>
                    {usd(m.net_usd, { sign: true })}
                  </td>
                  <td className="num mono">
                    {m.baseline_days >= 3 ? (
                      <span className="text-cmc-text-secondary">
                        {m.volume_z > 0 ? "+" : ""}
                        {m.volume_z.toFixed(1)}σ
                      </span>
                    ) : (
                      <span className="text-cmc-text-muted" title="Needs 3+ days of history">
                        —
                      </span>
                    )}
                  </td>
                  <td className="num mono">{num(m.whales)}</td>
                  <td className="num mono">{num(m.transfers)}</td>
                  <td className={`num mono ${signColor(m.price_change_24h)}`}>
                    {pct(m.price_change_24h)}
                  </td>
                  <td>
                    {badge ? (
                      <span className={`chip ${badge.cls}`}>{badge.text}</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] leading-relaxed text-cmc-text-muted">
        Net flow is whale inflow minus outflow, so a positive number means the tracked set received
        more than it sent. It is not a buy/sell signal: an address moving between its own wallets,
        or into an exchange it controls, produces flow with no trade behind it. &ldquo;vs
        baseline&rdquo; scales the window to a daily rate and compares it with the token&rsquo;s own
        30-day daily mean, so a normally quiet token waking up ranks above one that is always busy.
      </p>
    </div>
  );
}
