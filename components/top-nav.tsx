"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/service-dashboard/receipts", label: "Dashboard" },
  { href: "/service-dashboard/receipt-query", label: "Receipt Queries" },
  { href: "/service-dashboard/shopping-plan", label: "Shopping" },
  { href: "/homeassistant", label: "Home Assistant" },
  { href: "/ideas-log", label: "Ideas" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="flex w-full items-center justify-between gap-4">
      {pathname !== "/" ? (
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-[var(--surface)] transition hover:bg-[rgba(255,241,191,0.12)]"
          style={{ textShadow: "0 2px 10px rgba(67, 40, 24, 0.28)" }}
        >
          Home
        </Link>
      ) : (
        <div />
      )}

      <nav className="w-[75%] max-w-[690px] bg-transparent p-1">
        <div className="grid grid-cols-5 gap-3">
          {items.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[60px] items-center justify-center rounded-[10px] px-4 text-center text-[13px] font-semibold tracking-[-0.02em] whitespace-nowrap transition ${
                  active
                    ? "bg-[var(--surface)] text-[var(--accent-dark)]"
                    : "bg-transparent text-[var(--surface)] hover:bg-[rgba(255,241,191,0.12)]"
                }`}
                style={{ textShadow: "0 2px 10px rgba(67, 40, 24, 0.28)" }}
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
