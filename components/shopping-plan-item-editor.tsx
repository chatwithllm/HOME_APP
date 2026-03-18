"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  shoppingPlanItemId: number;
  initialValues: {
    expectedQty: string;
    priority: string;
    status: string;
    preferredStore: string;
    notes: string;
  };
};

export function ShoppingPlanItemEditor({ shoppingPlanItemId, initialValues }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState(initialValues);

  async function save() {
    setSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/shopping-plan-items/${shoppingPlanItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Save failed");
      }

      setEditing(false);
      setStatusMessage("Saved");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
        >
          Edit item plan
        </button>
        {statusMessage ? <p className="text-[11px] font-medium text-[var(--muted)]">{statusMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={form.expectedQty}
          onChange={(e) => setForm((v) => ({ ...v, expectedQty: e.target.value }))}
          placeholder="Expected qty"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
        />
        <input
          value={form.preferredStore}
          onChange={(e) => setForm((v) => ({ ...v, preferredStore: e.target.value }))}
          placeholder="Preferred store"
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
        />
        <select
          value={form.priority}
          onChange={(e) => setForm((v) => ({ ...v, priority: e.target.value }))}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
        >
          <option value="planned">Planned</option>
          <option value="bought">Bought</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>
      <textarea
        value={form.notes}
        onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))}
        placeholder="Notes"
        className="min-h-[72px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-[10px] border border-[var(--accent)] bg-[rgba(255,241,191,0.7)] px-3 py-2 text-xs font-semibold text-[var(--accent-dark)] disabled:opacity-70">{saving ? "Saving..." : "Save plan"}</button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">Cancel</button>
      </div>
      {statusMessage ? <p className="text-[11px] font-medium text-[var(--muted)]">{statusMessage}</p> : null}
    </div>
  );
}
