import { NextResponse } from "next/server";
import { insertSnapshot } from "@/lib/db";
import { fetchAllFRED } from "@/lib/fetchers/fred";
import { fetchAllYahoo } from "@/lib/fetchers/yahoo";
import { fetchAllCoinGecko } from "@/lib/fetchers/coingecko";

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

  // Log top-level failures
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

  // Insert each result into the database
  for (const result of allResults) {
    try {
      await insertSnapshot(result.metricId, result.value, result.source);
      log.push(`OK ${result.source} → ${result.metricId} = ${result.value}`);
      successCount++;
    } catch (err) {
      log.push(
        `DB error for ${result.metricId}: ${err instanceof Error ? err.message : String(err)}`
      );
      failCount++;
    }
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
