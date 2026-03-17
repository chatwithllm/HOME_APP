import { sql } from "drizzle-orm";
import { AppShell, InsightCard } from "@/components/shell";
import { createDb } from "@/db/client";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

type ReceiptDashboardStats = {
  receiptCount: number;
  totalSpend: number;
  totalTax: number;
  distinctStores: number;
};

async function getReceiptDashboardStats(): Promise<ReceiptDashboardStats> {
  if (!process.env.DATABASE_URL) {
    return {
      receiptCount: 0,
      totalSpend: 0,
      totalTax: 0,
      distinctStores: 0,
    };
  }

  const { db, pool } = createDb();

  try {
    const result = await db.execute(sql`
      select
        count(*)::int as receipt_count,
        coalesce(sum(total), 0)::numeric as total_spend,
        coalesce(sum(tax), 0)::numeric as total_tax,
        count(distinct nullif(trim(store_name), ''))::int as distinct_stores
      from receipts
    `);

    const row = result.rows[0] as {
      receipt_count: number | string;
      total_spend: number | string;
      total_tax: number | string;
      distinct_stores: number | string;
    };

    return {
      receiptCount: Number(row?.receipt_count ?? 0),
      totalSpend: Number(row?.total_spend ?? 0),
      totalTax: Number(row?.total_tax ?? 0),
      distinctStores: Number(row?.distinct_stores ?? 0),
    };
  } finally {
    await pool.end();
  }
}

export default async function ReceiptsDashboardPage() {
  const stats = await getReceiptDashboardStats();

  return (
    <AppShell
      title="Dashboard"
      eyebrow="Receipts"
      description="Primary analytics surface for receipt activity, store behavior, spend trends, and later shopping signals once the database layer is wired in."
    >
      <section>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            title="Receipt count"
            value={stats.receiptCount.toLocaleString("en-US")}
            detail="Total receipts currently stored in the PostgreSQL ledger."
          />
          <InsightCard
            title="Total spend"
            value={formatCurrency(stats.totalSpend)}
            detail="Sum of receipt totals across all stored receipts."
          />
          <InsightCard
            title="Total tax"
            value={formatCurrency(stats.totalTax)}
            detail="Aggregate tax captured from stored receipts."
          />
          <InsightCard
            title="Distinct stores"
            value={stats.distinctStores.toLocaleString("en-US")}
            detail="Unique store names seen across the receipt set."
          />
        </div>
      </section>
    </AppShell>
  );
}
