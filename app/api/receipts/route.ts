import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";

const numericField = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value.toFixed(2) : value));

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

    const insertPayload = {
      ...payload,
      structuredJson: payload.structuredJson ?? {},
    };

    const inserted = await connection.db.insert(receipts).values(insertPayload).returning({ id: receipts.id });

    return NextResponse.json({
      ok: true,
      receipt_id: inserted[0]?.id,
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
