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
        <SectionCard title="Upload receipt media" description="Phase 30 adds explicit OCR extraction after upload so you can inspect raw text before any parsing flow exists.">
          <ReceiptUploadForm />
        </SectionCard>

        <SectionCard title="What this phase does" description="Receipt Upload + OCR now covers media intake and raw text extraction.">
          <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li>- accepts image and PDF receipt files from the browser</li>
            <li>- validates size and file type before storing</li>
            <li>- stores uploaded media to a local app-managed path</li>
            <li>- runs local OCR explicitly after upload using `tesseract` or `pdftotext`</li>
            <li>- shows raw OCR text so the next parsing/review phase has a real input surface</li>
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
