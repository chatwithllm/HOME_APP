import { AppShell, InsightCard, SectionCard } from "@/components/shell";

export default function ReceiptsDashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      eyebrow="Receipts"
      description="Primary analytics surface for receipt activity, store behavior, spend trends, and later shopping signals once the database layer is wired in."
    >
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
          <InsightCard title="Receipt count" value="—" detail="Phase 2 will back this with PostgreSQL instead of vibes." />
          <InsightCard title="Total spend" value="—" detail="Spend rollups land when the schema and queries exist." />
          <InsightCard title="Total tax" value="—" detail="Tax aggregation arrives with the receipt dashboard data path." />
          <InsightCard title="Distinct stores" value="—" detail="Merchant-level breakdown follows the initial schema setup." />
        </div>

        <div className="lg:col-span-4">
          <SectionCard
            title="What this page becomes"
            description="This route is intentionally real enough to test, while still being honest about Phase 1 scope."
          >
            <ul className="space-y-3 text-sm leading-6 text-[var(--muted)]">
              <li>• Receipt KPI summary cards</li>
              <li>• Spend and tax rollups</li>
              <li>• Merchant activity overview</li>
              <li>• Future hooks for store profiling and receipt detail navigation</li>
            </ul>
          </SectionCard>
        </div>
      </section>
    </AppShell>
  );
}
