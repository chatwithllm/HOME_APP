import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";

const numericField = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => {
    if (value == null || value === "") {
      return null;
    }

    return typeof value === "number" ? value.toFixed(2) : value;
  })
  .optional();

const receiptUpdateSchema = z.object({
  storeName: z.string().trim().optional(),
  receiptDate: z
    .union([z.string().trim(), z.null()])
    .transform((value) => {
      if (!value) {
        return null;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid receiptDate");
      }

      return parsed;
    })
    .optional(),
  receiptTime: z.union([z.string().trim(), z.null()]).optional(),
  paymentMethod: z.union([z.string().trim(), z.null()]).optional(),
  subtotal: numericField,
  tax: numericField,
  total: numericField,
  notes: z.union([z.string(), z.null()]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const { id } = await params;
    const receiptId = Number(id);

    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid receipt id" }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    const payload = receiptUpdateSchema.parse(body);
    const connection = createDb();
    pool = connection.pool;

    const existing = await connection.db.query.receipts.findFirst({
      where: eq(receipts.id, receiptId),
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Receipt not found" }, { status: 404 });
    }

    const updatePayload = {
      storeName: payload.storeName === "" ? null : payload.storeName ?? existing.storeName,
      receiptDate: payload.receiptDate === undefined ? existing.receiptDate : payload.receiptDate,
      receiptTime: payload.receiptTime === undefined ? existing.receiptTime : payload.receiptTime || null,
      paymentMethod: payload.paymentMethod === undefined ? existing.paymentMethod : payload.paymentMethod || null,
      subtotal: payload.subtotal === undefined ? existing.subtotal : payload.subtotal,
      tax: payload.tax === undefined ? existing.tax : payload.tax,
      total: payload.total === undefined ? existing.total : payload.total,
      notes: payload.notes === undefined ? existing.notes : payload.notes || null,
      updatedAt: new Date(),
    };

    await connection.db.update(receipts).set(updatePayload).where(eq(receipts.id, receiptId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid receipt update", issues: error.flatten() }, { status: 400 });
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
