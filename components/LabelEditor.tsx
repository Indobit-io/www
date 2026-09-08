"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Lets you name an address once you have worked out who it is. */
export default function LabelEditor({
  address,
  initial,
}: {
  address: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/whales/${address}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a label"
        maxLength={80}
        className="input-field !w-[220px]"
      />
      <button type="submit" className="btn" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      {error ? <span className="text-[12px] text-cmc-red">{error}</span> : null}
    </form>
  );
}
