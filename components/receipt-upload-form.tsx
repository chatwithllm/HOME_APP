"use client";

import { useState } from "react";

type UploadResult = {
  originalName: string;
  storedName: string;
  filePath: string;
  contentType: string;
  size: number;
};

type OcrResult = {
  filePath: string;
  method: string;
  rawText: string;
  characterCount: number;
  lineCount: number;
};

type DraftItem = {
  lineNumber: number;
  description: string;
  quantity: number | null;
  unitPrice: string | null;
  lineTotal: string | null;
  parseMeta: {
    confidence: Record<string, number>;
    warnings: string[];
    rawLine: string;
    inferredFields: string[];
  };
};

type DraftResult = {
  storeName: string | null;
  receiptDate: string | null;
  total: string | null;
  subtotal: string | null;
  tax: string | null;
  currency: string;
  rawText: string;
  warnings: string[];
  qualityFlags: string[];
  overallConfidence: number;
  confidence: Record<string, number>;
  items: DraftItem[];
};

export function ReceiptUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [savedReceiptId, setSavedReceiptId] = useState<number | null>(null);

  async function uploadFile(target: File) {
    setUploading(true);
    setError("");
    setResult(null);
    setOcrResult(null);
    setDraft(null);
    setSavedReceiptId(null);

    try {
      const formData = new FormData();
      formData.append("file", target);

      const response = await fetch("/api/receipt-media/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; media?: UploadResult };

      if (!response.ok || !data.ok || !data.media) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data.media);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function runOcr() {
    if (!result) return;
    setOcrRunning(true);
    setError("");
    setOcrResult(null);
    setDraft(null);
    setSavedReceiptId(null);

    try {
      const response = await fetch("/api/receipt-media/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: result.filePath, contentType: result.contentType }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; ocr?: OcrResult };
      if (!response.ok || !data.ok || !data.ocr) throw new Error(data.error || "OCR failed");
      setOcrResult(data.ocr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setOcrRunning(false);
    }
  }

  async function buildDraft() {
    if (!ocrResult?.rawText) return;
    setDrafting(true);
    setError("");
    setDraft(null);
    setSavedReceiptId(null);

    try {
      const response = await fetch("/api/receipt-media/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: ocrResult.rawText }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; draft?: DraftResult };
      if (!response.ok || !data.ok || !data.draft) throw new Error(data.error || "Draft build failed");
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft build failed");
    } finally {
      setDrafting(false);
    }
  }

  async function saveDraft() {
    if (!draft || !result || !ocrResult) return;
    setSaving(true);
    setError("");
    setSavedReceiptId(null);

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: result.filePath,
          storeName: draft.storeName || undefined,
          receiptDate: draft.receiptDate || undefined,
          currency: draft.currency,
          subtotal: draft.subtotal,
          tax: draft.tax,
          total: draft.total,
          rawText: ocrResult.rawText,
          parser: { source: "local-ocr", name: ocrResult.method, version: "phase-31" },
          confidence: draft.confidence,
          overallConfidence: draft.overallConfidence,
          warnings: draft.warnings,
          qualityFlags: draft.qualityFlags,
          items: draft.items,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; receipt_id?: number };
      if (!response.ok || !data.ok || !data.receipt_id) throw new Error(data.error || "Save failed");
      setSavedReceiptId(data.receipt_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateDraftField<K extends keyof DraftResult>(key: K, value: DraftResult[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateDraftItem(index: number, field: keyof DraftItem, value: DraftItem[keyof DraftItem]) {
    setDraft((current) => {
      if (!current) return current;
      const items = [...current.items];
      items[index] = { ...items[index], [field]: value } as DraftItem;
      return { ...current, items };
    });
  }

  return (
    <div className="space-y-4">
      <label
        className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed p-6 text-center transition ${
          dragActive ? "border-[var(--accent)] bg-[rgba(255,241,191,0.25)]" : "border-[var(--border)] bg-[var(--surface-soft)]"
        }`}
        onDragEnter={() => setDragActive(true)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) {
            setFile(dropped);
            void uploadFile(dropped);
          }
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;
            setFile(chosen);
          }}
        />
        <p className="text-base font-semibold text-[var(--text)]">Drop a receipt here or click to choose one</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Supported: JPG, PNG, WEBP, GIF, PDF · max 15 MB · Phase 31 now adds draft parsing and review before save.
        </p>
        {file ? <p className="mt-4 text-sm font-medium text-[var(--accent-dark)]">Selected: {file.name}</p> : null}
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!file || uploading} onClick={() => file && void uploadFile(file)} className="inline-flex rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{uploading ? "Uploading..." : "Upload receipt"}</button>
        <button type="button" disabled={!result || ocrRunning || uploading} onClick={() => void runOcr()} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60">{ocrRunning ? "Running OCR..." : "Run OCR"}</button>
        <button type="button" disabled={!ocrResult || drafting} onClick={() => void buildDraft()} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60">{drafting ? "Building draft..." : "Build draft"}</button>
        <button type="button" disabled={!draft || saving} onClick={() => void saveDraft()} className="inline-flex rounded-[10px] border border-[var(--accent)] bg-[rgba(255,241,191,0.7)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save reviewed receipt"}</button>
        {file ? <button type="button" disabled={uploading || ocrRunning || drafting || saving} onClick={() => { setFile(null); setError(""); setResult(null); setOcrResult(null); setDraft(null); setSavedReceiptId(null); }} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">Clear</button> : null}
      </div>

      {error ? <div className="rounded-[16px] border border-[rgba(190,24,24,0.15)] bg-[rgba(254,242,242,0.9)] p-4 text-sm text-[rgb(127,29,29)]">{error}</div> : null}
      {savedReceiptId ? <div className="rounded-[16px] border border-[rgba(22,101,52,0.15)] bg-[rgba(240,253,244,0.9)] p-4 text-sm text-[rgb(21,128,61)]">Receipt saved successfully. Receipt ID: {savedReceiptId}</div> : null}

      {result ? <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]"><p className="font-semibold text-[var(--text)]">Upload completed</p><p className="mt-2">Original name: {result.originalName}</p><p>Stored name: {result.storedName}</p><p>Stored path: {result.filePath}</p><p>Content type: {result.contentType}</p><p>Size: {Math.round(result.size / 1024)} KB</p></div> : null}

      {ocrResult ? <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]"><p className="font-semibold text-[var(--text)]">OCR completed</p><p className="mt-2">Method: {ocrResult.method}</p><p>Characters: {ocrResult.characterCount}</p><p>Lines: {ocrResult.lineCount}</p><textarea readOnly value={ocrResult.rawText} className="mt-3 min-h-[220px] w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 font-mono text-xs leading-6 text-[var(--text)]" /></div> : null}

      {draft ? (
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)] space-y-4">
          <div>
            <p className="font-semibold text-[var(--text)]">Structured draft review</p>
            <p className="mt-1">Overall confidence: {Math.round(draft.overallConfidence * 100)}%</p>
            {draft.warnings.length ? <p>Warnings: {draft.warnings.join(", ")}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input value={draft.storeName ?? ""} onChange={(e) => updateDraftField("storeName", e.target.value || null)} placeholder="Store name" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
            <input value={draft.receiptDate ?? ""} onChange={(e) => updateDraftField("receiptDate", e.target.value || null)} placeholder="YYYY-MM-DD" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
            <input value={draft.total ?? ""} onChange={(e) => updateDraftField("total", e.target.value || null)} placeholder="Total" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
            <input value={draft.subtotal ?? ""} onChange={(e) => updateDraftField("subtotal", e.target.value || null)} placeholder="Subtotal" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
            <input value={draft.tax ?? ""} onChange={(e) => updateDraftField("tax", e.target.value || null)} placeholder="Tax" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
            <input value={draft.currency} onChange={(e) => updateDraftField("currency", e.target.value)} placeholder="Currency" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-[var(--text)]">Draft items</p>
            {draft.items.map((item, index) => (
              <div key={`${item.lineNumber}-${index}`} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
                <input value={item.description} onChange={(e) => updateDraftItem(index, "description", e.target.value)} className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
                <div className="grid gap-2 md:grid-cols-3">
                  <input value={item.quantity ?? ""} onChange={(e) => updateDraftItem(index, "quantity", e.target.value ? Number(e.target.value) : null)} placeholder="Qty" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
                  <input value={item.unitPrice ?? ""} onChange={(e) => updateDraftItem(index, "unitPrice", e.target.value || null)} placeholder="Unit price" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
                  <input value={item.lineTotal ?? ""} onChange={(e) => updateDraftItem(index, "lineTotal", e.target.value || null)} placeholder="Line total" className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
                </div>
                <p className="text-xs text-[var(--muted)]">Warnings: {item.parseMeta.warnings.join(", ") || "none"} · Raw line: {item.parseMeta.rawLine}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
