import Link from "next/link";

/**
 * Shown instead of an empty dashboard when the app has no data yet. The point
 * is to say exactly what is missing rather than render zeros that look like a
 * finding.
 */
export default function SetupNotice({
  missing,
}: {
  missing: { database: boolean; etherscan: boolean; noData: boolean };
}) {
  const steps: { key: string; title: string; body: React.ReactNode }[] = [];

  if (missing.database) {
    steps.push({
      key: "db",
      title: "Set DATABASE_URL",
      body: (
        <>
          Any Postgres instance works — Neon, Supabase, Vercel Postgres, or a local one. Tables are
          created on first query.
        </>
      ),
    });
  }
  if (missing.etherscan) {
    steps.push({
      key: "es",
      title: "Set ETHERSCAN_API_KEY",
      body: (
        <>
          A free key at{" "}
          <a
            className="text-cmc-blue hover:underline"
            href="https://etherscan.io/apis"
            target="_blank"
            rel="noreferrer"
          >
            etherscan.io/apis
          </a>{" "}
          covers every supported chain (100k calls/day). Without it no on-chain data can be read —
          there is no offline substitute.
        </>
      ),
    });
  }
  if (!missing.database && !missing.etherscan && missing.noData) {
    steps.push({
      key: "run",
      title: "Run the pipeline once",
      body: (
        <>
          Build the token universe, pull prices, walk Transfer logs, then rank whales. Kick it off
          from the <Link className="text-cmc-blue hover:underline" href="/status">Pipeline</Link>{" "}
          page. The first correlation needs roughly 48 hours of ingested flow before it means
          anything.
        </>
      ),
    });
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold">Nothing to show yet</h2>
      <p className="mt-1.5 text-[13px] text-cmc-text-secondary">
        This app reads live on-chain data. It has no bundled dataset and does not simulate one.
      </p>
      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cmc-border text-[11px] text-cmc-text-muted">
              {i + 1}
            </span>
            <div>
              <div className="text-[13px] font-medium">{step.title}</div>
              <div className="mt-0.5 text-[13px] leading-relaxed text-cmc-text-secondary">
                {step.body}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
