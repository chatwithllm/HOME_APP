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

function canRenderImage(path?: string | null) {
  if (!path) {
    return false;
  }

  return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/");
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

  return (
    <AppShell
      title={`Receipt #${receipt.id}`}
      eyebrow="Detail"
      description="Metadata, items, receipt image, OCR output, and structured JSON for a single receipt record."
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/service-dashboard/receipts"
            className="inline-flex px-1 text-sm font-semibold text-[var(--accent-dark)] underline-offset-4 hover:underline"
          >
            Back to dashboard
          </Link>

          <CurrencyToggle />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <SectionCard title={`Receipt #${receipt.id}`} description={receipt.storeName || "Stored receipt record"}>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Store</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.storeName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Receipt date</dt>
                  <dd className="mt-1 text-base font-medium">{formatDate(receipt.receiptDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Receipt time</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.receiptTime || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Payment method</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.paymentMethod || "—"}</dd>
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
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Total</dt>
                  <dd className="mt-1 text-base font-medium">
                    <CurrencyAmount amount={receipt.total} currency={receipt.currency} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Item count</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.itemCount ?? items.length}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Source channel</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.sourceChannel || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Source sender</dt>
                  <dd className="mt-1 text-base font-medium">{receipt.sourceSender || "—"}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Items" description="Line items extracted for this receipt.">
              {items.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-[var(--muted)]">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Unit price</th>
                        <th className="px-3 py-2">Line total</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="rounded-[14px] bg-[var(--surface-soft)] text-[var(--text)]">
                          <td className="px-3 py-3">{item.lineNumber ?? index + 1}</td>
                          <td className="px-3 py-3 font-medium">{item.description}</td>
                          <td className="px-3 py-3">{item.quantity ?? "—"}</td>
                          <td className="px-3 py-3">
                            <CurrencyAmount amount={item.unitPrice} currency={receipt.currency} />
                          </td>
                          <td className="px-3 py-3">
                            <CurrencyAmount amount={item.lineTotal} currency={receipt.currency} />
                          </td>
                          <td className="px-3 py-3">
                            <ReceiptItemActions receiptItemId={item.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              {canRenderImage(receipt.imagePath) ? (
                <Image
                  src={receipt.imagePath || ""}
                  alt={`Receipt ${receipt.id}`}
                  width={1200}
                  height={1600}
                  unoptimized
                  className="h-auto w-full rounded-[16px] border border-[var(--border)]"
                />
              ) : (
                <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-8 text-sm leading-6 text-[var(--muted)]">
                  {receipt.imagePath ? `Image stored at: ${receipt.imagePath}` : "No receipt image is attached yet."}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Raw OCR" description="Unstructured OCR text captured for this receipt.">
              <pre className="max-h-[320px] overflow-auto rounded-[16px] bg-[var(--surface-soft)] p-4 text-xs leading-6 text-[var(--text)] whitespace-pre-wrap">
                {receipt.rawText || "No OCR text saved yet."}
              </pre>
            </SectionCard>

            <SectionCard title="Structured JSON" description="Parsed structured receipt payload.">
              <pre className="max-h-[320px] overflow-auto rounded-[16px] bg-[var(--surface-soft)] p-4 text-xs leading-6 text-[var(--text)] whitespace-pre-wrap">
                {JSON.stringify(receipt.structuredJson ?? {}, null, 2)}
              </pre>
            </SectionCard>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
