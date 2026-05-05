import { Dashboard } from "@/components/Dashboard";
import { METRIC_IDS, type MetricId } from "@/lib/config";
import type { ApiDataResponse } from "./api/data/route";

async function getData(): Promise<ApiDataResponse | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/data`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getStatusDot(
  metrics: ApiDataResponse["metrics"]
): "green" | "yellow" | "red" {
  const updates = Object.values(metrics)
    .map((m) => m.updated)
    .filter(Boolean) as string[];
  if (!updates.length) return "red";
  const ageHours =
    (Date.now() - Math.max(...updates.map((u) => new Date(u).getTime()))) /
    3_600_000;
  if (ageHours < 24) return "green";
  if (ageHours < 168) return "yellow";
  return "red";
}

function formatLastUpdate(metrics: ApiDataResponse["metrics"]): string {
  const updates = Object.values(metrics)
    .map((m) => m.updated)
    .filter(Boolean) as string[];
  if (!updates.length) return "No data";
  const latest = new Date(Math.max(...updates.map((u) => new Date(u).getTime())));
  return latest.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function DashboardPage() {
  const data = await getData();

  if (!data) {
    return (
      <main className="min-h-screen bg-terminal-bg flex flex-col items-center justify-center p-8">
        <div className="font-mono text-sm text-terminal-text-dim text-center space-y-2">
          <div className="text-terminal-green text-2xl">▌</div>
          <div>No data yet.</div>
          <div className="text-terminal-text-muted text-xs">
            Trigger <code className="text-terminal-green">/api/fetch-data</code> to seed the database.
          </div>
        </div>
      </main>
    );
  }

  const liveValues: Partial<Record<MetricId, number>> = {};
  for (const id of METRIC_IDS) {
    const m = data.metrics[id];
    if (m?.current != null) liveValues[id] = m.current;
  }

  return (
    <Dashboard
      liveValues={liveValues}
      signalEvents={data.signal_events ?? []}
      lastUpdate={formatLastUpdate(data.metrics)}
      statusDot={getStatusDot(data.metrics)}
    />
  );
}
