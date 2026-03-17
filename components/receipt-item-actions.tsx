"use client";

import { useState } from "react";

const actions = [
  { value: "buy_again", label: "Buy again" },
  { value: "running_low", label: "Running low" },
  { value: "watch", label: "Watch" },
] as const;

type ReceiptItemAction = (typeof actions)[number]["value"];

export function ReceiptItemActions({ receiptItemId }: { receiptItemId: number }) {
  const [status, setStatus] = useState<string>("");
  const [busyAction, setBusyAction] = useState<ReceiptItemAction | null>(null);

  async function runAction(action: ReceiptItemAction) {
    setBusyAction(action);
    setStatus("");

    try {
      const response = await fetch("/api/receipt-item/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptItemId, action }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; merged?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Action failed");
      }

      setStatus(data.merged ? "Merged into list" : "Added to list");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            onClick={() => void runAction(action.value)}
            disabled={busyAction !== null}
            className="min-w-[112px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent)] whitespace-nowrap hover:border-[var(--accent)] disabled:cursor-wait disabled:opacity-70"
          >
            {busyAction === action.value ? "Saving..." : action.label}
          </button>
        ))}
      </div>
      {status ? <p className="text-xs text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
