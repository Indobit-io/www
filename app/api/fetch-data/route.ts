import { NextResponse } from "next/server";
import { insertSnapshot, upsertSignalEvents, clearInactiveSignals } from "@/lib/db";
import { fetchAllFRED } from "@/lib/fetchers/fred";
import { fetchAllYahoo } from "@/lib/fetchers/yahoo";
import { fetchAllCoinGecko } from "@/lib/fetchers/coingecko";
import { generateSignals } from "@/lib/signals";
import type { MetricId } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const fredApiKey = process.env.FRED_API_KEY;
  if (!fredApiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured" },
      { status: 500 }
    );
  }

  const startTime = Date.now();
  const log: string[] = [];
  let successCount = 0;
  let failCount = 0;

  // Fetch all sources in parallel — failures in one don't kill others
  const [fredResults, yahooResults, coinGeckoResults] =
    await Promise.allSettled([
      fetchAllFRED(fredApiKey),
      fetchAllYahoo(),
      fetchAllCoinGecko(),
    ]);

  const allResults = [
    ...(fredResults.status === "fulfilled" ? fredResults.value : []),
    ...(yahooResults.status === "fulfilled" ? yahooResults.value : []),
    ...(coinGeckoResults.status === "fulfilled" ? coinGeckoResults.value : []),
  ];

  if (fredResults.status === "rejected") {
    log.push(`FRED batch failed: ${fredResults.reason?.message}`);
    failCount++;
  }
  if (yahooResults.status === "rejected") {
    log.push(`Yahoo batch failed: ${yahooResults.reason?.message}`);
    failCount++;
  }
  if (coinGeckoResults.status === "rejected") {
    log.push(`CoinGecko batch failed: ${coinGeckoResults.reason?.message}`);
    failCount++;
  }

  // Build a quick lookup for derived metrics
  const fetched: Record<string, number> = {};
  for (const r of allResults) {
    fetched[r.metricId] = r.value;
  }

  // Derived: yield_curve = (10Y - 2Y) * 100 in basis points
  if (fetched["yield_10y"] != null && fetched["yield_2y"] != null) {
    const spread = Math.round((fetched["yield_10y"] - fetched["yield_2y"]) * 100);
    allResults.push({
      metricId: "yield_curve",
      value: spread,
      source: "derived/DGS10-DGS2",
    });
    log.push(`OK derived → yield_curve = ${spread}bps`);
  }

  // Insert each result into the database
  for (const result of allResults) {
    try {
      await insertSnapshot(result.metricId, result.value, result.source);
      if (!result.source.startsWith("derived/")) {
        log.push(`OK ${result.source} → ${result.metricId} = ${result.value}`);
      }
      successCount++;
    } catch (err) {
      log.push(
        `DB error for ${result.metricId}: ${err instanceof Error ? err.message : String(err)}`
      );
      failCount++;
    }
  }

  // Track signal history using the freshly-fetched values
  try {
    const values = Object.fromEntries(
      allResults.map((r) => [r.metricId, r.value])
    ) as Partial<Record<MetricId, number>>;

    const activeSignals = generateSignals(values);
    await upsertSignalEvents(
      activeSignals.map((s) => ({
        signal_id: s.id,
        tag: s.tag,
        level: s.level,
        message: s.message,
      }))
    );
    await clearInactiveSignals(activeSignals.map((s) => s.id));
    log.push(`Signal history updated: ${activeSignals.length} active`);
  } catch (err) {
    log.push(`Signal history error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const elapsed = Date.now() - startTime;

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    elapsed_ms: elapsed,
    success: successCount,
    failed: failCount,
    log,
  });
}
