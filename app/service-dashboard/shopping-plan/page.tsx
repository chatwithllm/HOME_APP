import { AppShell, SectionCard } from "@/components/shell";

export default function ShoppingPlanPage() {
  return (
    <AppShell
      title="Shopping Plan"
      eyebrow="Planning"
      description="Where receipt-derived item actions turn into an actual plan instead of a pile of duplicated groceries and bad memory."
    >
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SectionCard
            title="Shopping workflow target"
            description="Phase 8 will connect receipt item actions such as buy again, running low, and watch into shopping lists with duplicate merging behavior."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                <p className="text-sm font-semibold text-[var(--text)]">Special lists</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Buy Again &amp; Running Low, plus Next Buy List support.</p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                <p className="text-sm font-semibold text-[var(--text)]">Expected behavior</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Duplicate items merge quantities instead of multiplying nonsense.</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4">
          <SectionCard
            title="Later safeguards"
            description="This page will also surface duplicate purchase warnings and meaningful confirmation for recently purchased items."
          >
            <p className="text-sm leading-6 text-[var(--muted)]">
              Translation: fewer accidental re-buys because a receipt button looked exciting.
            </p>
          </SectionCard>
        </div>
      </section>
    </AppShell>
  );
}
