import { desc, eq } from "drizzle-orm";
import { AppShell, SectionCard } from "@/components/shell";
import { ShoppingPlanItemEditor } from "@/components/shopping-plan-item-editor";
import { ShoppingRecommendationActions } from "@/components/shopping-recommendation-actions";
import { createDb } from "@/db/client";
import { receiptItems, receipts, shoppingLists, shoppingPlanItems, shoppingRecommendationIgnores } from "@/db/schema";
import { normalizeItemName } from "@/lib/normalize-item";

type ShoppingPlanView = {
  id: number;
  name: string;
  status: string;
  items: Array<{
    id: number;
    itemName: string;
    normalizedName: string;
    expectedQty: number | null;
    expectedUnitPrice: number | null;
    expectedLineTotal: number | null;
    preferredStore: string | null;
    priority: string;
    status: string;
    notes: string | null;
  }>;
};

type Recommendation = {
  normalizedName: string;
  itemName: string;
  purchaseCount: number;
  preferredStore: string;
  lastPurchasedAt: Date;
  averageLineTotal: number | null;
  suggestedQty: number;
};

function money(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

async function getShoppingPlan() {
  if (!process.env.DATABASE_URL) {
    return [] as ShoppingPlanView[];
  }

  const { db, pool } = createDb();

  try {
    const lists = await db.query.shoppingLists.findMany({
      orderBy: [desc(shoppingLists.updatedAt), desc(shoppingLists.createdAt)],
    });

    const result: ShoppingPlanView[] = [];

    for (const list of lists) {
      const items = await db.query.shoppingPlanItems.findMany({
        where: eq(shoppingPlanItems.shoppingListId, list.id),
        orderBy: [desc(shoppingPlanItems.updatedAt), desc(shoppingPlanItems.createdAt)],
      });

      result.push({
        id: list.id,
        name: list.name,
        status: list.status,
        items: items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          normalizedName: item.normalizedName,
          expectedQty: item.expectedQty == null ? null : Number(item.expectedQty),
          expectedUnitPrice: item.expectedUnitPrice == null ? null : Number(item.expectedUnitPrice),
          expectedLineTotal: item.expectedLineTotal == null ? null : Number(item.expectedLineTotal),
          preferredStore: item.preferredStore,
          priority: item.priority,
          status: item.status,
          notes: item.notes,
        })),
      });
    }

    return result;
  } finally {
    await pool.end();
  }
}

async function getRecommendations(existingPlannedNames: Set<string>) {
  if (!process.env.DATABASE_URL) {
    return [] as Recommendation[];
  }

  const { db, pool } = createDb();

  try {
    const [rows, ignores] = await Promise.all([
      db
        .select({
          receiptItemId: receiptItems.id,
          itemName: receiptItems.description,
          quantity: receiptItems.quantity,
          lineTotal: receiptItems.lineTotal,
          storeName: receipts.storeName,
          receiptDate: receipts.receiptDate,
          createdAt: receipts.createdAt,
        })
        .from(receiptItems)
        .innerJoin(receipts, eq(receipts.id, receiptItems.receiptId)),
      db.query.shoppingRecommendationIgnores.findMany({
        where: eq(shoppingRecommendationIgnores.active, true),
      }),
    ]);

    const ignored = new Set(ignores.map((row) => row.normalizedName));
    const grouped = new Map<
      string,
      {
        itemName: string;
        purchaseCount: number;
        preferredStore: string;
        lastPurchasedAt: Date;
        lineTotalSum: number;
        lineTotalCount: number;
        suggestedQty: number;
      }
    >();

    for (const row of rows) {
      const normalizedName = normalizeItemName(row.itemName);
      if (!normalizedName || ignored.has(normalizedName) || existingPlannedNames.has(normalizedName)) {
        continue;
      }

      const purchasedAt = row.receiptDate ?? row.createdAt;
      const storeName = row.storeName?.trim() || "Unknown";
      const lineTotal = row.lineTotal == null ? null : Number(row.lineTotal);
      const suggestedQty = row.quantity == null ? 1 : Number(row.quantity);
      const existing = grouped.get(normalizedName);

      if (!existing) {
        grouped.set(normalizedName, {
          itemName: row.itemName,
          purchaseCount: 1,
          preferredStore: storeName,
          lastPurchasedAt: purchasedAt,
          lineTotalSum: lineTotal ?? 0,
          lineTotalCount: lineTotal != null ? 1 : 0,
          suggestedQty,
        });
        continue;
      }

      existing.purchaseCount += 1;
      if (purchasedAt.getTime() > existing.lastPurchasedAt.getTime()) {
        existing.lastPurchasedAt = purchasedAt;
        existing.itemName = row.itemName;
        existing.preferredStore = storeName;
        existing.suggestedQty = suggestedQty;
      }
      if (lineTotal != null) {
        existing.lineTotalSum += lineTotal;
        existing.lineTotalCount += 1;
      }
    }

    return [...grouped.entries()]
      .map(([normalizedName, group]) => ({
        normalizedName,
        itemName: group.itemName,
        purchaseCount: group.purchaseCount,
        preferredStore: group.preferredStore,
        lastPurchasedAt: group.lastPurchasedAt,
        averageLineTotal: group.lineTotalCount ? group.lineTotalSum / group.lineTotalCount : null,
        suggestedQty: group.suggestedQty,
      }))
      .filter((row) => row.purchaseCount >= 2)
      .sort((a, b) => {
        if (b.purchaseCount !== a.purchaseCount) {
          return b.purchaseCount - a.purchaseCount;
        }
        return b.lastPurchasedAt.getTime() - a.lastPurchasedAt.getTime();
      })
      .slice(0, 12);
  } finally {
    await pool.end();
  }
}

