import { hasDatabase, isDemoData } from "@/lib/db";

/**
 * Synthetic data is useful for working on the UI and dangerous everywhere
 * else, so it announces itself on every page rather than sitting quietly in a
 * table nobody reads.
 */
export default async function DemoBanner() {
  if (!hasDatabase()) return null;
  if (!(await isDemoData())) return null;

  return (
    <div className="border-b border-cmc-red/40 bg-cmc-red/10 px-4 py-2 text-center text-[12px] text-cmc-red sm:px-6">
      <strong className="font-semibold">Demo data.</strong> This database was filled by{" "}
      <code>scripts/seed-demo.mjs</code> with generated numbers. Nothing here reflects real on-chain
      activity — every correlation on screen is manufactured. Run{" "}
      <code>node scripts/seed-demo.mjs --clear</code> before connecting real data.
    </div>
  );
}
