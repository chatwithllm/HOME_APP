import "dotenv/config";

import fs from "fs/promises";
import os from "os";
import path from "path";
import { createServer } from "http";
import { randomUUID, timingSafeEqual } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DEFAULT_PORT = Number(process.env.OCR_WORKER_PORT || process.env.PORT || 4318);
const AUTH_TOKEN = process.env.OCR_WORKER_TOKEN;
const MAX_BODY_BYTES = Number(process.env.OCR_WORKER_MAX_BODY_BYTES || 1024 * 1024);

function sendJson(response: import("http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function unauthorized(response: import("http").ServerResponse) {
  sendJson(response, 401, { ok: false, error: "Unauthorized" });
}

function parseBearerToken(headerValue: string | undefined) {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function tokenMatches(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function detectExtension(contentType?: string) {
  const value = (contentType || "").toLowerCase();

  if (value.includes("pdf")) return ".pdf";
  if (value.includes("jpeg") || value.includes("jpg")) return ".jpg";
  if (value.includes("webp")) return ".webp";
  if (value.includes("gif")) return ".gif";
  if (value.includes("tiff") || value.includes("tif")) return ".tif";
  return ".png";
}

async function downloadToTemp(fileUrl: string, contentType?: string) {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch OCR file: ${response.status} ${response.statusText}`);
  }

  const resolvedContentType = contentType || response.headers.get("content-type") || "application/octet-stream";
  const extension = detectExtension(resolvedContentType);
  const tempPath = path.join(os.tmpdir(), `homeapp-ocr-worker-${randomUUID()}${extension}`);
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(tempPath, Buffer.from(arrayBuffer));

  return {
    tempPath,
    contentType: resolvedContentType,
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

async function runOcr(input: { fileUrl: string; contentType?: string }) {
  const download = await downloadToTemp(input.fileUrl, input.contentType);

  try {
    const extension = path.extname(download.tempPath).toLowerCase();
    const isPdf = download.contentType === "application/pdf" || extension === ".pdf";
    const rawText = isPdf ? await extractPdfText(download.tempPath) : await extractImageText(download.tempPath);
    const method = isPdf ? "pdftotext" : "tesseract";

    return {
      ok: true,
      ocr: {
        filePath: input.fileUrl,
        method,
        rawText,
        characterCount: rawText.length,
        lineCount: rawText ? rawText.split(/\r?\n/).filter(Boolean).length : 0,
      },
    };
  } finally {
    await download.cleanup();
  }
}

async function readJsonBody(request: import("http").IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;

    if (total > MAX_BODY_BYTES) {
      throw new Error("Request body too large");
    }

    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Request body is required");
  }

  return JSON.parse(raw) as { fileUrl?: string; contentType?: string };
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, 200, { ok: true, service: "homeapp-ocr-worker" });
    }

    if (request.method !== "POST" || request.url !== "/ocr") {
      return sendJson(response, 404, { ok: false, error: "Not found" });
    }

    if (!AUTH_TOKEN) {
      return sendJson(response, 500, { ok: false, error: "OCR_WORKER_TOKEN is not configured on the worker" });
    }

    const providedToken = parseBearerToken(request.headers.authorization);
    if (!providedToken || !tokenMatches(AUTH_TOKEN, providedToken)) {
      return unauthorized(response);
    }

    const body = await readJsonBody(request);
    if (!body.fileUrl || typeof body.fileUrl !== "string") {
      return sendJson(response, 400, { ok: false, error: "fileUrl is required" });
    }

    const result = await runOcr({
      fileUrl: body.fileUrl,
      contentType: typeof body.contentType === "string" ? body.contentType : undefined,
    });

    return sendJson(response, 200, result);
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Worker OCR failed",
    });
  }
});

server.listen(DEFAULT_PORT, () => {
  console.log(`homeapp-ocr-worker listening on http://127.0.0.1:${DEFAULT_PORT}`);
});
