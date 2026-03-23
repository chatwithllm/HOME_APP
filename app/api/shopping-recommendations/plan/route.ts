import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { shoppingLists, shoppingPlanItems } from "@/db/schema";
import { recordShoppingSyncEvent } from "@/lib/shopping-automation";

const recommendationPlanSchema = z.object({
  normalizedName: z.string().trim().min(1),
  itemName: z.string().trim().min(1),
  preferredStore: z.string().trim().optional(),
  suggestedQty: z.union([z.number(), z.string()]).optional().transform((value) => {
    if (value == null || value === "") {
      return 1;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 1;
  }),
  targetList: z.enum(["Buy Again", "Running Low", "Watch"]).optional(),
});

export async function POST(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const body = (await request.json()) as unknown;
    const payload = recommendationPlanSchema.parse(body);
    const connection = createDb();
    pool = connection.pool;
    const { db } = connection;

    const listName = payload.targetList ?? "Buy Again";

    let list = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.name, listName), eq(shoppingLists.status, "open")),
    });

    if (!list) {
      const created = await db.insert(shoppingLists).values({ name: listName }).returning();
      list = created[0];
    }

    const existing = await db.query.shoppingPlanItems.findFirst({
      where: and(
        eq(shoppingPlanItems.shoppingListId, list.id),
        eq(shoppingPlanItems.normalizedName, payload.normalizedName),
      ),
    });

    if (existing) {
      await recordShoppingSyncEvent({
        shoppingListId: list.id,
        target: "shopping-plan",
        eventType: "recommendation_plan_merged",
        payloadJson: {
          normalizedName: payload.normalizedName,
          itemName: payload.itemName,
          preferredStore: payload.preferredStore || null,
        },
        resultStatus: "ignored",
        resultMessage: "Recommendation already existed in shopping plan",
      });

      return NextResponse.json({
        ok: true,
        merged: true,
        shopping_plan_item_id: existing.id,
        shopping_list_id: list.id,
      });
    }

    const inserted = await db
      .insert(shoppingPlanItems)
      .values({
        shoppingListId: list.id,
        itemName: payload.itemName,
        normalizedName: payload.normalizedName,
        expectedQty: payload.suggestedQty,
        preferredStore: payload.preferredStore || null,
        status: "planned",
      })
      .returning({ id: shoppingPlanItems.id });

    await recordShoppingSyncEvent({
      shoppingListId: list.id,
      target: "shopping-plan",
      eventType: "recommendation_planned",
      payloadJson: {
        normalizedName: payload.normalizedName,
        itemName: payload.itemName,
        preferredStore: payload.preferredStore || null,
        suggestedQty: payload.suggestedQty,
      },
      resultStatus: "success",
      resultMessage: "Recommendation added to shopping plan",
    });

    return NextResponse.json({
      ok: true,
      merged: false,
      shopping_plan_item_id: inserted[0].id,
      shopping_list_id: list.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid recommendation plan payload", issues: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
