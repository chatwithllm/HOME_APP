import { and, desc, eq, gte, ilike, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDb } from "@/db/client";
import { receiptItems, receipts } from "@/db/schema";

function csvEscape(value: unknown) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseDateParam(value: string | null, endOfDay = false) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = endOfDay ? `${trimmed}T23:59:59.999` : `${trimmed}T00:00:00.000`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseReceiptIdsParam(value: string | null) {
  if (!value) {
    return [] as number[];
  }

  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part) && part > 0);
}

function buildExportFilename(format: string, scope: string[]) {
  const suffix = scope.length ? `-${scope.join("-")}` : "-full";
  return `homeapp-receipts-export${suffix}.${format}`;
}

export async function GET(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const mode = url.searchParams.get("mode") || "full";
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"), true);
    const store = url.searchParams.get("store")?.trim() || null;
    const receiptIds = parseReceiptIdsParam(url.searchParams.get("receiptIds"));
    const itemsOnly = mode === "items";
    const scope: string[] = [];

    const filters = [
      from ? gte(receipts.receiptDate, from) : undefined,
      to ? lte(receipts.receiptDate, to) : undefined,
      store ? ilike(receipts.storeName, `%${store}%`) : undefined,
      receiptIds.length ? inArray(receipts.id, receiptIds) : undefined,
    ].filter(Boolean);

    if (from) scope.push(`from-${from.toISOString().slice(0, 10)}`);
    if (to) scope.push(`to-${to.toISOString().slice(0, 10)}`);
    if (store) scope.push(`store-${store.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    if (receiptIds.length) scope.push(`ids-${receiptIds.join("-")}`);
    if (itemsOnly) scope.push("items-only");

    const { db, pool: dbPool } = createDb();
    pool = dbPool;

    const receiptRows = await db.query.receipts.findMany({
      where: filters.length ? and(...filters) : undefined,
      orderBy: [desc(receipts.id)],
    });

    const receiptsWithItems = [];
    const flatItems = [];

    for (const receipt of receiptRows) {
      const items = await db.query.receiptItems.findMany({
        where: eq(receiptItems.receiptId, receipt.id),
        orderBy: [receiptItems.lineNumber, receiptItems.id],
      });

      receiptsWithItems.push({ receipt, items });
      for (const item of items) {
        flatItems.push({ receipt, item });
      }
    }

    if (format === "csv") {
      const header = itemsOnly
        ? [
            "receipt_id",
            "store_name",
            "receipt_date",
            "currency",
            "item_id",
            "line_number",
            "description",
            "quantity",
            "unit_price",
            "line_total",
          ]
        : [
            "receipt_id",
            "store_name",
            "receipt_date",
            "currency",
            "subtotal",
            "tax",
            "total",
            "item_id",
            "line_number",
            "description",
            "quantity",
            "unit_price",
            "line_total",
          ];

      const lines = [header.join(",")];

      if (itemsOnly) {
        for (const row of flatItems) {
          lines.push(
            [
              row.receipt.id,
              row.receipt.storeName,
              row.receipt.receiptDate?.toISOString() ?? "",
              row.receipt.currency,
              row.item.id,
              row.item.lineNumber,
              row.item.description,
              row.item.quantity,
              row.item.unitPrice,
              row.item.lineTotal,
            ]
              .map(csvEscape)
              .join(","),
          );
        }
      } else {
        for (const row of receiptsWithItems) {
          if (!row.items.length) {
            lines.push(
              [
                row.receipt.id,
                row.receipt.storeName,
                row.receipt.receiptDate?.toISOString() ?? "",
                row.receipt.currency,
                row.receipt.subtotal,
                row.receipt.tax,
                row.receipt.total,
                "",
                "",
                "",
                "",
                "",
                "",
              ]
                .map(csvEscape)
                .join(","),
            );
            continue;
          }

          for (const item of row.items) {
            lines.push(
              [
                row.receipt.id,
                row.receipt.storeName,
                row.receipt.receiptDate?.toISOString() ?? "",
                row.receipt.currency,
                row.receipt.subtotal,
                row.receipt.tax,
                row.receipt.total,
                item.id,
                item.lineNumber,
                item.description,
                item.quantity,
                item.unitPrice,
                item.lineTotal,
              ]
                .map(csvEscape)
                .join(","),
            );
          }
        }
      }

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildExportFilename("csv", scope)}"`,
        },
      });
    }

    if (itemsOnly) {
      return NextResponse.json({
        ok: true,
        exported_at: new Date().toISOString(),
        mode: "items",
        item_count: flatItems.length,
        filters: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null, store, receiptIds },
        items: flatItems,
      });
    }

    return NextResponse.json({
      ok: true,
      exported_at: new Date().toISOString(),
      mode: "full",
      receipt_count: receiptsWithItems.length,
      filters: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null, store, receiptIds },
      receipts: receiptsWithItems,
    });
  } catch (error) {
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
