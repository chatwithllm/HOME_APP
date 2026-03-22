import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CurrencyAmount, CurrencyToggle } from "@/components/currency-preferences";
import { ReceiptItemActions } from "@/components/receipt-item-actions";
import { ReceiptItemEditor } from "@/components/receipt-item-editor";
import { ReceiptMetadataEditor } from "@/components/receipt-metadata-editor";
import { AppShell, SectionCard } from "@/components/shell";
import { StoreTypeSelector } from "@/components/store-type-selector";
import { createDb } from "@/db/client";
import { receiptItems, receipts, storeProfiles } from "@/db/schema";
import { buildInferredQuantityDetailsMap, summarizeInferredQuantities } from "@/lib/receipt-item-quantity";
import { getReceiptParseSummary, getItemParseSummary, isLowConfidence } from "@/lib/receipt-parse-quality";
import { getReceiptMediaSrc } from "@/lib/receipt-media";

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
  const inferredQuantityByItemId = buildInferredQuantityDetailsMap(items, receipt.storeName);
  const quantitySummary = summarizeInferredQuantities(items, receipt.storeName);
  const parseSummary = getReceiptParseSummary(receipt.structuredJson);
  const itemParseSummaries = new Map(items.map((item) => [item.id, getItemParseSummary(item.metaJson)]));
  const lowConfidenceItemCount = [...itemParseSummaries.values()].filter((summary) => summary.lowConfidenceFields.length > 0).length;
  const totalAmount = Number(receipt.total ?? 0);
  const subtotalAmount = Number(receipt.subtotal ?? 0);
  const taxAmount = Number(receipt.tax ?? 0);
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

              <div className="mt-6">
                <ReceiptMetadataEditor
                  receiptId={receipt.id}
                  initialValues={{
                    storeName: receipt.storeName ?? "",
                    receiptDate: receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().slice(0, 10) : "",
                    receiptTime: receipt.receiptTime ?? "",
                    paymentMethod: receipt.paymentMethod ?? "",
                    subtotal: receipt.subtotal?.toString() ?? "",
                    tax: receipt.tax?.toString() ?? "",
                    total: receipt.total?.toString() ?? "",
                    notes: receipt.notes ?? "",
                  }}
                />
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
                    {quantitySummary.unresolvedCount} unresolved qty · {zeroUnitPriceCount} zero-price lines
                    {parseSummary.overallConfidence != null ? ` · ${Math.round(parseSummary.overallConfidence * 100)}% overall confidence` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Qty coverage: {quantitySummary.explicitCount} explicit, {quantitySummary.duplicateLineCount} duplicate-inferred,
                    {" "}
                    {quantitySummary.costcoDefaultCount} Costco-defaulted.
                    {lowConfidenceItemCount ? ` ${lowConfidenceItemCount} item${lowConfidenceItemCount === 1 ? "" : "s"} flagged low-confidence.` : ""}
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

            <SectionCard title="Parser quality" description="Confidence, parser metadata, and warnings captured during intake.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Parser</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">
                    {parseSummary.parserName || parseSummary.parserSource || "Unknown parser"}
                    {parseSummary.parserVersion ? ` · ${parseSummary.parserVersion}` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Overall confidence: {parseSummary.overallConfidence != null ? `${Math.round(parseSummary.overallConfidence * 100)}%` : "Not provided"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Warnings</p>
                  {parseSummary.warnings.length || parseSummary.qualityFlags.length ? (
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--text)]">
                      {[...parseSummary.warnings, ...parseSummary.qualityFlags].map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">No parser warnings were stored for this receipt.</p>
                  )}
                </div>
              </div>

              {!!Object.keys(parseSummary.confidence).length && (
                <div className="mt-4 rounded-[16px] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Field confidence</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(parseSummary.confidence).map(([field, value]) => (
                      <span
                        key={field}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${isLowConfidence(value) ? "bg-[rgba(190,24,24,0.12)] text-[rgb(153,27,27)]" : "bg-[rgba(59,130,246,0.10)] text-[rgb(30,64,175)]"}`}
                      >
                        {field}: {Math.round(value * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Items"
              description="Line items extracted for this receipt."
              className="lg:flex lg:min-h-[430px] lg:flex-1 lg:flex-col"
            >
              {items.length ? (
                <div className="space-y-3 lg:flex lg:flex-1 lg:flex-col">
                  {items.map((item, index) => {
                    const itemParse = itemParseSummaries.get(item.id);

                    return (
                    <div
                      key={item.id}
                      className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-[0_8px_20px_rgba(67,40,24,0.06)]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden text-xs text-[var(--text)] sm:text-sm">
                        <p className="min-w-0 shrink truncate font-semibold text-[var(--text)]">
                          #{item.lineNumber ?? index + 1} {item.description}
                        </p>
                        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] text-[var(--muted)] sm:text-xs">
                          <span>
                            Qty {inferredQuantityByItemId.get(item.id)?.value ?? "—"}
                            {inferredQuantityByItemId.get(item.id)?.source === "duplicate_lines"
                              ? " (dup)"
                              : inferredQuantityByItemId.get(item.id)?.source === "costco_default"
                                ? " (default)"
                                : ""}
                          </span>
                          <span>•</span>
                          <span>Unit <CurrencyAmount amount={item.unitPrice} currency={receipt.currency} /></span>
                          <span>•</span>
                          <span>Total <CurrencyAmount amount={item.lineTotal} currency={receipt.currency} /></span>
                        </div>
                      </div>

                      {(itemParse?.lowConfidenceFields.length || itemParse?.warnings.length || itemParse?.rawLine) ? (
                        <div className="mt-3 rounded-[12px] border border-[rgba(190,24,24,0.14)] bg-[rgba(254,242,242,0.9)] p-3 text-xs leading-6 text-[rgb(127,29,29)]">
                          {itemParse?.lowConfidenceFields.length ? (
                            <p>Low-confidence fields: {itemParse.lowConfidenceFields.join(", ")}</p>
                          ) : null}
                          {itemParse?.warnings.length ? <p>Warnings: {itemParse.warnings.join(", ")}</p> : null}
                          {itemParse?.rawLine ? <p>Raw line: {itemParse.rawLine}</p> : null}
                        </div>
                      ) : null}

                      <div className="mt-3 space-y-2 rounded-[12px] bg-[rgba(255,241,191,0.35)] p-2">
                        <ReceiptItemEditor
                          receiptItemId={item.id}
                          initialValues={{
                            description: item.description,
                            quantity: item.quantity?.toString() ?? "",
                            unitPrice: item.unitPrice?.toString() ?? "",
                            lineTotal: item.lineTotal?.toString() ?? "",
                          }}
                        />
                        <ReceiptItemActions receiptItemId={item.id} />
                      </div>
                    </div>
                  );})}
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
