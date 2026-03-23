"use client";

import { useState } from "react";

type UploadResult = {
  originalName: string;
  storedName: string;
  filePath: string;
  contentType: string;
  size: number;
};

export function ReceiptUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  async function uploadFile(target: File) {
    setUploading(true);
    setError("");
    setResult(null);

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
          Supported: JPG, PNG, WEBP, GIF, PDF · max 15 MB · this phase uploads and stores the file without OCR yet.
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
        {file ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              setFile(null);
              setError("");
              setResult(null);
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
          <p className="mt-3 text-[var(--accent-dark)]">Next phase will attach OCR extraction and review flow to this uploaded media.</p>
        </div>
      ) : null}
    </div>
  );
}
