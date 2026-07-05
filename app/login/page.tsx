"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Gagal masuk");
      }
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cmc-bg text-cmc-text flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-cmc-blue rounded-xl flex items-center justify-center text-white text-lg font-bold mx-auto">
            C
          </div>
          <h1 className="text-base font-bold">Crypto Sell Tracker</h1>
          <p className="text-xs text-cmc-text-muted">Masukkan password untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-cmc-surface border border-cmc-border rounded-2xl p-5 space-y-4">
          {error && (
            <div className="border border-cmc-red/30 bg-cmc-red/10 text-cmc-red text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-semibold py-3 bg-cmc-blue hover:bg-cmc-blue-dim text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
