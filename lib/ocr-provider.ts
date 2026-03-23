import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { get as getBlob } from "@vercel/blob";

const execFileAsync = promisify(execFile);

export type OcrResult = {
  filePath: string;
  method: string;
  rawText: string;
  characterCount: number;
  lineCount: number;
};

function ensureInsideUploads(filePath: string) {
  const uploadsRoot = path.resolve(path.join(process.cwd(), "uploads", "receipt-media"));
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
    throw new Error("File path is outside the allowed uploads directory");
  }

  return resolved;
}

function isRemoteUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function downloadPrivateBlobToTemp(fileUrl: string, contentType?: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to read private Blob files for OCR");
  }

  const response = await getBlob(fileUrl, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!response) {
    throw new Error("Blob file not found for OCR");
  }

  const derivedType = contentType || response.blob.contentType || "application/octet-stream";
  const extension = derivedType.includes("pdf") ? ".pdf" : ".png";
  const tempPath = path.join(os.tmpdir(), `receipt-ocr-${randomUUID()}${extension}`);
  const arrayBuffer = await new Response(response.stream).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(tempPath, buffer);

  return {
    localPath: tempPath,
    contentType: derivedType,
    cleanup: async () => {
      await fs.rm(tempPath, { force: true });
    },
  };
}

async function extractPdfText(filePath: string) {
  const { stdout } = await execFileAsync("pdftotext", [filePath, "-"]);
  return stdout.trim();
}

async function extractImageText(filePath: string) {
  const { stdout } = await execFileAsync("tesseract", [filePath, "stdout", "-l", "eng"]);
  return stdout.trim();
}

async function runLocalOcr(args: { filePath: string; contentType?: string }): Promise<OcrResult> {
  let cleanup: (() => Promise<void>) | null = null;
  try {
    let localPath = args.filePath;
    let contentType = args.contentType;

    if (isRemoteUrl(args.filePath)) {
      const downloaded = await downloadPrivateBlobToTemp(args.filePath, args.contentType);
      localPath = downloaded.localPath;
      contentType = downloaded.contentType;
      cleanup = downloaded.cleanup;
    } else {
      localPath = ensureInsideUploads(args.filePath);
      await fs.access(localPath);
    }

    const extension = path.extname(localPath).toLowerCase();
    const isPdf = contentType === "application/pdf" || extension === ".pdf";
    const rawText = isPdf ? await extractPdfText(localPath) : await extractImageText(localPath);
    const method = isPdf ? "pdftotext" : "tesseract";

    return {
      filePath: args.filePath,
      method,
      rawText,
      characterCount: rawText.length,
      lineCount: rawText ? rawText.split(/\r?\n/).filter(Boolean).length : 0,
    };
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}

async function runWorkerOcr(args: { filePath: string; contentType?: string }): Promise<OcrResult> {
  const workerUrl = process.env.OCR_WORKER_URL;
  const workerToken = process.env.OCR_WORKER_TOKEN;

  if (!workerUrl) {
    throw new Error("OCR_WORKER_URL is required when OCR_PROVIDER=worker");
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(workerToken ? { Authorization: `Bearer ${workerToken}` } : {}),
    },
    body: JSON.stringify({ fileUrl: args.filePath, contentType: args.contentType }),
  });

  const data = (await response.json()) as { ok?: boolean; error?: string; ocr?: OcrResult };
  if (!response.ok || !data.ok || !data.ocr) {
    throw new Error(data.error || `Worker OCR failed: ${response.status} ${response.statusText}`);
  }

  return data.ocr;
}

export async function extractReceiptText(args: { filePath: string; contentType?: string }): Promise<OcrResult> {
  const provider = process.env.OCR_PROVIDER || (process.env.VERCEL ? "worker" : "local");

  if (provider === "worker") {
    return runWorkerOcr(args);
  }

  return runLocalOcr(args);
}
