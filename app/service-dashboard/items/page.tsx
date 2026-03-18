import Link from "next/link";
import { sql } from "drizzle-orm";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { ReceiptItemActions } from "@/components/receipt-item-actions";
import { AppShell, SectionCard } from "@/components/shell";
import { createDb } from "@/db/client";

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

type ItemLedgerRow = {
  itemKey: string;
  itemName: string;
  latestReceiptItemId: number;
  latestReceiptId: number;
  lastStoreName: string | null;
  lastPurchasedAt: string;
  latestQuantity: number | null;
  latestUnitPrice: number;
  latestLineTotal: number;
  currency: string;
  purchaseCount: number;
  stores: string | null;
  storeCount: number;
  averageUnitPrice: number | null;
};

async function getStoreOptions() {
  if (!process.env.DATABASE_URL) {
    return [] as string[];
  }

  const { db, pool } = createDb();

  try {
    const result = await db.execute(sql`
      select distinct trim(store_name) as store_name
      from receipts
      where trim(coalesce(store_name, '')) <> ''
      order by trim(store_name)
    `);

    return result.rows.map((row) => String(row.store_name));
  } finally {
    await pool.end();
  }
}

async function getItems(searchParams: { q?: string; store?: string }) {
  if (!process.env.DATABASE_URL) {
    return [] as ItemLedgerRow[];
  }

  const q = searchParams.q?.trim() ?? "";
  const store = searchParams.store?.trim() ?? "";
  const { db, pool } = createDb();

  try {
    const result = await db.execute(sql`
      with base as (
        select
          ri.id as receipt_item_id,
          r.id as receipt_id,
          trim(ri.description) as item_name,
          lower(trim(ri.description)) as item_key,
          ri.quantity,
          ri.unit_price,
          ri.line_total,
          r.currency,
          r.store_name,
          coalesce(r.receipt_date::timestamp, r.created_at) as purchased_at
        from receipt_items ri
        join receipts r on r.id = ri.receipt_id
        where trim(coalesce(ri.description, '')) <> ''
      ),
      aggregate_rows as (
        select
          item_key,
          count(*)::int as purchase_count,
          count(distinct coalesce(store_name, 'Unknown'))::int as store_count,
          string_agg(distinct coalesce(store_name, 'Unknown'), ', ' order by coalesce(store_name, 'Unknown')) as stores,
          avg(unit_price) as average_unit_price
        from base
        group by item_key
      ),
      latest_rows as (
        select
          base.*,
          row_number() over (partition by item_key order by purchased_at desc, receipt_item_id desc) as rn
        from base
      )
      select
        latest_rows.item_key,
        latest_rows.item_name,
        latest_rows.receipt_item_id as latest_receipt_item_id,
        latest_rows.receipt_id as latest_receipt_id,
        latest_rows.store_name as last_store_name,
        latest_rows.purchased_at as last_purchased_at,
        latest_rows.quantity as latest_quantity,
        latest_rows.unit_price as latest_unit_price,
        latest_rows.line_total as latest_line_total,
        latest_rows.currency,
        aggregate_rows.purchase_count,
        aggregate_rows.stores,
        aggregate_rows.store_count,
        aggregate_rows.average_unit_price
      from latest_rows
      join aggregate_rows on aggregate_rows.item_key = latest_rows.item_key
      where latest_rows.rn = 1
        and (${q} = '' or latest_rows.item_name ilike ${`%${q}%`} or aggregate_rows.stores ilike ${`%${q}%`})
        and (${store} = '' or coalesce(latest_rows.store_name, '') ilike ${`%${store}%`} or aggregate_rows.stores ilike ${`%${store}%`})
      order by latest_rows.purchased_at desc, latest_rows.item_name asc
      limit 250
    `);

    return result.rows.map((row) => ({
      itemKey: String(row.item_key),
      itemName: String(row.item_name),
      latestReceiptItemId: Number(row.latest_receipt_item_id),
      latestReceiptId: Number(row.latest_receipt_id),
      lastStoreName: row.last_store_name ? String(row.last_store_name) : null,
      lastPurchasedAt: String(row.last_purchased_at),
      latestQuantity: row.latest_quantity == null ? null : Number(row.latest_quantity),
      latestUnitPrice: Number(row.latest_unit_price ?? 0),
      latestLineTotal: Number(row.latest_line_total ?? 0),
      currency: String(row.currency ?? "USD"),
      purchaseCount: Number(row.purchase_count ?? 0),
      stores: row.stores ? String(row.stores) : null,
      storeCount: Number(row.store_count ?? 0),
      averageUnitPrice: row.average_unit_price == null ? null : Number(row.average_unit_price),
    }));
  } finally {
    await pool.end();
  }
}

