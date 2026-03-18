"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CurrencyDisplayMode, convertUsdToInr, formatMoney } from "@/lib/currency";

const STORAGE_KEY = "smart-receipts:currency-display";

type CurrencyPreferencesContextValue = {
  mode: CurrencyDisplayMode;
  setMode: (mode: CurrencyDisplayMode) => void;
};

const CurrencyPreferencesContext = createContext<CurrencyPreferencesContextValue | null>(null);

export function CurrencyPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<CurrencyDisplayMode>(() => {
    if (typeof window === "undefined") {
      return "usd";
    }

    return window.localStorage.getItem(STORAGE_KEY) === "inr" ? "inr" : "usd";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return <CurrencyPreferencesContext.Provider value={value}>{children}</CurrencyPreferencesContext.Provider>;
}

export function useCurrencyPreferences() {
  const context = useContext(CurrencyPreferencesContext);

  if (!context) {
    throw new Error("useCurrencyPreferences must be used within CurrencyPreferencesProvider");
  }

  return context;
}

export function CurrencyToggle() {
  const { mode, setMode } = useCurrencyPreferences();

  return (
    <div className="inline-flex rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]">
      {[
        { value: "usd", label: "USD" },
        { value: "inr", label: "INR" },
      ].map((option) => {
        const active = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value as CurrencyDisplayMode)}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[var(--surface-soft)] text-[var(--accent-dark)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CurrencyAmount({
  amount,
  currency = "USD",
}: {
  amount: number | string | null | undefined;
  currency?: string | null;
}) {
  const { mode } = useCurrencyPreferences();
  const normalizedCurrency = currency || "USD";
  const numericAmount = Number(amount ?? 0);

  if (mode === "inr" && normalizedCurrency === "USD") {
    return <>{formatMoney(convertUsdToInr(numericAmount), "INR")}</>;
  }

  return <>{formatMoney(numericAmount, normalizedCurrency)}</>;
}
