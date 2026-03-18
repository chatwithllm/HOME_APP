import Link from "next/link";
import { AppShell, SectionCard } from "@/components/shell";

export default function ExportPage() {
  return (
    <AppShell
      title="Export & Backup"
      eyebrow="Portability"
      description="Download receipts and line items in formats that can survive outside the app, because databases should not become hostage situations."
    >
      <section className="space-y-6">
        <SectionCard title="Available exports" description="Start with practical full-dataset exports.">
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="/api/export?format=json"
              className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)]"
            >
              <p className="text-sm font-semibold text-[var(--text)]">JSON export</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Full receipts + line items payload for backup, migration, or machine-friendly inspection.</p>
            </a>
            <a
              href="/api/export?format=csv"
              className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)]"
            >
              <p className="text-sm font-semibold text-[var(--text)]">CSV export</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Flat receipt/item export for spreadsheets, ad-hoc analysis, and general human meddling.</p>
            </a>
          </div>
        </SectionCard>

        <SectionCard title="What this covers" description="The first portability pass is intentionally pragmatic.">
          <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li>- receipt metadata</li>
            <li>- line items</li>
            <li>- totals, dates, stores, and currency</li>
            <li>- a download path that does not require direct DB access</li>
          </ul>
        </SectionCard>

        <SectionCard title="Navigation" description="For now, direct URL beats pretending there is a dedicated nav slot.">
          <Link
            href="/service-dashboard/admin-quality"
            className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
          >
            Back to Admin Quality
          </Link>
        </SectionCard>
      </section>
    </AppShell>
  );
}
