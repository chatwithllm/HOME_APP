"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  normalizedName: string;
  itemName: string;
  preferredStore: string;
};

export function ShoppingRecommendationActions({ normalizedName, itemName, preferredStore }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function ignoreRecommendation() {
    setBusy(true);
    setStatus("");

    try {
      const response = await fetch("/api/shopping-recommendations/ignore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalizedName, itemName, preferredStore, reason: "ignored_from_ui" }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Ignore failed");
      }

      setStatus("Ignored");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ignore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void ignoreRecommendation()}
        disabled={busy}
        className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-70"
      >
        {busy ? "Ignoring..." : "Ignore"}
      </button>
      {status ? <p className="text-[11px] font-medium text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
