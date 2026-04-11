import { MetricCard } from "@/components/MetricCard";
import { SignalsPanel } from "@/components/SignalsPanel";
import { METRIC_CONFIG, CATEGORY_ORDER, METRIC_IDS, type MetricId } from "@/lib/config";
import type { ApiDataResponse } from "./api/data/route";

async function getData(): Promise<ApiDataResponse | null> {
  try {
    // In production use absolute URL; in dev use relative
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://www.indobit.io"
        : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/data`, {
      next: { revalidate: 60 }, // Cache for 60s, ISR
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getStatusDot(
  metrics: ApiDataResponse["metrics"]
): "green" | "yellow" | "red" {
  const now = Date.now();
  const updates = Object.values(metrics)
    .map((m) => m.updated)
    .filter(Boolean) as string[];

  if (updates.length === 0) return "red";

  const latestMs = Math.max(...updates.map((u) => new Date(u).getTime()));
  const ageHours = (now - latestMs) / 3_600_000;

  if (ageHours < 24) return "green";
  if (ageHours < 168) return "yellow";
  return "red";
}

function formatLastUpdate(metrics: ApiDataResponse["metrics"]): string {
  const updates = Object.values(metrics)
    .map((m) => m.updated)
    .filter(Boolean) as string[];

  if (updates.length === 0) return "No data";

  const latest = new Date(
    Math.max(...updates.map((u) => new Date(u).getTime()))
  );
  return latest.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const STATUS_DOT_CLASSES = {
  green: "bg-terminal-green shadow-[0_0_6px_#00ff41]",
  yellow: "bg-terminal-amber",
  red: "bg-terminal-red animate-pulse",
};

export default async function DashboardPage() {
  const data = await getData();

  if (!data) {
    return (
      <main className="min-h-screen bg-terminal-bg flex flex-col items-center justify-center">
        <div className="text-terminal-text-dim font-mono text-sm">
          No data yet. Run{" "}
          <code className="text-terminal-green">/api/fetch-data</code> to seed
          the database.
        </div>
      </main>
    );
  }

  const { metrics } = data;
  const statusDot = getStatusDot(metrics);
  const lastUpdate = formatLastUpdate(metrics);

  // Build values map for signals
  const values: Partial<Record<MetricId, number>> = {};
  for (const id of METRIC_IDS) {
    const m = metrics[id];
    if (m?.current !== null && m?.current !== undefined) {
      values[id] = m.current;
    }
  }

  // Group metrics by category
  const byCategory: Record<string, MetricId[]> = {};
  for (const id of METRIC_IDS) {
    const cat = METRIC_CONFIG[id].category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(id);
  }

  return (
    <main className="min-h-screen bg-terminal-bg text-terminal-text">
      {/* Header */}
      <header className="border-b border-terminal-border bg-terminal-surface/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-terminal-green font-mono text-xs tracking-widest opacity-60">
              ▌
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold text-terminal-green tracking-wider">
                LIQUIDITY FLOW TRACKER
              </h1>
              <div className="text-[10px] text-terminal-text-muted font-mono">
                global financial system — real data, no predictions
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASSES[statusDot]}`}
            />
            <div className="text-[10px] font-mono text-terminal-text-muted text-right">
              <div>LAST UPDATE</div>
              <div className="text-terminal-text-dim">{lastUpdate}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Signals Panel */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-terminal-border" />
            <span className="font-mono text-[10px] tracking-widest text-terminal-text-muted">
              SIGNALS
            </span>
            <div className="h-px flex-1 bg-terminal-border" />
          </div>
          <SignalsPanel values={values} />
        </section>

        {/* Metrics Grid — grouped by category */}
        {CATEGORY_ORDER.filter((cat) => byCategory[cat]?.length).map((cat) => (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-terminal-border" />
              <span className="font-mono text-[10px] tracking-widest text-terminal-text-muted uppercase">
                {cat}
              </span>
              <div className="h-px flex-1 bg-terminal-border" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {byCategory[cat].map((id) => {
                const m = metrics[id];
                return (
                  <MetricCard
                    key={id}
                    metricId={id}
                    current={m?.current ?? null}
                    history={m?.history ?? []}
                    updated={m?.updated ?? null}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {/* Big Picture Panel */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-terminal-border" />
            <span className="font-mono text-[10px] tracking-widest text-terminal-text-muted">
              BIG PICTURE
            </span>
            <div className="h-px flex-1 bg-terminal-border" />
          </div>
          <div className="border border-terminal-border bg-terminal-surface rounded p-4">
            <div className="font-mono text-xs text-terminal-text-muted mb-2 tracking-widest">
              MANUAL ANALYSIS — EDIT /data/big-picture.md
            </div>
            <p className="text-sm text-terminal-text-dim leading-relaxed">
              Update this section with your current macro thesis. Edit{" "}
              <code className="text-terminal-green text-xs">
                data/big-picture.md
              </code>{" "}
              or connect a CMS. This space is intentionally manual — the charts
              speak for themselves, but interpretation requires judgment.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-terminal-border pt-4 pb-8">
          <div className="flex flex-col sm:flex-row justify-between gap-2 text-[10px] font-mono text-terminal-text-muted">
            <div>
              SOURCES: FRED · COINGECKO · YAHOO FINANCE · DEFILLAMA
            </div>
            <div>
              DATA REFRESHED DAILY VIA CRON → /api/fetch-data
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
