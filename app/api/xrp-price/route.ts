import { NextResponse } from "next/server";
import { fetchXrpPrice } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const price = await fetchXrpPrice();
    return NextResponse.json(price);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch price" },
      { status: 500 }
    );
  }
}
