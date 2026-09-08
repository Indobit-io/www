// Minimal ERC-20 log decoding. No ABI library — a Transfer log is three topics
// and a uint256, and decimals() is a single constant selector.

import { ethCall } from "./etherscan";

/** keccak256("Transfer(address,address,uint256)") */
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Selector for decimals() — bytes4(keccak256("decimals()")) */
const DECIMALS_SELECTOR = "0x313ce567";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
/** Common burn sink, used alongside the zero address. */
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

export function isBurnAddress(addr: string): boolean {
  return addr === ZERO_ADDRESS || addr === DEAD_ADDRESS;
}

/** 32-byte left-padded topic → 20-byte lowercase address. */
export function topicToAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

export interface DecodedTransfer {
  from: string;
  to: string;
  /** Raw base units, exact. */
  raw: bigint;
  blockNumber: number;
  blockTime: Date;
  txHash: string;
  logIndex: number;
}

/**
 * Decodes a canonical ERC-20 Transfer log. Returns null for anything that
 * doesn't match the standard shape — some tokens leave `from`/`to`
 * un-indexed, and ERC-721 Transfer shares the same topic0 with four topics.
 */
export function decodeTransfer(log: {
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  logIndex: string;
  transactionHash: string;
}): DecodedTransfer | null {
  if (log.topics.length !== 3) return null;
  if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) return null;

  let raw: bigint;
  try {
    raw = BigInt(log.data === "0x" || log.data === "" ? "0x0" : log.data);
  } catch {
    return null;
  }

  const blockNumber = Number.parseInt(log.blockNumber, 16);
  const ts = Number.parseInt(log.timeStamp, 16);
  if (!Number.isFinite(blockNumber) || !Number.isFinite(ts)) return null;

  return {
    from: topicToAddress(log.topics[1]),
    to: topicToAddress(log.topics[2]),
    raw,
    blockNumber,
    blockTime: new Date(ts * 1000),
    txHash: log.transactionHash.toLowerCase(),
    // Etherscan returns "0x" for logIndex 0 on some chains.
    logIndex: Number.parseInt(log.logIndex || "0x0", 16) || 0,
  };
}

/**
 * Scales base units to human units without going through Number until the
 * very end, so an 18-decimal balance doesn't lose its integer part.
 */
export function toUnits(raw: bigint, decimals: number): number {
  if (decimals <= 0) return Number(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  return Number(whole) + Number(frac) / Number(divisor);
}

/** Reads decimals() on-chain. Falls back to 18 when a token omits it. */
export async function fetchDecimals(chainId: number, contract: string): Promise<number> {
  try {
    const hex = await ethCall(chainId, contract, DECIMALS_SELECTOR);
    if (!hex || hex === "0x") return 18;
    const value = Number(BigInt(hex));
    return value >= 0 && value <= 36 ? value : 18;
  } catch {
    return 18;
  }
}
