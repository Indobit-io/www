import Link from "next/link";
import { notFound } from "next/navigation";
import { addressUrl, txUrl } from "@/lib/chains";
import { getWhale, hasDatabase, recentTransfers, whaleTokenBreakdown } from "@/lib/db";
import { WHALE_WINDOW_DAYS } from "@/lib/ingest";
import { addr, ago, dateTime, num, qty, signColor, usd } from "@/lib/fmt";
import LabelEditor from "@/components/LabelEditor";
import Stat from "@/components/Stat";

export const dynamic = "force-dynamic";

export default async function WhalePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!hasDatabase() || !/^0x[0-9a-fA-F]{40}$/.test(address)) notFound();

  const whale = await getWhale(address);
  if (!whale) notFound();

  const [tokens, transfers] = await Promise.all([
    whaleTokenBreakdown(whale.address, WHALE_WINDOW_DAYS),
    recentTransfers({ address: whale.address, limit: 60 }),
  ]);

  const net = Number(whale.inflow_usd) - Number(whale.outflow_usd);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">rank #{whale.rank}</span>
            <span className="chip">{whale.kind}</span>
            {whale.is_contract === true ? <span className="chip">contract code</span> : null}
          </div>
          <h1 className="mt-2 break-all text-xl font-semibold tracking-tight">
            {whale.label ?? addr(whale.address)}
          </h1>
          <a
            href={addressUrl(whale.chain_id, whale.address)}
            target="_blank"
            rel="noreferrer"
            className="mono mt-1 block break-all text-[12px] text-cmc-text-secondary hover:text-cmc-blue"
          >
            {whale.address} ↗
          </a>
        </div>
        <LabelEditor address={whale.address} initial={whale.label} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Volume · ${WHALE_WINDOW_DAYS}d`} value={usd(Number(whale.volume_usd))} sub={`${num(whale.transfer_count)} transfers`} />
        <Stat
          label="Net flow"
          value={usd(net, { sign: true })}
          valueClass={signColor(net)}
          sub={`in ${usd(Number(whale.inflow_usd))} · out ${usd(Number(whale.outflow_usd))}`}
        />
        <Stat label="Tokens touched" value={num(whale.token_count)} sub={`${num(whale.counterparty_count)} counterparties`} />
        <Stat label="Last activity" value={ago(whale.last_seen)} sub={dateTime(whale.last_seen)} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Position changes by token</h2>
        {tokens.length === 0 ? (
          <div className="card px-6 py-8 text-center text-[13px] text-cmc-text-secondary">
            No transfers in the window.
          </div>
        ) : (
          <div className="card scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Token</th>
                  <th className="num">Received</th>
                  <th className="num">Sent</th>
                  <th className="num">Net</th>
                  <th className="num">Transfers</th>
                  <th className="num">Last</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.token_id}>
                    <td>
                      <Link href={`/tokens/${t.symbol}`} className="font-medium hover:underline">
                        {t.symbol}
                      </Link>
                      <span className="ml-2 hidden text-cmc-text-muted sm:inline">{t.name}</span>
                    </td>
                    <td className="num mono">{usd(Number(t.inflow_usd))}</td>
                    <td className="num mono">{usd(Number(t.outflow_usd))}</td>
                    <td className={`num mono ${signColor(Number(t.net_usd))}`}>
                      {usd(Number(t.net_usd), { sign: true })}
                    </td>
                    <td className="num mono">{num(t.transfer_count)}</td>
                    <td className="num text-cmc-text-secondary">{ago(t.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Recent transfers</h2>
        <div className="card scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Token</th>
                <th>Direction</th>
                <th>Counterparty</th>
                <th className="num">Amount</th>
                <th className="num">Value</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const incoming = t.to_addr === whale.address;
                const counterparty = incoming ? t.from_addr : t.to_addr;
                const counterpartyLabel = incoming ? t.from_label : t.to_label;
                const counterpartyIsWhale = incoming ? t.from_is_whale : t.to_is_whale;
                return (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-cmc-text-secondary">{ago(t.block_time)}</td>
                    <td>
                      <Link href={`/tokens/${t.symbol}`} className="font-medium hover:underline">
                        {t.symbol}
                      </Link>
                    </td>
                    <td className={incoming ? "text-cmc-green" : "text-cmc-red"}>
                      {incoming ? "received" : "sent"}
                    </td>
                    <td>
                      {counterpartyIsWhale ? (
                        <Link href={`/whales/${counterparty}`} className="mono hover:underline">
                          {counterpartyLabel ?? addr(counterparty)}
                        </Link>
                      ) : (
                        <a
                          href={addressUrl(t.chain_id, counterparty)}
                          target="_blank"
                          rel="noreferrer"
                          className="mono text-cmc-text-secondary hover:text-cmc-blue"
                        >
                          {addr(counterparty)}
                        </a>
                      )}
                    </td>
                    <td className="num mono">{qty(Number(t.qty), t.symbol)}</td>
                    <td className={`num mono ${incoming ? "text-cmc-green" : "text-cmc-red"}`}>
                      {usd(Number(t.usd_value))}
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
