import { NextResponse } from "next/server";
import { createDb } from "@/db/client";

function csvEscape(value: unknown) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const { db, pool: dbPool } = createDb();
    pool = dbPool;

    const receiptRows = await db.query.receipts.findMany({
      orderBy: (fields, { desc }) => [desc(fields.id)],
    });

    const receiptsWithItems = [];
    for (const receipt of receiptRows) {
      const items = await db.query.receiptItems.findMany({
        where: (fields, { eq }) => eq(fields.receiptId, receipt.id),
        orderBy: (fields, { asc }) => [asc(fields.lineNumber), asc(fields.id)],
      });
      receiptsWithItems.push({ receipt, items });
    }

    if (format === "csv") {
      const header = [
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

      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="homeapp-receipts-export.csv"',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      exported_at: new Date().toISOString(),
      receipt_count: receiptsWithItems.length,
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
