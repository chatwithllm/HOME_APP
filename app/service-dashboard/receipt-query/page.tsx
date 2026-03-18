import type { Route } from "next";
import Link from "next/link";
import { and, asc, desc, gte, ilike, lte, lt, sql } from "drizzle-orm";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { AppShell, SectionCard } from "@/components/shell";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";

type QueryPreset = "last-10" | "today" | "this-month" | "this-year" | "costco" | "amazon" | "walmart";
type SortField = "receipt" | "store" | "date" | "total";
type SortDirection = "asc" | "desc";

type ReceiptQueryRow = {
  id: number;
  storeName: string | null;
  receiptDate: Date | null;
  total: number;
  currency: string;
  createdAt: Date;
};

type ReceiptQueryParams = {
  preset?: string;
  date?: string;
  store?: string;
  item?: string;
  minTotal?: string;
  maxTotal?: string;
  sort?: string;
  dir?: string;
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

function parseAmountInput(input?: string) {
  const value = input?.trim();

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

async function getQueryResults(searchParams: ReceiptQueryParams) {
  if (!process.env.DATABASE_URL) {
    return {
      label: "No database connection",
      dateInputInvalid: false,
      amountInputInvalid: false,
      sortField: "date" as SortField,
      sortDirection: "desc" as SortDirection,
      rows: [] as ReceiptQueryRow[],
    };
  }

  const preset = searchParams.preset as QueryPreset | undefined;
  const manualRange = parseManualDateInput(searchParams.date);
  const dateInputProvided = Boolean(searchParams.date?.trim());
  const dateInputInvalid = dateInputProvided && !manualRange;
  const minTotal = parseAmountInput(searchParams.minTotal);
  const maxTotal = parseAmountInput(searchParams.maxTotal);
  const amountInputInvalid = (searchParams.minTotal?.trim() ? Number.isNaN(minTotal) : false) || (searchParams.maxTotal?.trim() ? Number.isNaN(maxTotal) : false);
  const storeFilter = searchParams.store?.trim() ?? "";
  const itemFilter = searchParams.item?.trim() ?? "";
  const sortField = (["receipt", "store", "date", "total"] as const).includes(searchParams.sort as SortField)
    ? (searchParams.sort as SortField)
    : "date";
  const sortDirection = searchParams.dir === "asc" ? "asc" : "desc";

  const { db, pool } = createDb();

  try {
    const conditions = [];
    const labelParts: string[] = [];
    let limit = 50;
    let label = "Recent receipts";

    if (preset === "last-10") {
      limit = 10;
      labelParts.push("Last 10");
    }

    if (preset === "today") {
      const { start, end } = getDayRange();
      conditions.push(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
      labelParts.push("Today");
    }

    if (preset === "this-month") {
      const { start, end } = getMonthRange();
      conditions.push(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
      labelParts.push("This month");
    }

    if (preset === "this-year") {
      const { start, end } = getYearRange();
      conditions.push(gte(receipts.receiptDate, start), lt(receipts.receiptDate, end));
      labelParts.push("This year");
    }

    if (preset === "costco") {
      conditions.push(ilike(receipts.storeName, "%Costco%"));
      labelParts.push("Costco");
    }

    if (preset === "amazon") {
      conditions.push(ilike(receipts.storeName, "%Amazon%"));
      labelParts.push("Amazon");
    }

    if (preset === "walmart") {
      conditions.push(ilike(receipts.storeName, "%Walmart%"));
      labelParts.push("Walmart");
    }

    if (manualRange) {
      conditions.push(gte(receipts.receiptDate, manualRange.start), lt(receipts.receiptDate, manualRange.end));
      labelParts.push(`Date: ${manualRange.label}`);
    }

    if (storeFilter) {
      conditions.push(ilike(receipts.storeName, `%${storeFilter}%`));
      labelParts.push(`Store: ${storeFilter}`);
    }

    if (!Number.isNaN(minTotal) && minTotal != null) {
      conditions.push(gte(receipts.total, minTotal.toFixed(2)));
      labelParts.push(`Min: ${minTotal.toFixed(2)}`);
    }

    if (!Number.isNaN(maxTotal) && maxTotal != null) {
      conditions.push(lte(receipts.total, maxTotal.toFixed(2)));
      labelParts.push(`Max: ${maxTotal.toFixed(2)}`);
    }

    if (itemFilter) {
      conditions.push(sql`exists (
        select 1
        from receipt_items ri
        where ri.receipt_id = ${receipts.id}
          and ri.description ilike ${`%${itemFilter}%`}
      )`);
      labelParts.push(`Item: ${itemFilter}`);
    }

    if (labelParts.length) {
      label = labelParts.join(" · ");
    }

    const primaryOrder =
      sortField === "receipt"
        ? sortDirection === "asc"
          ? asc(receipts.id)
          : desc(receipts.id)
        : sortField === "store"
          ? sortDirection === "asc"
            ? asc(receipts.storeName)
            : desc(receipts.storeName)
          : sortField === "total"
            ? sortDirection === "asc"
              ? asc(receipts.total)
              : desc(receipts.total)
            : sortDirection === "asc"
              ? asc(receipts.receiptDate)
              : desc(receipts.receiptDate);

    const secondaryOrder =
      sortField === "date"
        ? sortDirection === "asc"
          ? asc(receipts.createdAt)
          : desc(receipts.createdAt)
        : desc(receipts.createdAt);

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
      orderBy: [primaryOrder, secondaryOrder],
      limit,
    });

    return {
      label,
      dateInputInvalid,
      amountInputInvalid,
      sortField,
      sortDirection,
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
  searchParams: Promise<ReceiptQueryParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { label, dateInputInvalid, amountInputInvalid, sortField, sortDirection, rows } = await getQueryResults(resolvedSearchParams);

  function buildHref(overrides: Partial<ReceiptQueryParams>): Route {
    const params = new URLSearchParams();
    const merged: ReceiptQueryParams = { ...resolvedSearchParams, ...overrides };

    for (const [key, value] of Object.entries(merged)) {
      if (value) {
        params.set(key, value);
      }
    }

    return `/service-dashboard/receipt-query?${params.toString()}` as Route;
  }

  function buildSortHref(field: SortField): Route {
    return buildHref({
      sort: field,
      dir: sortField === field && sortDirection === "asc" ? "desc" : "asc",
    });
  }

  function sortLabel(field: SortField, label: string) {
    if (sortField !== field) return label;
    return `${label} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  return (
    <AppShell
      title="Receipt Query"
      eyebrow="Search"
      description="The query surface for jumping through time, stores, totals, and item text without writing SQL like a gremlin."
    >
      <section className="space-y-6">
        <div className="flex justify-start sm:justify-end">
          <CurrencyToggle />
        </div>

        <SectionCard title="Quick filters" description="Run fast receipt lookups without typing anything.">
          <div className="space-y-2 sm:hidden">
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              {quickFilters.slice(0, 4).map((filter) => (
                <Link
                  key={filter.preset}
                  href={buildHref({ preset: filter.preset })}
                  className="flex min-h-[42px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-2 text-center text-[11px] font-semibold leading-tight text-[var(--text)] hover:border-[var(--accent)]"
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {quickFilters.slice(4).map((filter) => (
                <Link
                  key={filter.preset}
                  href={buildHref({ preset: filter.preset })}
                  className="flex min-h-[42px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-2 text-center text-[11px] font-semibold leading-tight text-[var(--text)] hover:border-[var(--accent)]"
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex sm:flex-wrap sm:gap-3">
            {quickFilters.map((filter) => (
              <Link
                key={filter.preset}
                href={buildHref({ preset: filter.preset })}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]"
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Advanced query" description="Combine date, store, item text, totals, and sort controls.">
          <form method="get" className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="preset" value={resolvedSearchParams.preset || ""} />
            <input
              type="text"
              name="date"
              defaultValue={resolvedSearchParams.date || ""}
              placeholder="Date: YYYY-MM-DD / YYYY-MM / YYYY"
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <input
              type="text"
              name="store"
              defaultValue={resolvedSearchParams.store || ""}
              placeholder="Store contains..."
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <input
              type="text"
              name="item"
              defaultValue={resolvedSearchParams.item || ""}
              placeholder="Item contains..."
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                name="minTotal"
                defaultValue={resolvedSearchParams.minTotal || ""}
                placeholder="Min total"
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
              <input
                type="text"
                name="maxTotal"
                defaultValue={resolvedSearchParams.maxTotal || ""}
                placeholder="Max total"
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </div>
            <select
              name="sort"
              defaultValue={sortField}
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text)] outline-none"
            >
              <option value="receipt">Receipt</option>
              <option value="store">Store</option>
              <option value="date">Date</option>
              <option value="total">Total</option>
            </select>
            <select
              name="dir"
              defaultValue={sortDirection}
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text)] outline-none"
            >
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
            <div className="grid grid-cols-2 gap-3 xl:col-span-2">
              <button
                type="submit"
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
              >
                Run query
              </button>
              <Link
                href="/service-dashboard/receipt-query"
                className="inline-flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Clear
              </Link>
            </div>
          </form>
          {dateInputInvalid ? (
            <p className="mt-3 text-sm text-[var(--accent)]">Date input must match YYYY-MM-DD, YYYY-MM, or YYYY.</p>
          ) : null}
          {amountInputInvalid ? (
            <p className="mt-3 text-sm text-[var(--accent)]">Amount filters must be valid numbers.</p>
          ) : null}
        </SectionCard>

        <SectionCard title={label} description={`${rows.length} receipt${rows.length === 1 ? "" : "s"} found.`}>
          {rows.length ? (
            <>
              <div className="mb-4 flex gap-2 text-xs font-semibold text-[var(--muted)] md:hidden">
                <Link href={buildSortHref("receipt")} style={{ flex: "1 1 25%" }} className="flex min-h-[42px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-1 py-2 text-center hover:text-[var(--accent)]">
                  {sortLabel("receipt", "Receipt")}
                </Link>
                <Link href={buildSortHref("store")} style={{ flex: "1 1 25%" }} className="flex min-h-[42px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-1 py-2 text-center hover:text-[var(--accent)]">
                  {sortLabel("store", "Store")}
                </Link>
                <Link href={buildSortHref("date")} style={{ flex: "1 1 25%" }} className="flex min-h-[42px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-1 py-2 text-center hover:text-[var(--accent)]">
                  {sortLabel("date", "Date")}
                </Link>
                <Link href={buildSortHref("total")} style={{ flex: "1 1 25%" }} className="flex min-h-[42px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-1 py-2 text-center hover:text-[var(--accent)]">
                  {sortLabel("total", "Total")}
                </Link>
              </div>

              <div className="space-y-3 md:hidden">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-[var(--text)]">#{row.id} {row.storeName || "—"}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{formatReceiptDate(row.receiptDate, row.createdAt)}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[var(--text)]">
                          <CurrencyAmount amount={row.total} currency={row.currency} />
                        </p>
                        <Link
                          href={`/service-dashboard/receipts/${row.id}`}
                          className="mt-2 inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted)]">
                      <th className="px-3 py-2">
                        <Link href={buildSortHref("receipt")} className="hover:text-[var(--accent)]">
                          {sortLabel("receipt", "Receipt")}
                        </Link>
                      </th>
                      <th className="px-3 py-2">
                        <Link href={buildSortHref("store")} className="hover:text-[var(--accent)]">
                          {sortLabel("store", "Store")}
                        </Link>
                      </th>
                      <th className="px-3 py-2">
                        <Link href={buildSortHref("date")} className="hover:text-[var(--accent)]">
                          {sortLabel("date", "Date")}
                        </Link>
                      </th>
                      <th className="px-3 py-2">
                        <Link href={buildSortHref("total")} className="hover:text-[var(--accent)]">
                          {sortLabel("total", "Total")}
                        </Link>
                      </th>
                      <th className="px-3 py-2">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="bg-[var(--surface-soft)] text-[var(--text)]">
                        <td className="rounded-l-[14px] px-3 py-2 font-semibold">#{row.id}</td>
                        <td className="px-3 py-2">{row.storeName || "—"}</td>
                        <td className="px-3 py-2">{formatReceiptDate(row.receiptDate, row.createdAt)}</td>
                        <td className="px-3 py-2">
                          <CurrencyAmount amount={row.total} currency={row.currency} />
                        </td>
                        <td className="rounded-r-[14px] px-3 py-2">
                          <Link
                            href={`/service-dashboard/receipts/${row.id}`}
                            className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                          >
                            View receipt
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No receipts matched this query.</p>
          )}
        </SectionCard>
      </section>
    </AppShell>
  );
}
