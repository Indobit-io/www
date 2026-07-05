"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  positionId: number;
  positionName: string;
}

export function DeletePositionButton({ positionId, positionName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${positionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push("/");
      router.refresh();
    } catch {
      setError("Gagal menghapus posisi. Coba lagi.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-cmc-text-muted">
          Menghapus posisi ini juga menghapus seluruh riwayat batch penjualannya.
        </p>
        <button
          onClick={() => setConfirming(true)}
          className="text-xs font-semibold px-3 py-2 border border-cmc-red/40 text-cmc-red hover:bg-cmc-red/10 rounded-lg transition-colors flex-shrink-0"
        >
          Hapus Posisi
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-cmc-red">
        {error ?? (
          <>Yakin hapus <span className="font-semibold">{positionName}</span>? Tindakan ini tidak bisa dibatalkan.</>
        )}
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-xs font-medium px-3 py-2 text-cmc-text-muted hover:text-cmc-text rounded-lg transition-colors disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold px-3 py-2 bg-cmc-red hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? "Menghapus…" : "Ya, Hapus"}
        </button>
      </div>
    </div>
  );
}
