"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  receiptItemId: number;
  initialValues: {
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  };
};

export function ReceiptItemEditor({ receiptItemId, initialValues }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(initialValues);

  async function save() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/receipt-items/${receiptItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Save failed");
      }

      setEditing(false);
      setStatus("Saved");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => setEditing(true)} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">Edit item</button>
        {status ? <p className="text-[11px] font-medium text-[var(--muted)]">{status}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <input value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} placeholder="Description" className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm" />
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={form.quantity} onChange={(e) => setForm((v) => ({ ...v, quantity: e.target.value }))} placeholder="Qty" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm" />
        <input value={form.unitPrice} onChange={(e) => setForm((v) => ({ ...v, unitPrice: e.target.value }))} placeholder="Unit price" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm" />
        <input value={form.lineTotal} onChange={(e) => setForm((v) => ({ ...v, lineTotal: e.target.value }))} placeholder="Line total" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-[10px] border border-[var(--accent)] bg-[rgba(255,241,191,0.7)] px-3 py-2 text-xs font-semibold text-[var(--accent-dark)] disabled:opacity-70">{saving ? "Saving..." : "Save item"}</button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">Cancel</button>
      </div>
      {status ? <p className="text-[11px] font-medium text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
