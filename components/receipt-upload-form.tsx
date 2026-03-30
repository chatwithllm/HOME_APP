"use client";

import Link from "next/link";
import { useState } from "react";
import { createInitialProcessingSteps, setStepState, type UploadProcessingStep, type UploadStepStatus } from "@/lib/receipt-processing-state";
import { getOpenAiFallbackOffer, selectPrimaryProvider, type ReceiptProcessingProvider } from "@/lib/receipt-provider-selection";

type UploadResult = {
  originalName: string;
  storedName: string;
  filePath: string;
  contentType: string;
  size: number;
  storage?: "local" | "blob";
};

type OcrResult = {
  filePath: string;
  method: string;
  rawText: string;
  characterCount: number;
  lineCount: number;
};

type ProcessingSource = ReceiptProcessingProvider;

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
  const [processingSource, setProcessingSource] = useState<ProcessingSource>("local");
  const [processingSteps, setProcessingSteps] = useState<Record<UploadProcessingStep, UploadStepStatus>>(createInitialProcessingSteps());
  const [openAiConsentRequested, setOpenAiConsentRequested] = useState(false);
  const [openAiConsentApproved, setOpenAiConsentApproved] = useState(false);
  const [openAiFallbackReason, setOpenAiFallbackReason] = useState<string | null>(null);

  async function uploadFile(target: File) {
    setUploading(true);
    setError("");
    setResult(null);
    setOcrResult(null);
    setDraft(null);
    setSavedReceiptId(null);
    setProcessingSteps((current) => ({
      ...createInitialProcessingSteps(),
      upload: { ...current.upload, step: "upload", state: "running", message: `Uploading ${target.name}` },
    }));

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

      const media = data.media;
      setResult(media);
      setProcessingSource(selectPrimaryProvider({
        storage: media.storage,
        configuredProvider: typeof window !== "undefined" ? window.localStorage.getItem("receipt-processing-provider") : null,
      }));
      setOpenAiConsentRequested(false);
      setOpenAiConsentApproved(false);
      setOpenAiFallbackReason(null);
      setProcessingSteps((current) => setStepState(current, "upload", "success", `Stored via ${media.storage || "local"}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setProcessingSteps((current) => setStepState(current, "upload", "failed", message));
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
    setProcessingSteps((current) => setStepState(current, "ocr", "running", `Running ${processingSource} OCR`));

    try {
      if (processingSource === "openai" && !openAiConsentApproved) {
        throw new Error("OpenAI fallback requires explicit approval before processing.");
      }

      const response = await fetch("/api/receipt-media/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: result.filePath, contentType: result.contentType }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; ocr?: OcrResult };
      if (!response.ok || !data.ok || !data.ocr) throw new Error(data.error || "OCR failed");
      const ocr = data.ocr;
      setOcrResult(ocr);
      const ocrMessage = ocr.rawText.trim()
        ? `${ocr.method} completed`
        : `${ocr.method} returned no readable text`;
      setProcessingSteps((current) => setStepState(current, "ocr", ocr.rawText.trim() ? "success" : "failed", ocrMessage));
      if (!ocr.rawText.trim()) {
        setError("OCR completed but returned no readable text from this file. Try a different PDF, rerun OCR, or approve OpenAI fallback when available.");

        const fallback = getOpenAiFallbackOffer({
          failedProvider: processingSource,
          failedMessage: "OCR returned no readable text.",
          openAiEnabled: true,
        });

        if (fallback.available && processingSource !== "openai") {
          setOpenAiConsentRequested(true);
          setOpenAiFallbackReason(fallback.reason);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "OCR failed";
      setError(message);
      setProcessingSteps((current) => setStepState(current, "ocr", "failed", message));

      const fallback = getOpenAiFallbackOffer({
        failedProvider: processingSource,
        failedMessage: message,
        openAiEnabled: true,
      });

      if (fallback.available && processingSource !== "openai") {
        setOpenAiConsentRequested(true);
        setOpenAiFallbackReason(fallback.reason);
      }
    } finally {
      setOcrRunning(false);
    }
  }

  async function buildDraft() {
    if (!ocrResult?.rawText?.trim()) {
      const message = "No OCR text is available to build a draft. Run OCR first, or retry OCR if the PDF returned empty text.";
      setError(message);
      setProcessingSteps((current) => setStepState(current, "draft", "failed", message));
      return;
    }

    setDrafting(true);
    setError("");
    setDraft(null);
    setSavedReceiptId(null);
    setProcessingSteps((current) => setStepState(current, "draft", "running", processingSource === "openai" ? "Building OpenAI receipt draft" : "Building structured draft"));

    try {
      const useOpenAiVision = processingSource === "openai" && !!result && (result.contentType === "application/pdf" || result.contentType.startsWith("image/"));
      const endpoint = processingSource === "openai"
        ? useOpenAiVision
          ? "/api/receipt-media/openai-vision-draft"
          : "/api/receipt-media/openai-draft"
        : "/api/receipt-media/draft";
      const payload = processingSource === "openai"
        ? useOpenAiVision
          ? { fileUrl: result.filePath, contentType: result.contentType, consentApproved: openAiConsentApproved }
          : { rawText: ocrResult.rawText, consentApproved: openAiConsentApproved }
        : { rawText: ocrResult.rawText };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; draft?: DraftResult };
      if (!response.ok || !data.ok || !data.draft) throw new Error(data.error || "Draft build failed");
      const builtDraft = data.draft;
      setDraft(builtDraft);
      setProcessingSteps((current) => setStepState(current, "draft", "success", `${builtDraft.items.length} items parsed via ${processingSource}${processingSource === "openai" ? " vision/text fallback" : ""}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Draft build failed";
      setError(message);
      setProcessingSteps((current) => setStepState(current, "draft", "failed", message));
    } finally {
      setDrafting(false);
    }
  }

  async function saveDraft() {
    if (!draft || !result || !ocrResult) return;
    setSaving(true);
    setError("");
    setSavedReceiptId(null);
    setProcessingSteps((current) => setStepState(current, "save", "running", "Saving reviewed receipt"));

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
          parser: { source: processingSource === "worker" ? "worker-ocr" : processingSource === "openai" ? "openai" : "local-ocr", name: ocrResult.method, version: "phase-34" },
          processingSource,
          processingStatus: "saved",
          uploadStorage: result.storage || "local",
          uploadContentType: result.contentType,
          uploadOriginalName: result.originalName,
          ocrMethod: ocrResult.method,
          structuredJson: processingSource === "openai"
            ? {
                consent: {
                  openAiApproved: openAiConsentApproved,
                  fallbackReason: openAiFallbackReason,
                },
                modelProcessing: {
                  provider: "openai",
                  mode: result.contentType === "application/pdf" || result.contentType.startsWith("image/") ? "vision" : "text",
                },
              }
            : undefined,
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
      setProcessingSteps((current) => setStepState(current, "save", "success", `Saved as receipt #${data.receipt_id}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      setProcessingSteps((current) => setStepState(current, "save", "failed", message));
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
        {file ? <button type="button" disabled={uploading || ocrRunning || drafting || saving} onClick={() => { setFile(null); setError(""); setResult(null); setOcrResult(null); setDraft(null); setSavedReceiptId(null); setProcessingSource("local"); setProcessingSteps(createInitialProcessingSteps()); setOpenAiConsentRequested(false); setOpenAiConsentApproved(false); setOpenAiFallbackReason(null); }} className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">Clear</button> : null}
      </div>

      {error ? <div className="rounded-[16px] border border-[rgba(190,24,24,0.15)] bg-[rgba(254,242,242,0.9)] p-4 text-sm text-[rgb(127,29,29)]">{error}</div> : null}

      {openAiConsentRequested ? (
        <div className="rounded-[16px] border border-[rgba(180,83,9,0.15)] bg-[rgba(255,251,235,0.95)] p-4 text-sm text-[rgb(146,64,14)]">
          <p className="font-semibold text-[rgb(120,53,15)]">OpenAI fallback available</p>
          <p className="mt-2 leading-6">
            Primary receipt processing ({processingSource}) failed or is unavailable. If you approve OpenAI fallback, receipt data may be sent to OpenAI for processing.
          </p>
          {openAiFallbackReason ? <p className="mt-2 text-xs leading-5 text-[rgb(146,64,14)]">Reason: {openAiFallbackReason}</p> : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenAiConsentApproved(true);
                setOpenAiConsentRequested(false);
                setProcessingSource("openai");
                setError("");
                setProcessingSteps((current) => setStepState(current, "ocr", "idle", "OpenAI fallback approved; rerun OCR to continue."));
              }}
              className="inline-flex rounded-[10px] border border-[rgb(180,83,9)] bg-[rgb(180,83,9)] px-4 py-2 text-sm font-semibold text-white"
            >
              Approve OpenAI fallback
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenAiConsentRequested(false);
                setOpenAiConsentApproved(false);
                setOpenAiFallbackReason(null);
              }}
              className="inline-flex rounded-[10px] border border-[rgba(180,83,9,0.25)] bg-white px-4 py-2 text-sm font-semibold text-[rgb(146,64,14)]"
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}
      {savedReceiptId ? (
        <div className="rounded-[16px] border border-[rgba(22,101,52,0.15)] bg-[rgba(240,253,244,0.9)] p-4 text-sm text-[rgb(21,128,61)]">
          <p className="font-semibold">Receipt saved successfully. Receipt ID: {savedReceiptId}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {savedReceiptId ? (
              <Link href={`/service-dashboard/receipts/${savedReceiptId}` as const} className="inline-flex rounded-[10px] border border-[rgba(22,101,52,0.2)] bg-white px-3 py-2 text-sm font-semibold text-[rgb(21,128,61)]">
                Open receipt detail
              </Link>
            ) : null}
            <Link href="/service-dashboard/receipts" className="inline-flex rounded-[10px] border border-[rgba(22,101,52,0.2)] bg-white px-3 py-2 text-sm font-semibold text-[rgb(21,128,61)]">
              Go to receipts dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError("");
                setResult(null);
                setOcrResult(null);
                setDraft(null);
                setSavedReceiptId(null);
                setProcessingSource("local");
                setProcessingSteps(createInitialProcessingSteps());
                setOpenAiConsentRequested(false);
                setOpenAiConsentApproved(false);
                setOpenAiFallbackReason(null);
              }}
              className="inline-flex rounded-[10px] border border-[rgba(22,101,52,0.2)] bg-white px-3 py-2 text-sm font-semibold text-[rgb(21,128,61)]"
            >
              Upload another receipt
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
        <p className="font-semibold text-[var(--text)]">Processing status</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(processingSteps).map((step) => (
            <div key={step.step} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{step.step}</p>
              <p className="mt-2 font-semibold text-[var(--text)]">{step.state}</p>
              {step.message ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{step.message}</p> : null}
            </div>
          ))}
        </div>
      </div>

      {result ? <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]"><p className="font-semibold text-[var(--text)]">Upload completed</p><p className="mt-2">Original name: {result.originalName}</p><p>Stored name: {result.storedName}</p><p>Stored path: {result.filePath}</p><p>Storage: {result.storage || "local"}</p><p>Processing source selected: {processingSource}</p><p>Content type: {result.contentType}</p><p>Size: {Math.round(result.size / 1024)} KB</p></div> : null}

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
