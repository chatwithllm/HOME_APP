import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { receiptItems, receipts } from "@/db/schema";

const numericField = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => {
    if (value == null || value === "") {
      return null;
    }

    return typeof value === "number" ? value.toFixed(2) : value;
  });

const receiptItemPayloadSchema = z.object({
  lineNumber: z.number().int().positive().optional(),
  description: z.string().trim().min(1),
  quantity: z.union([z.number(), z.string(), z.null()]).optional().transform((value) => {
    if (value == null || value === "") {
      return null;
    }

    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error("Invalid item quantity");
    }

    return parsed;
  }),
  unitPrice: numericField.optional(),
  lineTotal: numericField.optional(),
  metaJson: z.record(z.string(), z.unknown()).optional(),
});

const receiptPayloadSchema = z.object({
  sourceChannel: z.string().trim().min(1).optional(),
  sourceMessageId: z.string().trim().min(1).optional(),
  sourceSender: z.string().trim().min(1).optional(),
  imagePath: z.string().trim().min(1).optional(),
  storeName: z.string().trim().min(1).optional(),
  receiptDate: z
    .string()
    .trim()
    .min(1)
    .transform((value) => new Date(value))
    .refine((value) => !Number.isNaN(value.getTime()), "Invalid receiptDate")
    .optional(),
  receiptTime: z.string().trim().min(1).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  subtotal: numericField.optional(),
  tax: numericField.optional(),
  total: numericField.optional(),
  paymentMethod: z.string().trim().min(1).optional(),
  itemCount: z.number().int().nonnegative().optional(),
  optionsMode: z.string().trim().min(1).optional(),
  notes: z.string().optional(),
  rawText: z.string().optional(),
  structuredJson: z.record(z.string(), z.unknown()).optional(),
  items: z.array(receiptItemPayloadSchema).optional(),
});

async function parseJsonBody(request: Request) {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  return JSON.parse(rawBody) as unknown;
}

export async function POST(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const parsedBody = await parseJsonBody(request);
    const payload = receiptPayloadSchema.parse(parsedBody);

    const connection = createDb();
    pool = connection.pool;

    const inserted = await connection.db.transaction(async (tx) => {
      const items = payload.items ?? [];
      const derivedItemCount = items.length;

      const insertPayload = {
        sourceChannel: payload.sourceChannel,
        sourceMessageId: payload.sourceMessageId,
        sourceSender: payload.sourceSender,
        imagePath: payload.imagePath,
        storeName: payload.storeName,
        receiptDate: payload.receiptDate,
        receiptTime: payload.receiptTime,
        currency: payload.currency,
        subtotal: payload.subtotal,
        tax: payload.tax,
        total: payload.total,
        paymentMethod: payload.paymentMethod,
        itemCount: derivedItemCount || payload.itemCount,
        optionsMode: payload.optionsMode,
        notes: payload.notes,
        rawText: payload.rawText,
        structuredJson: payload.structuredJson ?? {},
      };

      const receiptInsert = await tx.insert(receipts).values(insertPayload).returning({ id: receipts.id });
      const receiptId = receiptInsert[0]?.id;

      if (!receiptId) {
        throw new Error("Failed to create receipt");
      }

      if (items.length) {
        await tx.insert(receiptItems).values(
          items.map((item, index) => ({
            receiptId,
            lineNumber: item.lineNumber ?? index + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            unitPrice: item.unitPrice ?? null,
            lineTotal: item.lineTotal ?? null,
            metaJson: item.metaJson ?? {},
          })),
        );
      }

      return {
        receiptId,
        itemCount: items.length,
      };
    });

    return NextResponse.json({
      ok: true,
      receipt_id: inserted.receiptId,
      item_count_ingested: inserted.itemCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid receipt payload",
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
