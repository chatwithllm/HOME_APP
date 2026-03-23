import Link from "next/link";
import { ReceiptUploadForm } from "@/components/receipt-upload-form";
import { AppShell, SectionCard } from "@/components/shell";

export default function UploadReceiptPage() {
  return (
    <AppShell
      title="Receipt Upload"
      eyebrow="Intake"
      description="Upload receipt images or PDFs through the web app so OCR and review have a proper front door instead of living as future apologetics."
    >
      <section className="space-y-6">
        <SectionCard title="Upload receipt media" description="Phase 31 adds draft parsing and review after OCR so you can correct the receipt before saving it into the ledger.">
          <ReceiptUploadForm />
        </SectionCard>

        <SectionCard title="What this phase does" description="Receipt Upload + OCR + draft review now covers media intake, text extraction, and pre-save correction.">
          <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li>- accepts image and PDF receipt files from the browser</li>
            <li>- validates size and file type before storing</li>
            <li>- stores uploaded media to a local app-managed path</li>
            <li>- runs local OCR explicitly after upload using `tesseract` or `pdftotext`</li>
            <li>- builds a structured receipt draft from OCR text</li>
            <li>- lets you review/correct fields and line items before saving</li>
          </ul>
        </SectionCard>

        <SectionCard title="Navigation" description="Nearby operator surfaces.">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/service-dashboard/receipts"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Receipts
            </Link>
            <Link
              href="/service-dashboard/admin-quality"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Admin Quality
            </Link>
            <Link
              href="/service-dashboard/automation"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Automation
            </Link>
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}
