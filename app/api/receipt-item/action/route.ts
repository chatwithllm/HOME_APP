import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { receiptItems, receipts, shoppingLists, shoppingPlanItems } from "@/db/schema";
import { normalizeItemName } from "@/lib/normalize-item";

const receiptItemActionSchema = z.object({
  receiptItemId: z.number().int().positive(),
  action: z.enum(["buy_again", "running_low", "watch"]),
  force: z.boolean().optional(),
});

const actionToListName = {
  buy_again: "Buy Again",
  running_low: "Running Low",
  watch: "Watch",
} as const;

export async function POST(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const body = (await request.json()) as unknown;
    const payload = receiptItemActionSchema.parse(body);

    const connection = createDb();
    pool = connection.pool;
    const { db } = connection;

    const item = await db.query.receiptItems.findFirst({
      where: eq(receiptItems.id, payload.receiptItemId),
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: "Receipt item not found" }, { status: 404 });
    }

    const receipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, item.receiptId),
    });

    if (!receipt) {
      return NextResponse.json({ ok: false, error: "Parent receipt not found" }, { status: 404 });
    }

    const listName = actionToListName[payload.action];
    const normalizedName = normalizeItemName(item.description);

    if (!payload.force) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentPurchases = await db.execute(sql`
        select
          ri.id as receipt_item_id,
          ri.description,
          r.store_name,
          coalesce(r.receipt_date, r.created_at) as purchased_at
        from receipt_items ri
        join receipts r on r.id = ri.receipt_id
        where coalesce(r.receipt_date, r.created_at) >= ${fourteenDaysAgo}
        order by coalesce(r.receipt_date, r.created_at) desc
        limit 200
      `);

      const duplicate = recentPurchases.rows.find((row) => {
        const description = String((row as { description?: unknown }).description ?? "");
        return normalizeItemName(description) === normalizedName;
      }) as
        | {
            store_name?: string | null;
            purchased_at?: string | Date | null;
          }
        | undefined;

      if (duplicate) {
        return NextResponse.json(
          {
            ok: false,
            error: "Item was purchased recently. Check inventory and confirm to add it again.",
            duplicate_purchase: true,
            last_purchased_at: duplicate.purchased_at ?? null,
            last_store_name: duplicate.store_name ?? null,
          },
          { status: 409 },
        );
      }
    }

    let list = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.name, listName), eq(shoppingLists.status, "open")),
    });

    if (!list) {
      const createdList = await db
        .insert(shoppingLists)
        .values({ name: listName })
        .returning({ id: shoppingLists.id, name: shoppingLists.name });

      list = { id: createdList[0].id, name: createdList[0].name, status: "open" };
    }

    const existingItem = await db.query.shoppingPlanItems.findFirst({
      where: and(
        eq(shoppingPlanItems.shoppingListId, list.id),
        eq(shoppingPlanItems.normalizedName, normalizedName),
      ),
    });

    const incomingQty = item.quantity ?? null;

    if (existingItem) {
      const mergedQty =
        existingItem.expectedQty != null && incomingQty != null
          ? existingItem.expectedQty + incomingQty
          : existingItem.expectedQty ?? incomingQty;

      const updated = await db
        .update(shoppingPlanItems)
        .set({
          expectedQty: mergedQty,
          expectedUnitPrice: existingItem.expectedUnitPrice ?? item.unitPrice,
          expectedLineTotal: existingItem.expectedLineTotal ?? item.lineTotal,
          preferredStore: existingItem.preferredStore ?? receipt.storeName,
          updatedAt: new Date(),
        })
        .where(eq(shoppingPlanItems.id, existingItem.id))
        .returning({ id: shoppingPlanItems.id });

      return NextResponse.json({
        ok: true,
        action: payload.action,
        shopping_list_id: list.id,
        shopping_plan_item_id: updated[0].id,
        merged: true,
      });
    }

    const inserted = await db
      .insert(shoppingPlanItems)
      .values({
        shoppingListId: list.id,
        itemName: item.description,
        normalizedName,
        expectedQty: incomingQty,
        expectedUnitPrice: item.unitPrice,
        expectedLineTotal: item.lineTotal,
        preferredStore: receipt.storeName,
      })
      .returning({ id: shoppingPlanItems.id });

    return NextResponse.json({
      ok: true,
      action: payload.action,
      shopping_list_id: list.id,
      shopping_plan_item_id: inserted[0].id,
      merged: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid receipt item action payload",
          issues: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