export default async function ItemsLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; store?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [rows, storeOptions] = await Promise.all([getItems(resolvedSearchParams), getStoreOptions()]);

  return (
    <AppShell
      title="Items"
      eyebrow="Ledger"
      description="Consolidated purchased items across receipts so you can actually shop by item instead of interrogating every receipt like a suspect."
    >
      <section className="space-y-6">
        <div className="flex justify-start sm:justify-end">
          <CurrencyToggle />
        </div>

        <SectionCard title="Item filters" description="Search by item text or store and jump straight into buy-list actions.">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto]">
            <input
              type="text"
              name="q"
              defaultValue={resolvedSearchParams.q || ""}
              placeholder="Search items, e.g. pecans or milk"
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <select
              name="store"
              defaultValue={resolvedSearchParams.store || ""}
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none"
            >
              <option value="">All stores</option>
              {storeOptions.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3 lg:contents">
              <button
                type="submit"
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
              >
                Apply
              </button>
              <Link
                href="/service-dashboard/items"
                className="inline-flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Clear
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Item ledger"
          description={`${rows.length} consolidated item${rows.length === 1 ? "" : "s"} found.`}
        >
          {rows.length ? (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.itemKey}
                  className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-[0_8px_20px_rgba(67,40,24,0.06)]"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-[var(--text)]">{row.itemName}</h3>
                          <span
                            title={`${row.purchaseCount} purchase${row.purchaseCount === 1 ? "" : "s"}`}
                            className="shrink-0 rounded-full bg-[rgba(255,241,191,0.8)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
                          >
                            {row.purchaseCount}P
                          </span>
                        </div>

                        <Link
                          href={`/service-dashboard/receipts/${row.latestReceiptId}`}
                          className="inline-flex h-[44px] min-w-[52px] shrink-0 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[rgba(255,241,191,0.7)] sm:min-w-[132px] sm:text-sm"
                        >
                          <span className="sm:hidden">OR</span>
                          <span className="hidden sm:inline">Open latest receipt</span>
                        </Link>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                        <span>
                          <span className="font-semibold">Last store:</span> {row.lastStoreName || "Unknown"}
                        </span>
                        <span>
                          <span className="font-semibold">Last date:</span> {formatDate(row.lastPurchasedAt)}
                        </span>
                        <span>
                          <span className="font-semibold">Stores:</span> {row.stores || "Unknown"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text)]">
                        <span>
                          <span className="font-semibold text-[var(--muted)]">Qty:</span> {row.latestQuantity ?? "—"}
                        </span>
                        <span>
                          <span className="font-semibold text-[var(--muted)]">Latest unit:</span>{" "}
                          <CurrencyAmount amount={row.latestUnitPrice} currency={row.currency} />
                        </span>
                        <span>
                          <span className="font-semibold text-[var(--muted)]">Latest total:</span>{" "}
                          <CurrencyAmount amount={row.latestLineTotal} currency={row.currency} />
                        </span>
                        <span>
                          <span className="font-semibold text-[var(--muted)]">Avg unit:</span>{" "}
                          {row.averageUnitPrice != null ? (
                            <CurrencyAmount amount={row.averageUnitPrice} currency={row.currency} />
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="w-full xl:w-[420px] xl:max-w-[420px]">
                      <ReceiptItemActions receiptItemId={row.latestReceiptItemId} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No consolidated items matched the current filters.</p>
          )}
        </SectionCard>
      </section>
    </AppShell>
  );
}
