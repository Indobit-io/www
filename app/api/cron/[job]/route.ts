import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase } from "@/lib/db";
import { hasEtherscanKey, callsMade } from "@/lib/etherscan";
import { callsMade as coingeckoCalls } from "@/lib/coingecko";
import { ingestFlow, refreshWhales, runJob, syncPrices, syncUniverse } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const JOBS = ["universe", "prices", "flow", "whales", "all"] as const;
type Job = (typeof JOBS)[number];

/**
 * Cron endpoints sit outside the shared-password wall so Vercel's scheduler can
 * reach them, so they carry their own secret. With no CRON_SECRET set the
 * endpoints stay open — fine locally, not fine in production.
 */
function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

/**
 * Every stage has to finish inside the platform's function timeout. Anything
 * unbounded gets killed mid-run and reports as a total failure even when most
 * of the work landed, so the price sync — the only stage whose runtime depends
 * on a third party's rate limit — is handed an explicit slice of the clock.
 */
function priceBudget(startedAt: number, share: number): number {
  const ceiling = maxDuration * 1000;
  const spent = Date.now() - startedAt;
  // Leave headroom so the response itself is never the thing that overruns.
  const computed = Math.max(15_000, Math.floor((ceiling - spent) * share) - 10_000);

  // PRICE_BUDGET_MS is a ceiling, not a default: the platform limit is the hard
  // constraint, and an operator lowering this must actually lower it.
  const override = Number(process.env.PRICE_BUDGET_MS);
  return Number.isFinite(override) && override > 0 ? Math.min(computed, override) : computed;
}

async function run(job: Job, startedAt: number) {
  switch (job) {
    case "universe":
      return runJob("universe", syncUniverse);
    case "prices":
      return runJob("prices", () => syncPrices({ budgetMs: priceBudget(startedAt, 1) }));
    case "flow":
      return runJob("flow", () => ingestFlow());
    case "whales":
      return runJob("whales", () => refreshWhales());
    case "all":
      // Order matters: the universe defines what to price, prices are needed to
      // value transfers, and the whale registry is built from those transfers.
      // Prices get roughly half of whatever remains after the universe sync,
      // leaving the flow walk and the registry rebuild room to finish.
      return runJob("all", async () => ({
        universe: await syncUniverse(),
        prices: await syncPrices({ budgetMs: priceBudget(startedAt, 0.5) }),
        flow: await ingestFlow(),
        whales: await refreshWhales(),
      }));
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ job: string }> }) {
  const startedAt = Date.now();
  const { job } = await ctx.params;

  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!JOBS.includes(job as Job)) {
    return NextResponse.json({ error: `Unknown job "${job}"`, jobs: JOBS }, { status: 404 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  }
  // "prices" is pure CoinGecko, and "whales" only aggregates rows already in
  // the database — the contract-code lookup inside it is optional and skips
  // itself when there is no key. The other jobs genuinely cannot run without one.
  const NEEDS_CHAIN: Job[] = ["universe", "flow", "all"];
  if (NEEDS_CHAIN.includes(job as Job) && !hasEtherscanKey()) {
    return NextResponse.json(
      { error: "ETHERSCAN_API_KEY is not set — on-chain jobs cannot run" },
      { status: 503 }
    );
  }

  try {
    const detail = await run(job as Job, startedAt);
    return NextResponse.json({
      ok: true,
      job,
      ms: Date.now() - startedAt,
      etherscanCalls: callsMade(),
      coingeckoCalls: coingeckoCalls(),
      detail,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        job,
        ms: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export const POST = GET;
