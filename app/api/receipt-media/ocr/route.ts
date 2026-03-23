import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
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

async function extractPdfText(filePath: string) {
  const { stdout } = await execFileAsync("pdftotext", [filePath, "-"]);
  return stdout.trim();
}

async function extractImageText(filePath: string) {
  const { stdout } = await execFileAsync("tesseract", [filePath, "stdout", "-l", "eng"]);
  return stdout.trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = ocrSchema.parse(body);
    const filePath = ensureInsideUploads(payload.filePath);
    await fs.access(filePath);

    const extension = path.extname(filePath).toLowerCase();
    const isPdf = payload.contentType === "application/pdf" || extension === ".pdf";

    let rawText = "";
    let method = "";

    if (isPdf) {
      rawText = await extractPdfText(filePath);
      method = "pdftotext";
    } else {
      rawText = await extractImageText(filePath);
      method = "tesseract";
    }

    return NextResponse.json({
      ok: true,
      ocr: {
        filePath,
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
  }
}
