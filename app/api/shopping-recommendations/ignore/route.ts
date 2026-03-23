import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { shoppingRecommendationIgnores } from "@/db/schema";
import { recordShoppingSyncEvent } from "@/lib/shopping-automation";

const ignoreSchema = z.object({
  normalizedName: z.string().trim().min(1),
  itemName: z.string().trim().min(1),
  preferredStore: z.string().trim().optional(),
  reason: z.string().trim().optional(),
});

export async function POST(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const body = (await request.json()) as unknown;
    const payload = ignoreSchema.parse(body);
    const connection = createDb();
    pool = connection.pool;
    const { db } = connection;

    const existing = await db.query.shoppingRecommendationIgnores.findFirst({
      where: eq(shoppingRecommendationIgnores.normalizedName, payload.normalizedName),
    });

    if (existing) {
      await db
        .update(shoppingRecommendationIgnores)
        .set({
          itemName: payload.itemName,
          preferredStore: payload.preferredStore || null,
          reason: payload.reason || existing.reason,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(shoppingRecommendationIgnores.id, existing.id));
    } else {
      await db.insert(shoppingRecommendationIgnores).values({
        normalizedName: payload.normalizedName,
        itemName: payload.itemName,
        preferredStore: payload.preferredStore || null,
        reason: payload.reason || null,
      });
    }

    await recordShoppingSyncEvent({
      shoppingListId: null,
      target: "recommendation-ignore",
      eventType: "recommendation_ignored",
      payloadJson: {
        normalizedName: payload.normalizedName,
        itemName: payload.itemName,
        preferredStore: payload.preferredStore || null,
      },
      resultStatus: "success",
      resultMessage: payload.reason || "Recommendation ignored from UI",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid ignore payload", issues: error.flatten() }, { status: 400 });
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
