"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  normalizedName: string;
  itemName: string;
  preferredStore: string;
  suggestedQty: number;
};

export function ShoppingRecommendationActions({
  normalizedName,
  itemName,
  preferredStore,
  suggestedQty,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"plan" | "ignore" | null>(null);
  const [status, setStatus] = useState("");

  async function addToPlan() {
    setBusy("plan");
    setStatus("");

    try {
      const response = await fetch("/api/shopping-recommendations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          normalizedName,
          itemName,
          preferredStore,
          suggestedQty,
          targetList: "Buy Again",
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; merged?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Add failed");
      }

      setStatus(data.merged ? "Already planned" : "Added to plan");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Add failed");
    } finally {
      setBusy(null);
    }
  }

  async function ignoreRecommendation() {
    setBusy("ignore");
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
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void addToPlan()}
          disabled={busy !== null}
          className="inline-flex rounded-[10px] border border-[var(--accent)] bg-[rgba(255,241,191,0.7)] px-3 py-2 text-xs font-semibold text-[var(--accent-dark)] disabled:opacity-70"
        >
          {busy === "plan" ? "Adding..." : "Add to plan"}
        </button>
        <button
          type="button"
          onClick={() => void ignoreRecommendation()}
          disabled={busy !== null}
          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-70"
        >
          {busy === "ignore" ? "Ignoring..." : "Ignore"}
        </button>
      </div>
      {status ? <p className="text-[11px] font-medium text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
