import Link from "next/link";
import { AppShell, SectionCard } from "@/components/shell";

function buildHref(format: "json" | "csv", mode: "full" | "items", query?: string) {
  const params = new URLSearchParams({ format, mode });

  if (query) {
    const input = new URLSearchParams(query);
    for (const [key, value] of input.entries()) {
      if (value.trim()) {
        params.set(key, value);
      }
    }
  }

  return `/api/export?${params.toString()}`;
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const from = typeof resolvedSearchParams.from === "string" ? resolvedSearchParams.from : "";
  const to = typeof resolvedSearchParams.to === "string" ? resolvedSearchParams.to : "";
  const store = typeof resolvedSearchParams.store === "string" ? resolvedSearchParams.store : "";
  const receiptIds = typeof resolvedSearchParams.receiptIds === "string" ? resolvedSearchParams.receiptIds : "";
  const filterParams = new URLSearchParams();
  if (from) filterParams.set("from", from);
  if (to) filterParams.set("to", to);
  if (store) filterParams.set("store", store);
  if (receiptIds) filterParams.set("receiptIds", receiptIds);
  const filterQuery = filterParams.toString();

  return (
    <AppShell
      title="Export & Backup"
      eyebrow="Portability"
      description="Download receipts in more selective shapes, because ‘export everything forever’ is a backup strategy only if chaos is your product manager."
    >
      <section className="space-y-6">
        <SectionCard title="Export filters" description="Limit the export before you download it.">
          <form className="grid gap-4 lg:grid-cols-4" method="get">
            <label className="space-y-2 text-sm font-medium text-[var(--text)]">
              <span>From date</span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--text)]">
              <span>To date</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--text)]">
              <span>Store contains</span>
              <input
                type="text"
                name="store"
                defaultValue={store}
                placeholder="Costco"
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--text)]">
              <span>Receipt IDs</span>
              <input
                type="text"
                name="receiptIds"
                defaultValue={receiptIds}
                placeholder="12,18,41"
                className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <div className="lg:col-span-4 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Apply filters
              </button>
              <Link
                href="/service-dashboard/export"
                className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
              >
                Clear filters
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Available exports" description="Choose full receipts or line items only.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <a
              href={buildHref("json", "full", filterQuery)}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)]"
            >
              <p className="text-sm font-semibold text-[var(--text)]">JSON export</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Filtered receipts + line items payload for backup, migration, or machine-friendly inspection.</p>
            </a>
            <a
              href={buildHref("csv", "full", filterQuery)}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)]"
            >
              <p className="text-sm font-semibold text-[var(--text)]">CSV export</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Flat receipt/item export for spreadsheets and selective manual analysis.</p>
            </a>
            <a
              href={buildHref("json", "items", filterQuery)}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)]"
            >
              <p className="text-sm font-semibold text-[var(--text)]">Items-only JSON</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Just the exported item rows, useful when the receipt wrapper is just getting in the way.</p>
            </a>
            <a
              href={buildHref("csv", "items", filterQuery)}
              className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--accent)]"
            >
              <p className="text-sm font-semibold text-[var(--text)]">Items-only CSV</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Lean item export for spreadsheet work without full receipt envelope clutter.</p>
            </a>
          </div>
        </SectionCard>

        <SectionCard title="Backup workflow" description="Repeatable local backup beats vague confidence.">
          <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <p>Recommended local backup flow:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Apply filters here only when you want a selective export.</li>
              <li>Use JSON export for a faithful backup or machine reuse.</li>
              <li>Use CSV when you want spreadsheet analysis or quick sharing.</li>
              <li>For repeatable local snapshots, save the export command with your preferred filters.</li>
            </ol>
            <pre className="overflow-auto rounded-[16px] bg-[var(--surface-soft)] p-4 text-xs text-[var(--text)] whitespace-pre-wrap">
{`# full backup\ncurl -L "http://localhost:3001${buildHref("json", "full", filterQuery)}" -o homeapp-backup.json\n\n# items-only backup\ncurl -L "http://localhost:3001${buildHref("csv", "items", filterQuery)}" -o homeapp-items.csv`}
            </pre>
          </div>
        </SectionCard>

        <SectionCard title="Current filter summary" description="Sanity-check what you are about to export.">
          <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li>- from: {from || "(none)"}</li>
            <li>- to: {to || "(none)"}</li>
            <li>- store: {store || "(none)"}</li>
            <li>- receipt IDs: {receiptIds || "(none)"}</li>
          </ul>
        </SectionCard>

        <SectionCard title="Navigation" description="Admin Quality and Automation are the nearest sensible control rooms.">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/service-dashboard/admin-quality"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Back to Admin Quality
            </Link>
            <Link
              href="/service-dashboard/automation"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Automation & Integrations
            </Link>
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}
