import { AppShell, SectionCard } from "@/components/shell";

const quickFilters = ["Last 10", "Today", "This month", "This year", "Costco", "Amazon", "Walmart"];
const manualFormats = ["YYYY-MM-DD", "YYYY-MM", "YYYY"];

export default function ReceiptQueryPage() {
  return (
    <AppShell
      title="Receipt Query"
      eyebrow="Search"
      description="The query surface for jumping through time, stores, and eventually item-level receipt history without writing SQL like a gremlin."
    >
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionCard
            title="Quick filters planned"
            description="Phase 7 will make these operational. For Phase 1, the route exists and the intent is explicit. Revolutionary, I know."
          >
            <div className="flex flex-wrap gap-3">
              {quickFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--text)]"
                >
                  {filter}
                </span>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5">
          <SectionCard
            title="Manual formats"
            description="These date shortcuts are reserved now so the eventual querying contract does not drift."
          >
            <ul className="space-y-3 text-sm leading-6 text-[var(--muted)]">
              {manualFormats.map((format) => (
                <li key={format}>• {format}</li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </section>
    </AppShell>
  );
}
