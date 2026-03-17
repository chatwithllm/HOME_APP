import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { AppShell, InsightCard, SectionCard } from "@/components/shell";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";

function formatReceiptDate(value: Date | null, fallbackCreatedAt: Date) {
  const target = value ?? fallbackCreatedAt;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(target);
}

type ReceiptDashboardStats = {
  receiptCount: number;
  totalSpend: number;
  totalTax: number;
  distinctStores: number;
};

type RecentReceipt = {
  id: number;
  storeName: string | null;
  receiptDate: Date | null;
  total: number;
  currency: string;
  createdAt: Date;
};

type ReceiptDashboardData = {
  stats: ReceiptDashboardStats;
  recentReceipts: RecentReceipt[];
};

async function getReceiptDashboardData(): Promise<ReceiptDashboardData> {
  if (!process.env.DATABASE_URL) {
    return {
      stats: {
        receiptCount: 0,
        totalSpend: 0,
        totalTax: 0,
        distinctStores: 0,
      },
      recentReceipts: [],
    };
  }

  const { db, pool } = createDb();

  try {
    const statsResult = await db.execute(sql`
      select
        count(*)::int as receipt_count,
        coalesce(sum(total), 0)::numeric as total_spend,
        coalesce(sum(tax), 0)::numeric as total_tax,
        count(distinct nullif(trim(store_name), ''))::int as distinct_stores
      from receipts
    `);

    const statsRow = statsResult.rows[0] as {
      receipt_count: number | string;
      total_spend: number | string;
      total_tax: number | string;
      distinct_stores: number | string;
    };

    const recentReceiptsRows = await db.query.receipts.findMany({
      columns: {
        id: true,
        storeName: true,
        receiptDate: true,
        total: true,
        currency: true,
        createdAt: true,
      },
      orderBy: [desc(receipts.createdAt)],
      limit: 10,
    });

    return {
      stats: {
        receiptCount: Number(statsRow?.receipt_count ?? 0),
        totalSpend: Number(statsRow?.total_spend ?? 0),
        totalTax: Number(statsRow?.total_tax ?? 0),
        distinctStores: Number(statsRow?.distinct_stores ?? 0),
      },
      recentReceipts: recentReceiptsRows.map((receipt) => ({
        id: receipt.id,
        storeName: receipt.storeName,
        receiptDate: receipt.receiptDate,
        total: Number(receipt.total ?? 0),
        currency: receipt.currency,
        createdAt: receipt.createdAt,
      })),
    };
  } finally {
    await pool.end();
  }
}

export default async function ReceiptsDashboardPage() {
  const { stats, recentReceipts } = await getReceiptDashboardData();

  return (
    <AppShell
      title="Dashboard"
      eyebrow="Receipts"
      description="Primary analytics surface for receipt activity, store behavior, spend trends, and later shopping signals once the database layer is wired in."
    >
      <section className="space-y-6">
        <div className="flex justify-start sm:justify-end">
          <CurrencyToggle />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            title="Receipt count"
            value={stats.receiptCount.toLocaleString("en-US")}
            detail="Total receipts currently stored in the PostgreSQL ledger."
          />
          <InsightCard
            title="Total spend"
            value={<CurrencyAmount amount={stats.totalSpend} currency="USD" />}
            detail="Sum of receipt totals across all stored receipts."
          />
          <InsightCard
            title="Total tax"
            value={<CurrencyAmount amount={stats.totalTax} currency="USD" />}
            detail="Aggregate tax captured from stored receipts."
          />
          <InsightCard
            title="Distinct stores"
            value={stats.distinctStores.toLocaleString("en-US")}
            detail="Unique store names seen across the receipt set."
          />
        </div>

        <SectionCard title="Recent receipts" description="Open a receipt detail page directly from here.">
          {recentReceipts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)]">
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Store</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReceipts.map((receipt) => (
                    <tr key={receipt.id} className="bg-[var(--surface-soft)] text-[var(--text)]">
                      <td className="rounded-l-[14px] px-3 py-3 font-semibold">#{receipt.id}</td>
                      <td className="px-3 py-3">{receipt.storeName || "—"}</td>
                      <td className="px-3 py-3">{formatReceiptDate(receipt.receiptDate, receipt.createdAt)}</td>
                      <td className="px-3 py-3">
                        <CurrencyAmount amount={receipt.total} currency={receipt.currency} />
                      </td>
                      <td className="rounded-r-[14px] px-3 py-3">
                        <Link
                          href={`/service-dashboard/receipts/${receipt.id}`}
                          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                        >
                          View receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">
              No receipts are stored yet, so there is nothing to open. Once receipts exist, links will appear here.
            </p>
          )}
        </SectionCard>
      </section>
    </AppShell>
  );
}
