import Link from "next/link";
import { and, desc, gte, ilike, lt } from "drizzle-orm";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { AppShell, SectionCard } from "@/components/shell";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";

type QueryPreset = "last-10" | "today" | "this-month" | "this-year" | "costco" | "amazon" | "walmart";

type ReceiptQueryRow = {
  id: number;
  storeName: string | null;
  receiptDate: Date | null;
  total: number;
  currency: string;
  createdAt: Date;
};

function formatReceiptDate(value: Date | null, fallbackCreatedAt: Date) {
  const target = value ?? fallbackCreatedAt;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(target);
}

function getDayRange(baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getMonthRange(baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
  return { start, end };
}

function getYearRange(baseDate = new Date()) {
  const start = new Date(baseDate.getFullYear(), 0, 1);
  const end = new Date(baseDate.getFullYear() + 1, 0, 1);
  return { start, end };
}

function parseManualDateInput(input?: string) {
  const value = input?.trim();

  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = new Date(`${value}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { label: value, start, end };
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { label: value, start, end };
  }

  if (/^\d{4}$/.test(value)) {
    const year = Number(value);
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { label: value, start, end };
  }

  return null;
}

async function getQueryResults(searchParams: { preset?: string; q?: string }) {
  if (!process.env.DATABASE_URL) {
    return {
      label: "No database connection",
      manualInputInvalid: false,
      rows: [] as ReceiptQueryRow[],
    };
  }

  const preset = searchParams.preset as QueryPreset | undefined;
  const manualRange = parseManualDateInput(searchParams.q);
  const manualInputProvided = Boolean(searchParams.q?.trim());
  const manualInputInvalid = manualInputProvided && !manualRange;

  const { db, pool } = createDb();

  try {
    const conditions = [];
    let limit = 50;
    let label = "Recent receipts";

    if (preset === "last-10") {
      limit = 10;
      label = "Last 10 receipts";
    }

    if (preset === "today") {
      const { start, end } = getDayRange();
      conditions.push(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
      label = "Today";
    }

    if (preset === "this-month") {
      const { start, end } = getMonthRange();
      conditions.push(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
      label = "This month";
    }

    if (preset === "this-year") {
      const { start, end } = getYearRange();
      conditions.push(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
      label = "This year";
    }

    if (preset === "costco") {
      conditions.push(ilike(receipts.storeName, "%Costco%"));
      label = "Costco";
    }

    if (preset === "amazon") {
      conditions.push(ilike(receipts.storeName, "%Amazon%"));
      label = "Amazon";
    }

    if (preset === "walmart") {
      conditions.push(ilike(receipts.storeName, "%Walmart%"));
      label = "Walmart";
    }

    if (manualRange) {
      conditions.push(gte(receipts.receiptDate, manualRange.start), lt(receipts.receiptDate, manualRange.end));
      label = `Manual query: ${manualRange.label}`;
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
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(receipts.receiptDate), desc(receipts.createdAt)],
      limit,
    });

    return {
      label,
      manualInputInvalid,
      rows: rows.map((row) => ({
        id: row.id,
        storeName: row.storeName,
        receiptDate: row.receiptDate,
        total: Number(row.total ?? 0),
        currency: row.currency,
        createdAt: row.createdAt,
      })),
    };
  } finally {
    await pool.end();
  }
}

const quickFilters: { label: string; preset: QueryPreset }[] = [
  { label: "Last 10", preset: "last-10" },
  { label: "Today", preset: "today" },
  { label: "This month", preset: "this-month" },
  { label: "This year", preset: "this-year" },
  { label: "Costco", preset: "costco" },
  { label: "Amazon", preset: "amazon" },
  { label: "Walmart", preset: "walmart" },
];

export default async function ReceiptQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { label, manualInputInvalid, rows } = await getQueryResults(resolvedSearchParams);

  return (
    <AppShell
      title="Receipt Query"
      eyebrow="Search"
      description="The query surface for jumping through time, stores, and eventually item-level receipt history without writing SQL like a gremlin."
    >
      <section className="space-y-6">
        <div className="flex justify-start sm:justify-end">
          <CurrencyToggle />
        </div>

        <SectionCard title="Quick filters" description="Run fast receipt lookups without typing anything.">
          <div className="flex flex-wrap gap-3">
            {quickFilters.map((filter) => (
              <Link
                key={filter.preset}
                href={`/service-dashboard/receipt-query?preset=${filter.preset}`}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]"
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Manual query" description="Accepted formats: YYYY-MM-DD, YYYY-MM, YYYY.">
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="q"
              defaultValue={resolvedSearchParams.q || ""}
              placeholder="YYYY-MM-DD, YYYY-MM, or YYYY"
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Run query
            </button>
          </form>
          {manualInputInvalid ? (
            <p className="mt-3 text-sm text-[var(--accent)]">Manual input must match YYYY-MM-DD, YYYY-MM, or YYYY.</p>
          ) : null}
        </SectionCard>

        <SectionCard title={label} description={`${rows.length} receipt${rows.length === 1 ? "" : "s"} found.`}>
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)]">
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Store</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="bg-[var(--surface-soft)] text-[var(--text)]">
                      <td className="rounded-l-[14px] px-3 py-3 font-semibold">#{row.id}</td>
                      <td className="px-3 py-3">{row.storeName || "—"}</td>
                      <td className="px-3 py-3">{formatReceiptDate(row.receiptDate, row.createdAt)}</td>
                      <td className="px-3 py-3">
                        <CurrencyAmount amount={row.total} currency={row.currency} />
                      </td>
                      <td className="rounded-r-[14px] px-3 py-3">
                        <Link
                          href={`/service-dashboard/receipts/${row.id}`}
                          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                        >
                          View receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No receipts matched this query.</p>
          )}
        </SectionCard>
      </section>
    </AppShell>
  );
}
