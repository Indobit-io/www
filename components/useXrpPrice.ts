"use client";

import { useState, useEffect } from "react";

// Polls /api/xrp-price every 2s (the route caches server-side so concurrent
// pollers don't hammer external APIs). Falls back to the server-rendered
// initial price until the first poll lands.
export function useXrpPrice(initial: number | null) {
  const [price, setPrice] = useState<number | null>(initial);
  const [polledAt, setPolledAt] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/xrp-price", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (typeof data.idr === "number") {
          setPrice(data.idr);
          setPolledAt(new Date());
          setError(false);
        }
      } catch {
        setError(true);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  return { price, polledAt, error };
}
