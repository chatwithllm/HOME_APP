import { config as loadEnv } from "dotenv";
import { and, desc, gte, ilike, lt } from "drizzle-orm";
import { createDb } from "../db/client";
import { receipts } from "../db/schema";

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: "../.env", override: false, quiet: true });

type QueryKind = "last" | "day" | "month" | "year" | "store";

type ParsedArgs = {
  kind: QueryKind;
  value?: string;
  count?: number;
  json: boolean;
};

function usage() {
  console.log(`Usage:
  tsx scripts/receipt_query.ts last 10 [--json]
  tsx scripts/receipt_query.ts day YYYY-MM-DD [--json]
  tsx scripts/receipt_query.ts month YYYY-MM [--json]
  tsx scripts/receipt_query.ts year YYYY [--json]
  tsx scripts/receipt_query.ts store Costco [--json]`);
}

function parseArgs(argv: string[]): ParsedArgs | null {
  const json = argv.includes("--json");
  const args = argv.filter((arg) => arg !== "--json");

  if (args[0] === "last" && args[1]) {
    const count = Number(args[1]);
    if (Number.isInteger(count) && count > 0) {
      return { kind: "last", count, json };
    }
  }

  if (args[0] === "day" && args[1]) {
    return { kind: "day", value: args[1], json };
  }

  if (args[0] === "month" && args[1]) {
    return { kind: "month", value: args[1], json };
  }

  if (args[0] === "year" && args[1]) {
    return { kind: "year", value: args[1], json };
  }

  if (args[0] === "store" && args[1]) {
    return { kind: "store", value: args.slice(1).join(" "), json };
  }

  return null;
}

function formatReceiptDate(value: Date | null, fallbackCreatedAt: Date) {
  const target = value ?? fallbackCreatedAt;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(target);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function dayRange(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("day requires YYYY-MM-DD");
  }

  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthRange(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error("month requires YYYY-MM");
  }

  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function yearRange(value: string) {
  if (!/^\d{4}$/.test(value)) {
    throw new Error("year requires YYYY");
  }

  const year = Number(value);
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return { start, end };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed) {
    usage();
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const { db, pool } = createDb();

  try {
    let whereClause: ReturnType<typeof and> | undefined;
    let limit = 50;

    if (parsed.kind === "last") {
      limit = parsed.count ?? 10;
    }

    if (parsed.kind === "day") {
      const { start, end } = dayRange(parsed.value!);
      whereClause = and(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
    }

    if (parsed.kind === "month") {
      const { start, end } = monthRange(parsed.value!);
      whereClause = and(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
    }

    if (parsed.kind === "year") {
      const { start, end } = yearRange(parsed.value!);
      whereClause = and(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
    }

    if (parsed.kind === "store") {
      whereClause = and(ilike(receipts.storeName, `%${parsed.value}%`));
    }

    const rows = await db.query.receipts.findMany({
      columns: {
        id: true,
        storeName: true,
        receiptDate: true,
        total: true,
        currency: true,
        createdAt: true,
      },
      where: whereClause,
      orderBy: [desc(receipts.receiptDate), desc(receipts.createdAt)],
      limit,
    });

    const output = rows.map((row) => ({
      id: row.id,
      store: row.storeName,
      receiptDate: row.receiptDate ? row.receiptDate.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      total: Number(row.total ?? 0),
      currency: row.currency,
    }));

    if (parsed.json) {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (!output.length) {
      console.log("No receipts found.");
      return;
    }

    for (const row of rows) {
      console.log(
        `#${row.id} | ${row.storeName || "—"} | ${formatReceiptDate(row.receiptDate, row.createdAt)} | ${formatMoney(Number(row.total ?? 0), row.currency)}`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
