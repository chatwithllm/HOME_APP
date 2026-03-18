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
    <div className="w-full space-y-3">
      <div className="grid w-full gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {actions.map((action) => {
          const confirming = pendingConfirmation === action.value;

          return (
            <button
              key={action.value}
              type="button"
              onClick={() => void runAction(action.value)}
              disabled={busyAction !== null}
              className={`min-h-[34px] w-full min-w-0 rounded-[10px] border px-1.5 py-1.5 text-[10px] font-semibold leading-tight whitespace-nowrap transition disabled:cursor-wait disabled:opacity-70 sm:min-h-[40px] sm:px-3 sm:py-2 sm:text-xs ${
                confirming
                  ? "border-[var(--accent)] bg-[rgba(139,46,29,0.12)] text-[var(--accent-dark)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[rgba(255,241,191,0.7)] hover:text-[var(--accent-dark)]"
              }`}
            >
              {busyAction === action.value
                ? "Saving..."
                : confirming
                  ? `Confirm: ${action.label}`
                  : action.label}
            </button>
          );
        })}
      </div>

      {pendingConfirmation ? (
        <div className="rounded-[10px] bg-[rgba(139,46,29,0.08)] px-3 py-2 text-xs font-medium leading-5 text-[var(--accent-dark)]">
          Purchased recently — tap the same action again to confirm.
        </div>
      ) : null}

      {status && !pendingConfirmation ? (
        <div className="rounded-[10px] bg-[rgba(255,241,191,0.45)] px-3 py-2 text-center text-xs font-medium leading-5 text-[var(--muted)]">
          {status}
        </div>
      ) : null}
    </div>
  );
}
