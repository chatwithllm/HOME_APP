import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { get as getBlob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const ocrSchema = z.object({
  filePath: z.string().trim().min(1),
  contentType: z.string().trim().optional(),
});

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

async function downloadRemoteFile(fileUrl: string, contentType?: string) {
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

export async function POST(request: Request) {
  let cleanup: (() => Promise<void>) | null = null;

  try {
    const body = (await request.json()) as unknown;
    const payload = ocrSchema.parse(body);

    let localPath = payload.filePath;
    let contentType = payload.contentType;

    if (isRemoteUrl(payload.filePath)) {
      const downloaded = await downloadRemoteFile(payload.filePath, payload.contentType);
      localPath = downloaded.localPath;
      contentType = downloaded.contentType;
      cleanup = downloaded.cleanup;
    } else {
      localPath = ensureInsideUploads(payload.filePath);
      await fs.access(localPath);
    }

    const extension = path.extname(localPath).toLowerCase();
    const isPdf = contentType === "application/pdf" || extension === ".pdf";

    let rawText = "";
    let method = "";

    if (isPdf) {
      rawText = await extractPdfText(localPath);
      method = "pdftotext";
    } else {
      rawText = await extractImageText(localPath);
      method = "tesseract";
    }

    return NextResponse.json({
      ok: true,
      ocr: {
        filePath: payload.filePath,
        method,
        rawText,
        characterCount: rawText.length,
        lineCount: rawText ? rawText.split(/\r?\n/).filter(Boolean).length : 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid OCR payload", issues: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "OCR failed" },
      { status: 500 },
    );
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}
