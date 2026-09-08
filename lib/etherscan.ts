// Etherscan V2 client. One endpoint + one API key covers every supported chain
// via `chainid`. Free tier is 5 calls/sec and 100k calls/day, so every request
// funnels through a single serialized queue with a minimum spacing.

const BASE = "https://api.etherscan.io/v2/api";

/** Free tier: 5 req/s. 220ms spacing leaves headroom for clock jitter. */
const MIN_INTERVAL_MS = Number(process.env.ETHERSCAN_MIN_INTERVAL_MS ?? 220);

export class EtherscanError extends Error {
  // Declared and assigned explicitly rather than as a constructor parameter
  // property, which type-stripping runtimes (node --experimental-strip-types)
  // cannot compile.
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "EtherscanError";
    this.retryable = retryable;
  }
}

export function hasEtherscanKey(): boolean {
  return Boolean(process.env.ETHERSCAN_API_KEY);
}

let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;
let callCount = 0;

export function callsMade(): number {
  return callCount;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Serializes every outbound call and spaces them by MIN_INTERVAL_MS. */
function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    callCount++;
    return fn();
  });
  // Keep the chain alive even when a call rejects.
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function request(params: Record<string, string | number>): Promise<unknown> {
  const apikey = process.env.ETHERSCAN_API_KEY;
  if (!apikey) {
    throw new EtherscanError(
      "ETHERSCAN_API_KEY is not set — on-chain ingestion cannot run. Get a free key at https://etherscan.io/apis"
    );
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    apikey,
  });

  const res = await fetch(`${BASE}?${qs}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new EtherscanError(`Etherscan HTTP ${res.status}`, res.status >= 500 || res.status === 429);
  }
  return res.json();
}

/** Retries only on transient failures (rate limit, 5xx, socket errors). */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof EtherscanError ? err.retryable : true;
      if (!retryable || i === attempts - 1) throw err;
      await sleep(500 * 2 ** i);
    }
  }
  throw lastErr;
}

/** Standard (non-proxy) modules: `{ status, message, result }`. */
async function classic<T>(params: Record<string, string | number>): Promise<T> {
  return withRetry(() =>
    schedule(async () => {
      const body = (await request(params)) as { status?: string; message?: string; result?: unknown };
      if (body.status === "1") return body.result as T;

      const msg = String(body.message ?? "");
      const detail = typeof body.result === "string" ? body.result : "";
      // "No records found" / "No transactions found" are legitimate empty results.
      if (/no (records|transactions|logs) found/i.test(`${msg} ${detail}`)) {
        return [] as unknown as T;
      }
      const retryable = /rate limit|busy|timeout/i.test(`${msg} ${detail}`);
      throw new EtherscanError(`Etherscan: ${msg}${detail ? ` — ${detail}` : ""}`, retryable);
    })
  );
}

/** `module=proxy` mirrors JSON-RPC: `{ jsonrpc, id, result }` or `{ error }`. */
async function proxy<T>(action: string, params: Record<string, string | number>): Promise<T> {
  return withRetry(() =>
    schedule(async () => {
      const body = (await request({ module: "proxy", action, ...params })) as {
        result?: unknown;
        error?: { message?: string };
      };
      if (body.error) {
        const msg = body.error.message ?? "unknown JSON-RPC error";
        throw new EtherscanError(`Etherscan ${action}: ${msg}`, /rate limit|busy/i.test(msg));
      }
      return body.result as T;
    })
  );
}

export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  logIndex: string;
  transactionHash: string;
}

/** Etherscan caps a single getLogs page at 1000 records. */
export const LOGS_PAGE_LIMIT = 1000;

export async function getLogs(opts: {
  chainId: number;
  address: string;
  topic0: string;
  fromBlock: number;
  toBlock: number;
  page?: number;
}): Promise<RawLog[]> {
  return classic<RawLog[]>({
    chainid: opts.chainId,
    module: "logs",
    action: "getLogs",
    address: opts.address,
    topic0: opts.topic0,
    fromBlock: opts.fromBlock,
    toBlock: opts.toBlock,
    page: opts.page ?? 1,
    offset: LOGS_PAGE_LIMIT,
  });
}

export async function latestBlock(chainId: number): Promise<number> {
  const hex = await proxy<string>("eth_blockNumber", { chainid: chainId });
  return Number.parseInt(hex, 16);
}

export async function blockNumberAt(chainId: number, unixSeconds: number): Promise<number> {
  const n = await classic<string>({
    chainid: chainId,
    module: "block",
    action: "getblocknobytime",
    timestamp: Math.floor(unixSeconds),
    closest: "before",
  });
  return Number(n);
}

export async function ethCall(chainId: number, to: string, data: string): Promise<string> {
  return proxy<string>("eth_call", { chainid: chainId, to, data, tag: "latest" });
}

export async function getCode(chainId: number, address: string): Promise<string> {
  return proxy<string>("eth_getCode", { chainid: chainId, address, tag: "latest" });
}
