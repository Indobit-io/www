import { NextResponse } from "next/server";
import { getAllLatest, getHistory } from "@/lib/db";
import { METRIC_CONFIG, METRIC_IDS } from "@/lib/config";

export const dynamic = "force-dynamic";

export interface MetricData {
  current: number | null;
  unit: string;
  label: string;
  category: string;
  history: Array<{ timestamp: string; value: number }>;
  updated: string | null;
  source: string | null;
}

export interface ApiDataResponse {
  metrics: Record<string, MetricData>;
  fetched_at: string;
}

export async function GET() {
  const latest = getAllLatest();

  const metrics: Record<string, MetricData> = {};

  for (const metricId of METRIC_IDS) {
    const config = METRIC_CONFIG[metricId];
    const current = latest[metricId];
    const history = getHistory(metricId, 52);

    metrics[metricId] = {
      current: current?.current ?? null,
      unit: config.unit,
      label: config.label,
      category: config.category,
      history: history.map((h) => ({
        timestamp: h.timestamp,
        value: h.value,
      })),
      updated: current?.updated ?? null,
      source: current?.source ?? null,
    };
  }

  return NextResponse.json({
    metrics,
    fetched_at: new Date().toISOString(),
  } satisfies ApiDataResponse);
}
