"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  receiptId: number;
  initialValues: {
    storeName: string;
    receiptDate: string;
    receiptTime: string;
    paymentMethod: string;
    subtotal: string;
    tax: string;
    total: string;
    notes: string;
  };
};

export function ReceiptMetadataEditor({ receiptId, initialValues }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(initialValues);

  async function save() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
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
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
        >
          Edit receipt
        </button>
        {status ? <p className="text-xs font-medium text-[var(--muted)]">{status}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.storeName} onChange={(e) => setForm((v) => ({ ...v, storeName: e.target.value }))} placeholder="Store name" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        <input value={form.receiptDate} onChange={(e) => setForm((v) => ({ ...v, receiptDate: e.target.value }))} placeholder="YYYY-MM-DD" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        <input value={form.receiptTime} onChange={(e) => setForm((v) => ({ ...v, receiptTime: e.target.value }))} placeholder="Receipt time" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        <input value={form.paymentMethod} onChange={(e) => setForm((v) => ({ ...v, paymentMethod: e.target.value }))} placeholder="Payment method" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        <input value={form.subtotal} onChange={(e) => setForm((v) => ({ ...v, subtotal: e.target.value }))} placeholder="Subtotal" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        <input value={form.tax} onChange={(e) => setForm((v) => ({ ...v, tax: e.target.value }))} placeholder="Tax" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
        <input value={form.total} onChange={(e) => setForm((v) => ({ ...v, total: e.target.value }))} placeholder="Total" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </div>
      <textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} placeholder="Notes" className="min-h-[96px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-[10px] border border-[var(--accent)] bg-[rgba(255,241,191,0.7)] px-3 py-2 text-sm font-semibold text-[var(--accent-dark)] disabled:opacity-70">{saving ? "Saving..." : "Save receipt"}</button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--muted)]">Cancel</button>
      </div>
      {status ? <p className="text-xs font-medium text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
