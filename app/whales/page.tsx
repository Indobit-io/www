import Link from "next/link";
import { hasDatabase, listWhales, pipelineStats, WHALE_COUNT } from "@/lib/db";
import { hasEtherscanKey } from "@/lib/etherscan";
import { WHALE_WINDOW_DAYS } from "@/lib/ingest";
import { addr, ago, num, signColor, usd } from "@/lib/fmt";
import SetupNotice from "@/components/SetupNotice";
import Stat from "@/components/Stat";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const KINDS = [
  { key: "all", label: "All" },
  { key: "wallet", label: "Wallets" },
  { key: "hub", label: "Hubs" },
  { key: "contract", label: "Contracts" },
  { key: "unknown", label: "Unclassified" },
];

const KIND_STYLE: Record<string, string> = {
  hub: "border-cmc-yellow/40 text-cmc-yellow",
  contract: "border-cmc-blue/40 text-cmc-blue",
  wallet: "border-cmc-green/40 text-cmc-green",
  unknown: "border-cmc-border text-cmc-text-muted",
};

export default async function WhalesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;

  if (!hasDatabase()) {
    return <SetupNotice missing={{ database: true, etherscan: !hasEtherscanKey(), noData: true }} />;
  }

  const kind = KINDS.some((k) => k.key === sp.kind) ? sp.kind! : "all";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const search = (sp.q ?? "").trim();

  const [{ rows, total }, stats] = await Promise.all([
    listWhales({ kind, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, search: search || undefined }),
    pipelineStats(),
  ]);

  if (!stats.whales) {
    return <SetupNotice missing={{ database: false, etherscan: !hasEtherscanKey(), noData: true }} />;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (kind !== "all") p.set("kind", kind);
    if (search) p.set("q", search);
    for (const [k, v] of Object.entries(over)) p.set(k, String(v));
    return `/whales${p.toString() ? `?${p}` : ""}`;
  };

  const totalVolume = rows.reduce((a, r) => a + Number(r.volume_usd), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">The {num(WHALE_COUNT)} whales</h1>
        <p className="mt-1 text-[13px] text-cmc-text-secondary">
          Ranked by USD moved over the last {WHALE_WINDOW_DAYS} days. Membership is earned from
          observed flow and recomputed every cycle — no curated address list.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In the registry" value={num(stats.whales)} sub={`target ${num(WHALE_COUNT)}`} />
        <Stat label="Matching filter" value={num(total)} sub={kind === "all" ? "all kinds" : kind} />
        <Stat label="Volume on this page" value={usd(totalVolume)} sub={`${rows.length} addresses`} />
        <Stat label="Transfers stored" value={num(stats.transfers)} sub={`${num(stats.transfers_24h)} in 24h`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={qs({ kind: k.key, page: 1 })}
            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
              k.key === kind
                ? "border-cmc-blue bg-cmc-blue/10 text-cmc-text"
                : "border-cmc-border text-cmc-text-secondary hover:text-cmc-text"
            }`}
          >
            {k.label}
          </Link>
        ))}
        <form action="/whales" className="ml-auto flex items-center gap-2">
          {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
          <input
            name="q"
            defaultValue={search}
            placeholder="Search address or label"
            className="input-field !w-[240px]"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-10 text-center text-[13px] text-cmc-text-secondary">
          No whales match that filter.
        </div>
      ) : (
        <div className="card scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Address</th>
                <th>Kind</th>
                <th className="num">Volume</th>
                <th className="num">Net flow</th>
                <th className="num">Transfers</th>
                <th className="num">Tokens</th>
                <th className="num">Counterparties</th>
                <th className="num">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const net = Number(w.inflow_usd) - Number(w.outflow_usd);
                return (
                  <tr key={w.address}>
                    <td className="num text-cmc-text-muted">{w.rank}</td>
                    <td>
                      <Link href={`/whales/${w.address}`} className="hover:underline">
                        {w.label ? (
                          <span className="font-medium">{w.label}</span>
                        ) : (
                          <span className="mono">{addr(w.address)}</span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <span className={`chip ${KIND_STYLE[w.kind] ?? KIND_STYLE.unknown}`}>
                        {w.kind}
                      </span>
                    </td>
                    <td className="num mono">{usd(Number(w.volume_usd))}</td>
                    <td className={`num mono ${signColor(net)}`}>{usd(net, { sign: true })}</td>
                    <td className="num mono">{num(w.transfer_count)}</td>
                    <td className="num mono">{num(w.token_count)}</td>
                    <td className="num mono">{num(w.counterparty_count)}</td>
                    <td className="num text-cmc-text-secondary">{ago(w.last_seen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-[13px]">
          <Link
            href={qs({ page: Math.max(1, page - 1) })}
            className={`btn ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Previous
          </Link>
          <span className="text-cmc-text-secondary">
            Page {page} of {pages}
          </span>
          <Link
            href={qs({ page: Math.min(pages, page + 1) })}
            className={`btn ${page === pages ? "pointer-events-none opacity-40" : ""}`}
          >
            Next
          </Link>
        </div>
      ) : null}

      <p className="text-[12px] leading-relaxed text-cmc-text-muted">
        <span className="text-cmc-yellow">Hub</span> marks an address with very high transfer counts
        across very many counterparties — exchange hot wallets, bridges, routers. Their flow means
        roughly the opposite of a private wallet&rsquo;s, so the correlation view can exclude them.
        The classification is a threshold on observed behaviour, not a verified identity.
      </p>
    </div>
  );
}
