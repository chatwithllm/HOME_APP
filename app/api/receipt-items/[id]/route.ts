import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { receiptItems } from "@/db/schema";

const numericField = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => {
    if (value == null || value === "") {
      return null;
    }

    return typeof value === "number" ? value : Number(value);
  })
  .optional();

const receiptItemUpdateSchema = z.object({
  description: z.string().trim().min(1).optional(),
  quantity: numericField,
  unitPrice: numericField,
  lineTotal: numericField,
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const { id } = await params;
    const receiptItemId = Number(id);

    if (!Number.isInteger(receiptItemId) || receiptItemId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid receipt item id" }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    const payload = receiptItemUpdateSchema.parse(body);
    const connection = createDb();
    pool = connection.pool;

    const existing = await connection.db.query.receiptItems.findFirst({
      where: eq(receiptItems.id, receiptItemId),
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Receipt item not found" }, { status: 404 });
    }

    await connection.db
      .update(receiptItems)
      .set({
        description: payload.description ?? existing.description,
        quantity: payload.quantity === undefined ? existing.quantity : payload.quantity,
        unitPrice: payload.unitPrice === undefined ? existing.unitPrice : payload.unitPrice?.toFixed(2) ?? null,
        lineTotal: payload.lineTotal === undefined ? existing.lineTotal : payload.lineTotal?.toFixed(2) ?? null,
      })
      .where(eq(receiptItems.id, receiptItemId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid receipt item update", issues: error.flatten() }, { status: 400 });
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
