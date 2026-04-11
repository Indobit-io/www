/**
 * Seed script — manually triggers /api/fetch-data
 * Run: node scripts/seed.mjs
 * Or:  npm run seed
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

async function seed() {
  console.log(`Seeding from ${BASE_URL}/api/fetch-data ...`);

  try {
    const res = await fetch(`${BASE_URL}/api/fetch-data`);
    const json = await res.json();

    if (!res.ok) {
      console.error("Error:", json);
      process.exit(1);
    }

    console.log("\nResult:");
    console.log(`  Timestamp : ${json.timestamp}`);
    console.log(`  Elapsed   : ${json.elapsed_ms}ms`);
    console.log(`  Success   : ${json.success}`);
    console.log(`  Failed    : ${json.failed}`);
    console.log("\nLog:");
    for (const line of json.log ?? []) {
      const icon = line.startsWith("OK") ? "✓" : "✗";
      console.log(`  ${icon} ${line}`);
    }
  } catch (err) {
    console.error("Failed to reach server:", err.message);
    console.error("Make sure `npm run dev` is running first.");
    process.exit(1);
  }
}

seed();
