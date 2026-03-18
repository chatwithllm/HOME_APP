import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { ReceiptItemActions } from "@/components/receipt-item-actions";
import { AppShell, SectionCard } from "@/components/shell";
import { createDb } from "@/db/client";
import { receiptItems, receipts } from "@/db/schema";
import { normalizeItemName } from "@/lib/normalize-item";
import { buildInferredQuantityDetailsMap } from "@/lib/receipt-item-quantity";

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
  latestQuantitySource: "explicit" | "duplicate_lines" | "costco_default" | "unresolved";
  latestUnitPrice: number;
  latestLineTotal: number;
  currency: string;
  purchaseCount: number;
  stores: string | null;
  storeCount: number;
  averageUnitPrice: number | null;
};

type BaseLedgerRow = {
  receiptItemId: number;
  receiptId: number;
  itemName: string;
  itemKey: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  currency: string;
  storeName: string | null;
  purchasedAt: Date;
};

function toNumber(value: unknown) {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getStoreOptions() {
  if (!process.env.DATABASE_URL) {
    return [] as string[];
  }

  const { db, pool } = createDb();

  try {
    const result = await db.query.receipts.findMany({
      columns: {
        storeName: true,
      },
      orderBy: [desc(receipts.storeName)],
    });

    return [...new Set(result.map((row) => row.storeName?.trim()).filter((value): value is string => Boolean(value)))].sort(
      (a, b) => a.localeCompare(b),
    );
  } finally {
    await pool.end();
  }
}

async function getItems(searchParams: { q?: string; store?: string }) {
  if (!process.env.DATABASE_URL) {
    return [] as ItemLedgerRow[];
  }

  const q = searchParams.q?.trim().toLowerCase() ?? "";
  const storeFilter = searchParams.store?.trim().toLowerCase() ?? "";
  const { db, pool } = createDb();

  try {
    const joinedRows = await db
      .select({
        receiptItemId: receiptItems.id,
        receiptId: receiptItems.receiptId,
        itemName: receiptItems.description,
        quantity: receiptItems.quantity,
        unitPrice: receiptItems.unitPrice,
        lineTotal: receiptItems.lineTotal,
        currency: receipts.currency,
        storeName: receipts.storeName,
        purchasedAt: receipts.receiptDate,
        createdAt: receipts.createdAt,
      })
      .from(receiptItems)
      .innerJoin(receipts, eq(receipts.id, receiptItems.receiptId));

    const baseRows: BaseLedgerRow[] = joinedRows
      .map((row) => {
        const itemName = row.itemName.trim();
        const itemKey = normalizeItemName(itemName);
        const purchasedAt = row.purchasedAt ?? row.createdAt;

        return {
          receiptItemId: row.receiptItemId,
          receiptId: row.receiptId,
          itemName,
          itemKey,
          quantity: row.quantity == null ? null : Number(row.quantity),
          unitPrice: toNumber(row.unitPrice),
          lineTotal: toNumber(row.lineTotal),
          currency: row.currency ?? "USD",
          storeName: row.storeName?.trim() || null,
          purchasedAt,
        };
      })
      .filter((row) => row.itemKey);

    const rowsByReceiptId = new Map<number, BaseLedgerRow[]>();

    for (const row of baseRows) {
      const existing = rowsByReceiptId.get(row.receiptId) ?? [];
      existing.push(row);
      rowsByReceiptId.set(row.receiptId, existing);
    }

    const inferredQuantityByReceiptItemId = new Map<
      number,
      {
        value: number | null;
        source: "explicit" | "duplicate_lines" | "costco_default" | "unresolved";
      }
    >();

    for (const receiptRows of rowsByReceiptId.values()) {
      const inferredMap = buildInferredQuantityDetailsMap(
        receiptRows.map((row) => ({
          id: row.receiptItemId,
          description: row.itemName,
          quantity: row.quantity,
          lineTotal: row.lineTotal,
        })),
        receiptRows[0]?.storeName,
      );

      for (const [receiptItemId, detail] of inferredMap) {
        inferredQuantityByReceiptItemId.set(receiptItemId, detail);
      }
    }

    const grouped = new Map<
      string,
      {
        latest: BaseLedgerRow;
        latestQuantity: number | null;
        latestQuantitySource: "explicit" | "duplicate_lines" | "costco_default" | "unresolved";
        purchaseCount: number;
        stores: Set<string>;
        unitPriceSum: number;
        unitPriceCount: number;
      }
    >();

    for (const row of baseRows) {
      const inferred = inferredQuantityByReceiptItemId.get(row.receiptItemId) ?? {
        value: row.quantity,
        source: row.quantity != null ? "explicit" : "unresolved",
      };

      const existing = grouped.get(row.itemKey);

      if (!existing) {
        grouped.set(row.itemKey, {
          latest: row,
          latestQuantity: inferred.value,
          latestQuantitySource: inferred.source,
          purchaseCount: 1,
          stores: new Set(row.storeName ? [row.storeName] : []),
          unitPriceSum: row.unitPrice ?? 0,
          unitPriceCount: row.unitPrice != null ? 1 : 0,
        });
        continue;
      }

      existing.purchaseCount += 1;

      if (row.storeName) {
        existing.stores.add(row.storeName);
      }

      if (row.unitPrice != null) {
        existing.unitPriceSum += row.unitPrice;
        existing.unitPriceCount += 1;
      }

      const isLater =
        row.purchasedAt.getTime() > existing.latest.purchasedAt.getTime() ||
        (row.purchasedAt.getTime() === existing.latest.purchasedAt.getTime() &&
          row.receiptItemId > existing.latest.receiptItemId);

      if (isLater) {
        existing.latest = row;
        existing.latestQuantity = inferred.value;
        existing.latestQuantitySource = inferred.source;
      }
    }

    return [...grouped.entries()]
      .map(([itemKey, group]) => ({
        itemKey,
        itemName: group.latest.itemName,
        latestReceiptItemId: group.latest.receiptItemId,
        latestReceiptId: group.latest.receiptId,
        lastStoreName: group.latest.storeName,
        lastPurchasedAt: group.latest.purchasedAt.toISOString(),
        latestQuantity: group.latestQuantity,
        latestQuantitySource: group.latestQuantitySource,
        latestUnitPrice: group.latest.unitPrice ?? 0,
        latestLineTotal: group.latest.lineTotal ?? 0,
        currency: group.latest.currency,
        purchaseCount: group.purchaseCount,
        stores: group.stores.size ? [...group.stores].sort((a, b) => a.localeCompare(b)).join(", ") : null,
        storeCount: group.stores.size,
        averageUnitPrice: group.unitPriceCount ? group.unitPriceSum / group.unitPriceCount : null,
      }))
      .filter((row) => {
        const matchesQuery =
          !q || row.itemName.toLowerCase().includes(q) || (row.stores ? row.stores.toLowerCase().includes(q) : false);
        const matchesStore =
          !storeFilter ||
          (row.lastStoreName ? row.lastStoreName.toLowerCase().includes(storeFilter) : false) ||
          (row.stores ? row.stores.toLowerCase().includes(storeFilter) : false);

        return matchesQuery && matchesStore;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.lastPurchasedAt).getTime() - new Date(a.lastPurchasedAt).getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        return a.itemName.localeCompare(b.itemName);
      })
      .slice(0, 250);
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
                          {row.latestQuantitySource === "duplicate_lines"
                            ? " (dup)"
                            : row.latestQuantitySource === "costco_default"
                              ? " (default)"
                              : ""}
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
