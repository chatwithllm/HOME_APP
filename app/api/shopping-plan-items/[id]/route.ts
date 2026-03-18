import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { shoppingPlanItems } from "@/db/schema";

const shoppingPlanItemUpdateSchema = z.object({
  expectedQty: z.union([z.number(), z.string(), z.null()]).optional().transform((value) => {
    if (value == null || value === "") {
      return undefined;
    }

    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error("Invalid expected quantity");
    }

    return parsed;
  }),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["planned", "bought", "skipped"]).optional(),
  preferredStore: z.union([z.string().trim(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const { id } = await params;
    const shoppingPlanItemId = Number(id);

    if (!Number.isInteger(shoppingPlanItemId) || shoppingPlanItemId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid shopping plan item id" }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    const payload = shoppingPlanItemUpdateSchema.parse(body);
    const connection = createDb();
    pool = connection.pool;

    const existing = await connection.db.query.shoppingPlanItems.findFirst({
      where: eq(shoppingPlanItems.id, shoppingPlanItemId),
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Shopping plan item not found" }, { status: 404 });
    }

    await connection.db
      .update(shoppingPlanItems)
      .set({
        expectedQty: payload.expectedQty ?? existing.expectedQty,
        priority: payload.priority ?? existing.priority,
        status: payload.status ?? existing.status,
        preferredStore:
          payload.preferredStore === undefined ? existing.preferredStore : payload.preferredStore || null,
        notes: payload.notes === undefined ? existing.notes : payload.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(shoppingPlanItems.id, shoppingPlanItemId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid shopping plan item update", issues: error.flatten() }, { status: 400 });
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
