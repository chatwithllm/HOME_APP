import Link from "next/link";
import { AppShell, SectionCard } from "@/components/shell";

const routes = [
  {
    href: "/service-dashboard/receipts",
    title: "Dashboard",
    note: "Receipt metrics, spend posture, and merchant intelligence in one place.",
  },
  {
    href: "/service-dashboard/receipt-query",
    title: "Receipt Query",
    note: "Fast filters for recent, monthly, yearly, and merchant-level receipt views.",
  },
  {
    href: "/service-dashboard/items",
    title: "Items Ledger",
    note: "See purchased items consolidated in one place with latest price, store, and buy-list actions.",
  },
  {
    href: "/service-dashboard/shopping-plan",
    title: "Shopping Plan",
    note: "Shopping workflow surface for buy again, running low, and watch actions.",
  },
  {
    href: "/homeassistant",
    title: "HomeAssistant",
    note: "Reserved surface for home telemetry and future automations.",
  },
  {
    href: "/ideas-log",
    title: "Ideas Log",
    note: "Capture future improvements before they vanish into the void.",
  },
];

export default function Home() {
  return (
    <AppShell
      title="Smart Receipts"
      eyebrow="Phase 1 Bootstrap"
      description="Local-first receipt intelligence system for tracking spend, understanding item history, and feeding a smarter shopping workflow without looking like a tragic admin template from 2017."
    >
      <section>
        <SectionCard title="Receipt intelligence, not spreadsheet cosplay" description="">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)] hover:bg-[var(--surface)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-dark)]">
                  Open route
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{route.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{route.note}</p>
              </Link>
            ))}
          </div>

        </SectionCard>
      </section>
    </AppShell>
  );
}
