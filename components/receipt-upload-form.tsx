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

export function ReceiptUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  async function uploadFile(target: File) {
    setUploading(true);
    setError("");
    setResult(null);
    setOcrResult(null);

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
    if (!result) {
      return;
    }

    setOcrRunning(true);
    setError("");
    setOcrResult(null);

    try {
      const response = await fetch("/api/receipt-media/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: result.filePath, contentType: result.contentType }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; ocr?: OcrResult };

      if (!response.ok || !data.ok || !data.ocr) {
        throw new Error(data.error || "OCR failed");
      }

      setOcrResult(data.ocr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setOcrRunning(false);
    }
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
          Supported: JPG, PNG, WEBP, GIF, PDF · max 15 MB · Phase 30 now adds explicit OCR after upload.
        </p>
        {file ? <p className="mt-4 text-sm font-medium text-[var(--accent-dark)]">Selected: {file.name}</p> : null}
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!file || uploading}
          onClick={() => file && void uploadFile(file)}
          className="inline-flex rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload receipt"}
        </button>
        <button
          type="button"
          disabled={!result || ocrRunning || uploading}
          onClick={() => void runOcr()}
          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ocrRunning ? "Running OCR..." : "Run OCR"}
        </button>
        {file ? (
          <button
            type="button"
            disabled={uploading || ocrRunning}
            onClick={() => {
              setFile(null);
              setError("");
              setResult(null);
              setOcrResult(null);
            }}
            className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
          >
            Clear
          </button>
        ) : null}
      </div>

      {error ? <div className="rounded-[16px] border border-[rgba(190,24,24,0.15)] bg-[rgba(254,242,242,0.9)] p-4 text-sm text-[rgb(127,29,29)]">{error}</div> : null}

      {result ? (
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--text)]">Upload completed</p>
          <p className="mt-2">Original name: {result.originalName}</p>
          <p>Stored name: {result.storedName}</p>
          <p>Stored path: {result.filePath}</p>
          <p>Content type: {result.contentType}</p>
          <p>Size: {Math.round(result.size / 1024)} KB</p>
        </div>
      ) : null}

      {ocrResult ? (
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--text)]">OCR completed</p>
          <p className="mt-2">Method: {ocrResult.method}</p>
          <p>Characters: {ocrResult.characterCount}</p>
          <p>Lines: {ocrResult.lineCount}</p>
          <textarea
            readOnly
            value={ocrResult.rawText}
            className="mt-3 min-h-[260px] w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 font-mono text-xs leading-6 text-[var(--text)]"
          />
        </div>
      ) : null}
    </div>
  );
}
