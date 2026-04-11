export interface FetchResult {
  metricId: string;
  value: number;
  source: string;
}

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

const SERIES_MAP: Record<
  string,
  { metricId: string; transform?: (v: number) => number }
> = {
  WALCL: {
    metricId: "fed_bs",
    // WALCL is in millions — divide by 1e6 to get trillions
    transform: (v) => v / 1_000_000,
  },
  FEDFUNDS: { metricId: "fed_rate" },
  DGS10: { metricId: "yield_10y" },
  RRPONTSYD: { metricId: "rrp" },
  MMMFFAQ027S: {
    metricId: "mmf",
    // Quarterly, in billions — divide by 1000 to get trillions
    transform: (v) => v / 1000,
  },
};

async function fetchSeries(
  seriesId: string,
  apiKey: string
): Promise<FetchResult> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1&observation_start=2020-01-01`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  }

  const json = await res.json();
  const observations: Array<{ date: string; value: string }> =
    json.observations ?? [];

  // Find the most recent non-missing value
  const obs = observations.find((o) => o.value !== "." && o.value !== "");
  if (!obs) {
    throw new Error(`FRED ${seriesId}: no valid observation`);
  }

  const raw = parseFloat(obs.value);
  if (isNaN(raw)) {
    throw new Error(`FRED ${seriesId}: value "${obs.value}" is not a number`);
  }

  const config = SERIES_MAP[seriesId];
  const value = config.transform ? config.transform(raw) : raw;

  return {
    metricId: config.metricId,
    value,
    source: `FRED/${seriesId}`,
  };
}

export async function fetchAllFRED(apiKey: string): Promise<FetchResult[]> {
  const seriesIds = Object.keys(SERIES_MAP);
  const results = await Promise.allSettled(
    seriesIds.map((id) => fetchSeries(id, apiKey))
  );

  const successful: FetchResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      console.error(`FRED ${seriesIds[i]} failed:`, result.reason?.message);
    }
  }
  return successful;
}
