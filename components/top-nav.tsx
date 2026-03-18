"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/service-dashboard/receipts", label: "Dashboard" },
  { href: "/service-dashboard/items", label: "Items" },
  { href: "/service-dashboard/receipt-query", label: "Receipt Queries" },
  { href: "/service-dashboard/shopping-plan", label: "Shopping" },
  { href: "/homeassistant", label: "Home Assistant" },
  { href: "/ideas-log", label: "Ideas" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {pathname !== "/" ? (
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center self-start rounded-[10px] px-4 text-sm font-semibold text-[var(--surface)] transition hover:bg-[rgba(255,241,191,0.12)]"
          style={{ textShadow: "0 2px 10px rgba(67, 40, 24, 0.28)" }}
        >
          Home
        </Link>
      ) : null}

      <nav className="w-full rounded-[18px] border border-[rgba(255,241,191,0.22)] bg-[rgba(67,40,24,0.14)] p-2 shadow-[0_12px_28px_rgba(67,40,24,0.12)] backdrop-blur-[6px] sm:w-[75%] sm:max-w-[760px] sm:rounded-[20px] sm:p-1">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-6 sm:gap-3">
          {items.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`col-span-2 flex min-h-[54px] items-center justify-center rounded-[14px] border px-3 text-center text-[13px] font-semibold leading-tight tracking-[-0.02em] shadow-[0_6px_18px_rgba(67,40,24,0.08)] transition sm:col-span-1 sm:min-h-[60px] sm:px-4 ${
                  active
                    ? "border-[var(--surface)] bg-[var(--surface)] text-[var(--accent-dark)]"
                    : "border-[rgba(255,241,191,0.14)] bg-[rgba(255,241,191,0.08)] text-[var(--surface)] hover:border-[rgba(255,241,191,0.28)] hover:bg-[rgba(255,241,191,0.16)]"
                }`}
                style={{ textShadow: active ? "none" : "0 2px 10px rgba(67, 40, 24, 0.28)" }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
