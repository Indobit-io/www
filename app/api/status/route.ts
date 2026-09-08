import { NextResponse } from "next/server";
import { hasDatabase, pipelineStats, recentRuns } from "@/lib/db";
import { hasEtherscanKey } from "@/lib/etherscan";
import { MIN_TRANSFER_USD, WHALE_WINDOW_DAYS } from "@/lib/ingest";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = {
    database: hasDatabase(),
    etherscanKey: hasEtherscanKey(),
    coingeckoKey: Boolean(process.env.COINGECKO_API_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    minTransferUsd: MIN_TRANSFER_USD,
    whaleWindowDays: WHALE_WINDOW_DAYS,
  };
  if (!hasDatabase()) return NextResponse.json({ config, error: "DATABASE_URL is not set" }, { status: 503 });

  const [stats, runs] = await Promise.all([pipelineStats(), recentRuns(15)]);
  return NextResponse.json({ config, stats, runs });
}
