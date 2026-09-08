"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const JOBS = [
  { key: "universe", label: "Sync universe", hint: "CoinGecko ranking → token list + contracts" },
  { key: "prices", label: "Sync prices", hint: "Hourly price history for tracked tokens" },
  { key: "flow", label: "Ingest flow", hint: "Walk Transfer logs from each token's cursor" },
  { key: "whales", label: "Rebuild whales", hint: "Recompute the top-N registry" },
];

/**
 * Manual triggers for the same endpoints the cron hits. Useful for the first
 * run, when there is no data and waiting for a schedule is pointless.
 */
export default function JobRunner({ cronSecretSet }: { cronSecretSet: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ job: string; ok: boolean; body: string } | null>(null);

  async function run(job: string) {
    setRunning(job);
    setResult(null);
    try {
      const res = await fetch(`/api/cron/${job}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      setResult({ job, ok: res.ok, body: JSON.stringify(body, null, 2) });
      router.refresh();
    } catch (err) {
      setResult({
        job,
        ok: false,
        body: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {JOBS.map((job) => (
          <button
            key={job.key}
            onClick={() => run(job.key)}
            disabled={running !== null}
            className="card px-4 py-3 text-left transition-colors hover:border-cmc-blue disabled:opacity-50"
          >
            <div className="text-[13px] font-medium">
              {running === job.key ? "Running…" : job.label}
            </div>
            <div className="mt-0.5 text-[12px] text-cmc-text-secondary">{job.hint}</div>
          </button>
        ))}
      </div>

      {cronSecretSet ? (
        <p className="text-[12px] text-cmc-text-muted">
          CRON_SECRET is set, so these buttons only work from an authenticated browser session —
          they send no secret and rely on your login cookie being present.
        </p>
      ) : (
        <p className="text-[12px] text-cmc-yellow">
          CRON_SECRET is not set, which leaves <code>/api/cron/*</code> open to anyone who can reach
          this deployment. Set it before exposing this app publicly.
        </p>
      )}

      {result ? (
        <div className="card p-3">
          <div className={`text-[12px] font-medium ${result.ok ? "text-cmc-green" : "text-cmc-red"}`}>
            {result.job}: {result.ok ? "ok" : "failed"}
          </div>
          <pre className="scroll-x mono mt-2 max-h-72 overflow-y-auto text-[11px] leading-relaxed text-cmc-text-secondary">
            {result.body}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
