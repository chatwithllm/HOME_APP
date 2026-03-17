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
  const [pendingConfirmation, setPendingConfirmation] = useState<ReceiptItemAction | null>(null);

  async function runAction(action: ReceiptItemAction) {
    const force = pendingConfirmation === action;

    setBusyAction(action);
    setStatus("");

    try {
      const response = await fetch("/api/receipt-item/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptItemId, action, force }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        merged?: boolean;
        duplicate_purchase?: boolean;
      };

      if (response.status === 409 && data.duplicate_purchase) {
        setPendingConfirmation(action);
        setStatus("Purchased recently — tap again to confirm");
        return;
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Action failed");
      }

      setPendingConfirmation(null);
      setStatus(data.merged ? "Merged into list" : "Added to list");
    } catch (error) {
      setPendingConfirmation(null);
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
            className={`w-full px-1 py-1.5 text-[10px] font-bold whitespace-nowrap disabled:cursor-wait disabled:opacity-70 ${
              pendingConfirmation === action.value
                ? "text-[var(--accent-dark)]"
                : "text-[var(--accent)] hover:text-[var(--accent-dark)]"
            }`}
          >
            {busyAction === action.value
              ? "Saving..."
              : pendingConfirmation === action.value
                ? `Purchased recently - ${action.label}`
                : action.label}
          </button>
        ))}
      </div>

      {status && !pendingConfirmation ? (
        <div className="px-1 py-1.5 text-center text-[10px] font-bold leading-5 text-[var(--muted)]">
          {status}
        </div>
      ) : null}
    </div>
  );
}
