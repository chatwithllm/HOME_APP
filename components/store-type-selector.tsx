"use client";

import { useState } from "react";

const options = [
  { value: "american", label: "American" },
  { value: "indian", label: "Indian" },
  { value: "other", label: "Other" },
] as const;

type StoreType = (typeof options)[number]["value"];

export function StoreTypeSelector({
  storeName,
  initialStoreType,
}: {
  storeName?: string | null;
  initialStoreType?: string | null;
}) {
  const [storeType, setStoreType] = useState<StoreType>((initialStoreType as StoreType) || "other");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  if (!storeName) {
    return <p className="text-sm leading-6 text-[var(--muted)]">No store name saved for this receipt yet.</p>;
  }

  async function saveStoreType(nextStoreType: StoreType) {
    setStoreType(nextStoreType);
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/store-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, storeType: nextStoreType }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save store profile");
      }

      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save store profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = storeType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void saveStoreType(option.value)}
              disabled={saving}
              className={`rounded-[12px] border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--surface-soft)] text-[var(--accent-dark)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]"
              } ${saving ? "cursor-wait opacity-80" : ""}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