export default async function ShoppingPlanPage() {
  const lists = await getShoppingPlan();
  const totalItems = lists.reduce((sum, list) => sum + list.items.length, 0);
  const plannedNames = new Set(lists.flatMap((list) => list.items.map((item) => item.normalizedName)));
  const recommendations = await getRecommendations(plannedNames);

  return (
    <AppShell
      title="Shopping Plan"
      eyebrow="Planning"
      description="Where receipt-derived item actions turn into an actual plan instead of a pile of duplicated groceries and bad memory."
    >
      <section className="space-y-6">
        <SectionCard
          title="Workflow overview"
          description={`${lists.length} list${lists.length === 1 ? "" : "s"} · ${totalItems} planned item${totalItems === 1 ? "" : "s"}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--text)]">What works now</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Shopping lists surface real planned items with editable quantity, priority, status, preferred store, and notes.</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--text)]">Duplicate control</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Merged items stay in one planning surface instead of multiplying into grocery fan fiction.</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--text)]">Recommendation layer</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Frequent purchases now surface as recommendation candidates instead of remaining buried in receipt history.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recommendations"
          description={`${recommendations.length} candidate${recommendations.length === 1 ? "" : "s"} based on repeated purchase patterns.`}
        >
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.map((item) => (
                <div key={item.normalizedName} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-[0_8px_20px_rgba(67,40,24,0.06)]">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--text)]">{item.itemName}</h3>
                        <span className="rounded-full bg-[rgba(255,241,191,0.8)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {item.purchaseCount} purchases
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                        <span><span className="font-semibold">Likely store:</span> {item.preferredStore}</span>
                        <span><span className="font-semibold">Suggested qty:</span> {item.suggestedQty}</span>
                        <span><span className="font-semibold">Last bought:</span> {formatDate(item.lastPurchasedAt)}</span>
                        <span><span className="font-semibold">Avg line total:</span> {money(item.averageLineTotal)}</span>
                      </div>
                    </div>

                    <div className="w-full xl:w-[220px] xl:max-w-[220px]">
                      <ShoppingRecommendationActions
                        normalizedName={item.normalizedName}
                        itemName={item.itemName}
                        preferredStore={item.preferredStore}
                        suggestedQty={item.suggestedQty}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No recommendation candidates yet. That can mean either purchase history is still thin or everything obvious is already planned/ignored.</p>
          )}
        </SectionCard>

        {lists.length ? (
          <div className="space-y-4">
            {lists.map((list) => (
              <SectionCard
                key={list.id}
                title={list.name}
                description={`${list.items.length} item${list.items.length === 1 ? "" : "s"} · list status: ${list.status}`}
              >
                {list.items.length ? (
                  <div className="space-y-3">
                    {list.items.map((item) => (
                      <div key={item.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-[0_8px_20px_rgba(67,40,24,0.06)]">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-[var(--text)]">{item.itemName}</h3>
                              <span className="rounded-full bg-[rgba(255,241,191,0.8)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                {item.priority}
                              </span>
                              <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                {item.status}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                              <span><span className="font-semibold">Qty:</span> {item.expectedQty ?? "—"}</span>
                              <span><span className="font-semibold">Store:</span> {item.preferredStore || "Unknown"}</span>
                              <span><span className="font-semibold">Unit:</span> {money(item.expectedUnitPrice)}</span>
                              <span><span className="font-semibold">Line total:</span> {money(item.expectedLineTotal)}</span>
                            </div>

                            {item.notes ? (
                              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.notes}</p>
                            ) : null}
                          </div>

                          <div className="w-full xl:w-[360px] xl:max-w-[360px]">
                            <ShoppingPlanItemEditor
                              shoppingPlanItemId={item.id}
                              initialValues={{
                                expectedQty: item.expectedQty?.toString() ?? "",
                                priority: item.priority,
                                status: item.status,
                                preferredStore: item.preferredStore ?? "",
                                notes: item.notes ?? "",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[var(--muted)]">This list exists, but it has no planned items yet.</p>
                )}
              </SectionCard>
            ))}
          </div>
        ) : (
          <SectionCard title="Shopping workflow" description="No lists exist yet.">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Use receipt item actions like Buy again, Running low, or Watch to seed the workflow, then manage the resulting plan here.
            </p>
          </SectionCard>
        )}
      </section>
    </AppShell>
  );
}
