// Chains we can index. Etherscan V2 serves all of these from one endpoint with
// one API key, switching via the `chainid` query param.

export interface Chain {
  id: number;
  key: string;
  name: string;
  /** CoinGecko `platforms` key — used to resolve a coin's contract address. */
  coingeckoPlatform: string;
  explorer: string;
  /** Native-wrapped token, excluded from whale ranking as a contract address. */
  nativeSymbol: string;
}

export const CHAINS: Record<number, Chain> = {
  1: {
    id: 1,
    key: "ethereum",
    name: "Ethereum",
    coingeckoPlatform: "ethereum",
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
  },
  56: {
    id: 56,
    key: "bsc",
    name: "BNB Chain",
    coingeckoPlatform: "binance-smart-chain",
    explorer: "https://bscscan.com",
    nativeSymbol: "BNB",
  },
  8453: {
    id: 8453,
    key: "base",
    name: "Base",
    coingeckoPlatform: "base",
    explorer: "https://basescan.org",
    nativeSymbol: "ETH",
  },
  42161: {
    id: 42161,
    key: "arbitrum",
    name: "Arbitrum One",
    coingeckoPlatform: "arbitrum-one",
    explorer: "https://arbiscan.io",
    nativeSymbol: "ETH",
  },
};

/** Chains the ingester actually walks. Override with INDEXED_CHAINS=1,8453 */
export function indexedChains(): Chain[] {
  const raw = process.env.INDEXED_CHAINS;
  if (!raw) return [CHAINS[1]];
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => CHAINS[n]);
  return ids.length ? ids.map((id) => CHAINS[id]) : [CHAINS[1]];
}

export function chain(id: number): Chain {
  const c = CHAINS[id];
  if (!c) throw new Error(`Unknown chain id ${id}`);
  return c;
}

export function txUrl(chainId: number, hash: string): string {
  return `${chain(chainId).explorer}/tx/${hash}`;
}

export function addressUrl(chainId: number, address: string): string {
  return `${chain(chainId).explorer}/address/${address}`;
}
