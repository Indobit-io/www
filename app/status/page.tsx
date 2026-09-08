import { hasDatabase, pipelineStats, recentRuns } from "@/lib/db";
import { hasEtherscanKey } from "@/lib/etherscan";
import { MIN_TRANSFER_USD, WHALE_WINDOW_DAYS } from "@/lib/ingest";
import { ago, dateTime, num, usd } from "@/lib/fmt";
import JobRunner from "@/components/JobRunner";
import LogoutButton from "@/components/LogoutButton";
import Stat from "@/components/Stat";

export const dynamic = "force-dynamic";

function Flag({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="card flex items-start gap-3 px-4 py-3">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ok ? "bg-cmc-green" : "bg-cmc-red"}`} />
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="mt-0.5 text-[12px] text-cmc-text-secondary">{detail}</div>
      </div>
    </div>
  );
}

export default async function StatusPage() {
  const cronSecretSet = Boolean(process.env.CRON_SECRET);
  const dbReady = hasDatabase();
  const esReady = hasEtherscanKey();

  const stats = dbReady ? await pipelineStats() : null;
  const runs = dbReady ? await recentRuns(15) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-[13px] text-cmc-text-secondary">
            What the ingester has actually collected, and what it is missing.
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Flag
          ok={dbReady}
          label="DATABASE_URL"
          detail={dbReady ? "Postgres connected" : "Not set — nothing can be stored"}
        />
        <Flag
          ok={esReady}
          label="ETHERSCAN_API_KEY"
          detail={esReady ? "On-chain reads enabled" : "Not set — no chain data can be read"}
        />
        <Flag
          ok={Boolean(process.env.COINGECKO_API_KEY)}
          label="COINGECKO_API_KEY"
          detail={
            process.env.COINGECKO_API_KEY
              ? "Higher rate limits"
              : "Optional — public tier works but throttles hard"
          }
        />
        <Flag
          ok={cronSecretSet}
          label="CRON_SECRET"
          detail={cronSecretSet ? "Cron endpoints protected" : "Cron endpoints are open"}
        />
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Tokens indexed" value={num(stats.tracked_tokens)} sub={`${num(stats.tokens)} known`} />
            <Stat label="Whales ranked" value={num(stats.whales)} sub={`${WHALE_WINDOW_DAYS}-day window`} />
            <Stat
              label="Transfers stored"
              value={num(stats.transfers)}
              sub={`${num(stats.transfers_24h)} in the last 24h`}
            />
            <Stat
              label="Coverage"
              value={stats.earliest_transfer ? ago(stats.earliest_transfer).replace(" ago", "") : "—"}
              sub={
                stats.latest_transfer
                  ? `newest ${ago(stats.latest_transfer)}`
                  : "no transfers ingested yet"
              }
            />
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Run jobs now</h2>
            <JobRunner cronSecretSet={cronSecretSet} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Recent runs</h2>
            {runs.length === 0 ? (
              <div className="card px-6 py-8 text-center text-[13px] text-cmc-text-secondary">
                No runs recorded yet.
              </div>
            ) : (
              <div className="card scroll-x">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th>Result</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => {
                      const ms = r.finished_at
                        ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                        : null;
                      return (
                        <tr key={r.id}>
                          <td className="font-medium">{r.kind}</td>
                          <td className="whitespace-nowrap text-cmc-text-secondary">
                            {dateTime(r.started_at)}
                          </td>
                          <td className="mono text-cmc-text-secondary">
                            {ms === null ? "running…" : `${(ms / 1000).toFixed(1)}s`}
                          </td>
                          <td className={r.ok ? "text-cmc-green" : r.ok === false ? "text-cmc-red" : ""}>
                            {r.ok === null ? "—" : r.ok ? "ok" : "failed"}
                          </td>
                          <td className="max-w-[520px] truncate text-[12px] text-cmc-text-muted">
                            {r.error ?? (r.detail ? JSON.stringify(r.detail) : "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      <section className="card p-4">
        <h2 className="text-sm font-semibold">Known limits</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-cmc-text-secondary">
          <li>
            • <span className="text-cmc-text">eth_getLogs has no value filter.</span> Every Transfer
            in a block range has to be fetched and then discarded below{" "}
            {usd(MIN_TRANSFER_USD)}. On a very busy token like USDT that burns the call budget fast,
            which is why each run walks a bounded block span and rotates across tokens.
          </li>
          <li>
            • <span className="text-cmc-text">Coverage has holes by design.</span> Each cycle advances
            each token&rsquo;s cursor by at most MAX_BLOCK_SPAN blocks. If the ingester falls behind
            the chain it stays behind until it catches up — the correlation window is only as honest
            as the blocks actually walked.
          </li>
          <li>
            • <span className="text-cmc-text">Transfers are valued at the hourly price.</span> A
            transfer inside a volatile hour is priced at that hour&rsquo;s close, not at its exact
            block.
          </li>
          <li>
            • <span className="text-cmc-text">Whale identity is inferred, never verified.</span> An
            address that moves a lot of value is in the set. It may be one desk, an exchange&rsquo;s
            internal plumbing, or a contract nobody controls.
          </li>
        </ul>
      </section>
    </div>
  );
}
