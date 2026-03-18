import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { ReceiptItemActions } from "@/components/receipt-item-actions";
import { AppShell, SectionCard } from "@/components/shell";
import { StoreTypeSelector } from "@/components/store-type-selector";
import { createDb } from "@/db/client";
import { receiptItems, receipts, storeProfiles } from "@/db/schema";
import { buildInferredQuantityMap } from "@/lib/receipt-item-quantity";

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getReceiptMediaKind(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(path)) {
    return "image";
  }

  if (/\.pdf$/i.test(path)) {
    return "pdf";
  }

  return "other";
}

function getReceiptMediaSrc(receiptId: number, mediaPath?: string | null) {
  if (!mediaPath) {
    return null;
  }

  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
    return mediaPath;
  }

  if (mediaPath.startsWith("/Users/")) {
    return `/api/receipt-media/${receiptId}`;
  }

  if (mediaPath.startsWith("/")) {
    return mediaPath;
  }

  return null;
}

async function getReceiptDetail(id: number) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const { db, pool } = createDb();

  try {
    const receipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, id),
    });

    if (!receipt) {
      return null;
    }

    const items = await db.query.receiptItems.findMany({
      where: eq(receiptItems.receiptId, id),
      orderBy: [asc(receiptItems.lineNumber), asc(receiptItems.id)],
    });

    const storeProfile = receipt.storeName
      ? await db.query.storeProfiles.findFirst({
          where: eq(storeProfiles.storeName, receipt.storeName),
        })
      : null;

    return { receipt, items, storeProfile };
  } finally {
    await pool.end();
  }
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const receiptId = Number(resolvedParams.id);

  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    notFound();
  }

  const detail = await getReceiptDetail(receiptId);

  if (!detail) {
    notFound();
  }

  const { receipt, items, storeProfile } = detail;
  const inferredQuantityByItemId = buildInferredQuantityMap(items, receipt.storeName);
  const totalAmount = Number(receipt.total ?? 0);
  const subtotalAmount = Number(receipt.subtotal ?? 0);
  const taxAmount = Number(receipt.tax ?? 0);
  const missingQuantityCount = items.filter((item) => item.quantity == null).length;
  const zeroUnitPriceCount = items.filter((item) => Number(item.unitPrice ?? 0) === 0).length;
  const topItems = [...items]
    .sort((a, b) => Number(b.lineTotal ?? 0) - Number(a.lineTotal ?? 0))
    .slice(0, 3);
  const totalsLookConsistent = Math.abs(subtotalAmount + taxAmount - totalAmount) < 0.02;
  const receiptMediaSrc = getReceiptMediaSrc(receipt.id, receipt.imagePath);
  const receiptMediaKind = getReceiptMediaKind(receipt.imagePath);

  return (
    <AppShell
      title={`Receipt #${receipt.id}`}
      eyebrow="Detail"
      description="Metadata, items, receipt image, OCR output, and structured JSON for a single receipt record."
    >
      <section className="space-y-4 sm:space-y-5">
        <Link
          href="/service-dashboard/receipts"
          className="inline-flex px-1 text-sm font-semibold text-[var(--accent-dark)] underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>

        <div className="flex justify-start sm:justify-end">
          <CurrencyToggle />
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <SectionCard title={receipt.storeName || `Receipt #${receipt.id}`} description={`Receipt #${receipt.id} · ${formatDate(receipt.receiptDate)}`}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text)]">
                    <CurrencyAmount amount={receipt.total} currency={receipt.currency} />
                  </p>
                </div>
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Items</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{receipt.itemCount ?? items.length}</p>
                </div>
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Payment</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">{receipt.paymentMethod || "Unknown"}</p>
                </div>
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Source</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">{receipt.sourceChannel || "Manual / unknown"}</p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Receipt date</dt>
                  <dd className="mt-1 text-base font-medium">{formatDate(receipt.receiptDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Receipt time</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.receiptTime || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Subtotal</dt>
                  <dd className="mt-1 text-base font-medium">
                    <CurrencyAmount amount={receipt.subtotal} currency={receipt.currency} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Tax</dt>
                  <dd className="mt-1 text-base font-medium">
                    <CurrencyAmount amount={receipt.tax} currency={receipt.currency} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Source sender</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.sourceSender || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Message ID</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-[var(--text)]">{receipt.sourceMessageId || "—"}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Insights" description="What matters in this receipt at a glance.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Totals check</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">
                    {totalsLookConsistent ? "Subtotal + tax matches total" : "Totals look inconsistent"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Subtotal <CurrencyAmount amount={receipt.subtotal} currency={receipt.currency} /> + tax{" "}
                    <CurrencyAmount amount={receipt.tax} currency={receipt.currency} /> vs total{" "}
                    <CurrencyAmount amount={receipt.total} currency={receipt.currency} />
                  </p>
                </div>

                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Parse quality</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">
                    {missingQuantityCount} missing qty · {zeroUnitPriceCount} zero-price lines
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    These usually indicate OCR/parser gaps rather than real free items.
                  </p>
                </div>

                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4 md:col-span-2 xl:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Top spend items</p>
                  {topItems.length ? (
                    <ul className="mt-2 space-y-2 text-sm text-[var(--text)]">
                      {topItems.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3">
                          <span className="font-medium">{item.description}</span>
                          <span className="whitespace-nowrap font-semibold">
                            <CurrencyAmount amount={item.lineTotal} currency={receipt.currency} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">No line items available yet.</p>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Items"
              description="Line items extracted for this receipt."
              className="lg:flex lg:min-h-[430px] lg:flex-1 lg:flex-col"
            >
              {items.length ? (
                <div className="space-y-3 lg:flex lg:flex-1 lg:flex-col">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-[0_8px_20px_rgba(67,40,24,0.06)]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden text-xs text-[var(--text)] sm:text-sm">
                        <p className="min-w-0 shrink truncate font-semibold text-[var(--text)]">
                          #{item.lineNumber ?? index + 1} {item.description}
                        </p>
                        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] text-[var(--muted)] sm:text-xs">
                          <span>Qty {inferredQuantityByItemId.get(item.id) ?? "—"}</span>
                          <span>•</span>
                          <span>Unit <CurrencyAmount amount={item.unitPrice} currency={receipt.currency} /></span>
                          <span>•</span>
                          <span>Total <CurrencyAmount amount={item.lineTotal} currency={receipt.currency} /></span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-[12px] bg-[rgba(255,241,191,0.35)] p-2">
                        <ReceiptItemActions receiptItemId={item.id} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--muted)]">No receipt items saved for this receipt yet.</p>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <SectionCard title="Store type" description="Classify the merchant for later analytics and filtering.">
              <StoreTypeSelector storeName={receipt.storeName} initialStoreType={storeProfile?.storeType} />
            </SectionCard>

            <SectionCard title="Receipt image" description="Stored receipt image path or preview.">
              <details className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--accent-dark)]">
                  Expand receipt image
                </summary>
                <div className="mt-4">
                  {receiptMediaKind === "image" && receiptMediaSrc ? (
                    <Image
                      src={receiptMediaSrc}
                      alt={`Receipt ${receipt.id}`}
                      width={1200}
                      height={1600}
                      unoptimized
                      className="h-auto w-full rounded-[16px] border border-[var(--border)]"
                    />
                  ) : receiptMediaKind === "pdf" && receiptMediaSrc ? (
                    <div className="space-y-3">
                      <iframe
                        src={receiptMediaSrc}
                        title={`Receipt ${receipt.id} PDF preview`}
                        className="h-[640px] w-full rounded-[16px] border border-[var(--border)] bg-[var(--surface)]"
                      />
                      <a
                        href={receiptMediaSrc}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-sm leading-6 text-[var(--muted)]">
                      {receipt.imagePath ? `Media attached but not previewable here: ${receipt.imagePath}` : "No receipt image is attached yet."}
                    </div>
                  )}
                </div>
              </details>
            </SectionCard>

            <SectionCard title="Debug data" description="Source artifacts and parser output for troubleshooting, not primary reading.">
              <div className="space-y-4">
                <details className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--accent-dark)]">Raw OCR text</summary>
                  <pre className="mt-3 max-h-[320px] overflow-auto text-xs leading-6 text-[var(--text)] whitespace-pre-wrap">
                    {receipt.rawText || "No OCR text saved yet."}
                  </pre>
                </details>

                <details className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--accent-dark)]">Structured JSON</summary>
                  <pre className="mt-3 max-h-[320px] overflow-auto text-xs leading-6 text-[var(--text)] whitespace-pre-wrap">
                    {JSON.stringify(receipt.structuredJson ?? {}, null, 2)}
                  </pre>
                </details>
              </div>
            </SectionCard>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
