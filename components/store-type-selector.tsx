"use client";

import { useMemo, useState } from "react";

const options = [
  { value: "american", label: "American" },
  { value: "indian", label: "Indian" },
  { value: "other", label: "Other" },
] as const;

type StoreType = (typeof options)[number]["value"];

type ProfileFields = {
  preferredForCategories: string;
  shoppingTips: string;
  pricingNotes: string;
  reliability: "" | "high" | "medium" | "low";
  defaultPriority: "" | "high" | "normal" | "low";
  avoidForItems: string;
  preferForItems: string;
};

export function StoreTypeSelector({
  storeName,
  initialStoreType,
  initialNotes,
}: {
  storeName?: string | null;
  initialStoreType?: string | null;
  initialNotes?: string | null;
}) {
  const [storeType, setStoreType] = useState<StoreType>((initialStoreType as StoreType) || "other");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const parsedInitial = useMemo(() => {
    try {
      return initialNotes ? (JSON.parse(initialNotes) as Record<string, unknown>) : {};
    } catch {
      return { pricingNotes: initialNotes || "" };
    }
  }, [initialNotes]);
  const [fields, setFields] = useState<ProfileFields>({
    preferredForCategories: Array.isArray(parsedInitial.preferredForCategories)
      ? (parsedInitial.preferredForCategories as string[]).join(", ")
      : "",
    shoppingTips: Array.isArray(parsedInitial.shoppingTips) ? (parsedInitial.shoppingTips as string[]).join(", ") : "",
    pricingNotes: typeof parsedInitial.pricingNotes === "string" ? parsedInitial.pricingNotes : "",
    reliability:
      parsedInitial.reliability === "high" || parsedInitial.reliability === "medium" || parsedInitial.reliability === "low"
        ? parsedInitial.reliability
        : "",
    defaultPriority:
      parsedInitial.defaultPriority === "high" ||
      parsedInitial.defaultPriority === "normal" ||
      parsedInitial.defaultPriority === "low"
        ? parsedInitial.defaultPriority
        : "",
    avoidForItems: Array.isArray(parsedInitial.avoidForItems) ? (parsedInitial.avoidForItems as string[]).join(", ") : "",
    preferForItems: Array.isArray(parsedInitial.preferForItems) ? (parsedInitial.preferForItems as string[]).join(", ") : "",
  });

  if (!storeName) {
    return <p className="text-sm leading-6 text-[var(--muted)]">No store name saved for this receipt yet.</p>;
  }

  function splitCsv(value: string) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  async function save(nextStoreType: StoreType) {
    setStoreType(nextStoreType);
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/store-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storeType: nextStoreType,
          preferredForCategories: splitCsv(fields.preferredForCategories),
          shoppingTips: splitCsv(fields.shoppingTips),
          pricingNotes: fields.pricingNotes,
          reliability: fields.reliability || undefined,
          defaultPriority: fields.defaultPriority || undefined,
          avoidForItems: splitCsv(fields.avoidForItems),
          preferForItems: splitCsv(fields.preferForItems),
        }),
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = storeType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void save(option.value)}
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

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={fields.preferredForCategories}
          onChange={(e) => setFields((current) => ({ ...current, preferredForCategories: e.target.value }))}
          placeholder="Preferred categories (comma separated)"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <input
          value={fields.shoppingTips}
          onChange={(e) => setFields((current) => ({ ...current, shoppingTips: e.target.value }))}
          placeholder="Shopping tips (comma separated)"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <input
          value={fields.preferForItems}
          onChange={(e) => setFields((current) => ({ ...current, preferForItems: e.target.value }))}
          placeholder="Prefer for items (comma separated)"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <input
          value={fields.avoidForItems}
          onChange={(e) => setFields((current) => ({ ...current, avoidForItems: e.target.value }))}
          placeholder="Avoid for items (comma separated)"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <select
          value={fields.reliability}
          onChange={(e) => setFields((current) => ({ ...current, reliability: e.target.value as ProfileFields["reliability"] }))}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">Reliability</option>
          <option value="high">High reliability</option>
          <option value="medium">Medium reliability</option>
          <option value="low">Low reliability</option>
        </select>
        <select
          value={fields.defaultPriority}
          onChange={(e) => setFields((current) => ({ ...current, defaultPriority: e.target.value as ProfileFields["defaultPriority"] }))}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">Default priority</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      <textarea
        value={fields.pricingNotes}
        onChange={(e) => setFields((current) => ({ ...current, pricingNotes: e.target.value }))}
        placeholder="Pricing / merchant notes"
        className="min-h-[88px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => void save(storeType)}
        disabled={saving}
        className="inline-flex rounded-[10px] border border-[var(--accent)] bg-[rgba(255,241,191,0.7)] px-3 py-2 text-xs font-semibold text-[var(--accent-dark)] disabled:opacity-70"
      >
        {saving ? "Saving..." : "Save merchant profile"}
      </button>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
