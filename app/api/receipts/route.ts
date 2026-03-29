import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { receiptItems, receipts } from "@/db/schema";
import { buildReceiptStructuredMetadata } from "@/lib/receipt-processing";

const numericField = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => {
    if (value == null || value === "") {
      return null;
    }

    return typeof value === "number" ? value.toFixed(2) : value;
  });

const boundedConfidenceField = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value : Number(value)))
  .refine((value) => Number.isFinite(value) && value >= 0 && value <= 1, "Confidence must be between 0 and 1");

const parserMetadataSchema = z.object({
  source: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  version: z.string().trim().min(1).optional(),
}).partial();

const itemParseMetaSchema = z.object({
  confidence: z.record(z.string(), boundedConfidenceField).optional(),
  warnings: z.array(z.string().trim().min(1)).optional(),
  rawLine: z.string().optional(),
  inferredFields: z.array(z.string().trim().min(1)).optional(),
}).partial();

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
  parseMeta: itemParseMetaSchema.optional(),
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
  parser: parserMetadataSchema.optional(),
  processingSource: z.enum(["local", "worker", "openai"]).optional(),
  processingStatus: z.enum(["uploaded", "ocr_completed", "draft_built", "reviewed", "saved", "failed"]).optional(),
  uploadStorage: z.enum(["local", "blob"]).optional(),
  uploadContentType: z.string().trim().min(1).optional(),
  uploadOriginalName: z.string().trim().min(1).optional(),
  ocrMethod: z.string().trim().min(1).optional(),
  confidence: z.record(z.string(), boundedConfidenceField).optional(),
  overallConfidence: boundedConfidenceField.optional(),
  warnings: z.array(z.string().trim().min(1)).optional(),
  qualityFlags: z.array(z.string().trim().min(1)).optional(),
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
    const items = payload.items ?? [];
    const hasMeaningfulReceiptFields = Boolean(
      payload.storeName || payload.receiptDate || payload.total || payload.subtotal || payload.tax || payload.rawText,
    );
    const hasMeaningfulItems = items.some((item) => Boolean(item.description || item.lineTotal || item.unitPrice));

    if (!hasMeaningfulReceiptFields && !hasMeaningfulItems) {
      return NextResponse.json(
        {
          ok: false,
          error: "Receipt payload must include meaningful receipt fields or items",
        },
        { status: 400 },
      );
    }

    const connection = createDb();
    pool = connection.pool;

    const inserted = await connection.db.transaction(async (tx) => {
      const derivedItemCount = items.length;
      const qualityMetadata = {
        ...(payload.structuredJson ?? {}),
        ...(payload.parser ? { parser: payload.parser } : {}),
        ...buildReceiptStructuredMetadata({
          processingSource: payload.processingSource ?? "local",
          processingStatus: payload.processingStatus ?? "saved",
          uploadStorage: payload.uploadStorage,
          uploadContentType: payload.uploadContentType,
          uploadOriginalName: payload.uploadOriginalName,
          ocrMethod: payload.ocrMethod,
          confidence: payload.confidence,
          overallConfidence: payload.overallConfidence ?? null,
          warnings: payload.warnings,
          qualityFlags: payload.qualityFlags,
        }),
      };

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
        structuredJson: qualityMetadata,
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
            metaJson: {
              ...(item.metaJson ?? {}),
              ...(item.parseMeta ? item.parseMeta : {}),
            },
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
