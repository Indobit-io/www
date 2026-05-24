export interface XrpPrice {
  idr: number;
  usd: number;
  fetched_at: string;
}

export async function fetchXrpPrice(): Promise<XrpPrice> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=idr,usd",
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json();
  return {
    idr: data.ripple.idr,
    usd: data.ripple.usd,
    fetched_at: new Date().toISOString(),
  };
}
