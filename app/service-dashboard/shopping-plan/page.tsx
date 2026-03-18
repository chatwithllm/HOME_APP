import { desc, eq } from "drizzle-orm";
import { AppShell, SectionCard } from "@/components/shell";
import { ShoppingPlanItemEditor } from "@/components/shopping-plan-item-editor";
import { createDb } from "@/db/client";
import { shoppingLists, shoppingPlanItems } from "@/db/schema";

type ShoppingPlanView = {
  id: number;
  name: string;
  status: string;
  items: Array<{
    id: number;
    itemName: string;
    expectedQty: number | null;
    expectedUnitPrice: number | null;
    expectedLineTotal: number | null;
    preferredStore: string | null;
    priority: string;
    status: string;
    notes: string | null;
  }>;
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

export default async function ShoppingPlanPage() {
  const lists = await getShoppingPlan();
  const totalItems = lists.reduce((sum, list) => sum + list.items.length, 0);

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
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Shopping lists now surface real planned items with editable quantity, priority, status, preferred store, and notes.</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--text)]">Duplicate control</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Merged items stay in one planning surface instead of multiplying into grocery fan fiction.</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--text)]">What comes later</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Richer source-receipt context and recommendations can layer on top once the planning surface itself behaves properly.</p>
            </div>
          </div>
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
