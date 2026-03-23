import Link from "next/link";
import { asc } from "drizzle-orm";
import { AppShell, SectionCard } from "@/components/shell";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";
import { buildInferredQuantityDetailsMap } from "@/lib/receipt-item-quantity";
import { getItemParseSummary, getReceiptQualityFlagCount } from "@/lib/receipt-parse-quality";

type ReceiptAuditRow = {
  receiptId: number;
  storeName: string | null;
  receiptDate: Date | null;
  createdAt: Date;
  imagePath: string | null;
  subtotal: number;
  tax: number;
  total: number;
  unresolvedQtyCount: number;
  zeroPriceCount: number;
  itemCount: number;
  warningCount: number;
  qualityFlagCount: number;
  lowConfidenceCoreFieldCount: number;
  lowConfidenceItemCount: number;
  isLowConfidenceReceipt: boolean;
};

function formatDate(value: Date | null, fallback: Date) {
  const target = value ?? fallback;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(target);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

async function getAuditData() {
  if (!process.env.DATABASE_URL) {
    return [] as ReceiptAuditRow[];
  }

  const { db, pool } = createDb();

  try {
    const receiptRows = await db.query.receipts.findMany({
      orderBy: [asc(receipts.id)],
    });

    const results: ReceiptAuditRow[] = [];

    for (const receipt of receiptRows) {
      const items = await db.query.receiptItems.findMany({
        columns: {
          id: true,
          description: true,
          quantity: true,
          lineTotal: true,
          metaJson: true,
        },
        where: (fields, { eq }) => eq(fields.receiptId, receipt.id),
      });

      const inferred = buildInferredQuantityDetailsMap(items, receipt.storeName);
      const unresolvedQtyCount = [...inferred.values()].filter((item) => item.source === "unresolved").length;
      const zeroPriceCount = items.filter((item) => Number(item.lineTotal ?? 0) === 0).length;
      const receiptQuality = getReceiptQualityFlagCount(receipt.structuredJson);
      const lowConfidenceItemCount = items
        .map((item) => getItemParseSummary(item.metaJson))
        .filter((item) => item.lowConfidenceFields.length > 0 || item.warnings.length > 0).length;

      results.push({
        receiptId: receipt.id,
        storeName: receipt.storeName,
        receiptDate: receipt.receiptDate,
        createdAt: receipt.createdAt,
        imagePath: receipt.imagePath,
        subtotal: Number(receipt.subtotal ?? 0),
        tax: Number(receipt.tax ?? 0),
        total: Number(receipt.total ?? 0),
        unresolvedQtyCount,
        zeroPriceCount,
        itemCount: items.length,
        warningCount: receiptQuality.warningCount,
        qualityFlagCount: receiptQuality.qualityFlagCount,
        lowConfidenceCoreFieldCount: receiptQuality.lowConfidenceCoreFieldCount,
        lowConfidenceItemCount,
        isLowConfidenceReceipt: receiptQuality.isLowConfidenceReceipt || lowConfidenceItemCount > 0,
      });
    }

    return results.reverse();
  } finally {
    await pool.end();
  }
}

export default async function AdminQualityPage() {
  const rows = await getAuditData();

  const totalsMismatch = rows.filter((row) => Math.abs(row.subtotal + row.tax - row.total) >= 0.02);
  const unresolvedQty = rows.filter((row) => row.unresolvedQtyCount > 0);
  const lowConfidenceReceipts = rows.filter((row) => row.isLowConfidenceReceipt);
  const missingMedia = rows.filter((row) => !row.imagePath);
  const missingItems = rows.filter((row) => row.itemCount === 0);

  return (
    <AppShell
      title="Admin Quality"
      eyebrow="Audit"
      description="Centralized view of parser gaps, suspicious totals, missing media, and receipts that deserve human side-eye."
    >
      <section className="space-y-6">
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/service-dashboard/automation"
            className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
          >
            Automation
          </Link>
          <Link
            href="/service-dashboard/export"
            className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
          >
            Export & Backup
          </Link>
        </div>

        <SectionCard title="Overview" description={`${rows.length} receipt${rows.length === 1 ? "" : "s"} audited.`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Totals mismatch</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{totalsMismatch.length}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Unresolved qty</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{unresolvedQty.length}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Low confidence</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{lowConfidenceReceipts.length}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Missing media</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{missingMedia.length}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Missing items</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{missingItems.length}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Totals mismatch" description="Receipts where subtotal + tax does not match total.">
          {totalsMismatch.length ? (
            <div className="space-y-3">
              {totalsMismatch.map((row) => (
                <div key={row.receiptId} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">#{row.receiptId} {row.storeName || "Unknown store"}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(row.receiptDate, row.createdAt)} · subtotal {money(row.subtotal)} + tax {money(row.tax)} vs total {money(row.total)}</p>
                    </div>
                    <Link href={`/service-dashboard/receipts/${row.receiptId}`} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No totals mismatches found. Miracles do happen.</p>
          )}
        </SectionCard>

        <SectionCard title="Unresolved quantities" description="Receipts where item quantities still could not be resolved.">
          {unresolvedQty.length ? (
            <div className="space-y-3">
              {unresolvedQty.map((row) => (
                <div key={row.receiptId} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">#{row.receiptId} {row.storeName || "Unknown store"}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(row.receiptDate, row.createdAt)} · {row.unresolvedQtyCount} unresolved qty · {row.zeroPriceCount} zero-price lines</p>
                    </div>
                    <Link href={`/service-dashboard/receipts/${row.receiptId}`} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No unresolved quantities found.</p>
          )}
        </SectionCard>

        <SectionCard title="Low-confidence receipts" description="Receipts with parser warnings, quality flags, or weak field confidence.">
          {lowConfidenceReceipts.length ? (
            <div className="space-y-3">
              {lowConfidenceReceipts.map((row) => (
                <div key={row.receiptId} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">#{row.receiptId} {row.storeName || "Unknown store"}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatDate(row.receiptDate, row.createdAt)} · {row.warningCount} warnings · {row.qualityFlagCount} quality flags · {row.lowConfidenceCoreFieldCount} low-confidence core fields · {row.lowConfidenceItemCount} low-confidence items
                      </p>
                    </div>
                    <Link href={`/service-dashboard/receipts/${row.receiptId}`} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No low-confidence receipts found.</p>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Missing media" description="Receipts with no stored media path.">
            {missingMedia.length ? (
              <div className="space-y-3">
                {missingMedia.map((row) => (
                  <div key={row.receiptId} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text)]">#{row.receiptId} {row.storeName || "Unknown store"}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(row.receiptDate, row.createdAt)} · no media path stored</p>
                      </div>
                      <Link href={`/service-dashboard/receipts/${row.receiptId}`} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]">Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">No missing-media receipts found.</p>
            )}
          </SectionCard>

          <SectionCard title="Missing items" description="Receipts with zero saved line items.">
            {missingItems.length ? (
              <div className="space-y-3">
                {missingItems.map((row) => (
                  <div key={row.receiptId} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text)]">#{row.receiptId} {row.storeName || "Unknown store"}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(row.receiptDate, row.createdAt)} · no line items saved</p>
                      </div>
                      <Link href={`/service-dashboard/receipts/${row.receiptId}`} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]">Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">No empty-item receipts found.</p>
            )}
          </SectionCard>
        </div>
      </section>
    </AppShell>
  );
}
