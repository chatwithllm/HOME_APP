import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["application/pdf", ".pdf"],
]);

function uploadsDir() {
  return path.join(process.cwd(), "uploads", "receipt-media");
}

function buildStoredName(originalName: string, contentType: string) {
  const extension = ALLOWED_TYPES.get(contentType) || path.extname(originalName) || ".bin";
  const safeBaseName = path
    .basename(originalName, path.extname(originalName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "receipt";

  return `${new Date().toISOString().slice(0, 10)}-${safeBaseName}-${randomUUID()}${extension}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Use JPG, PNG, WEBP, GIF, or PDF." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File size must be between 1 byte and 15 MB." },
        { status: 400 },
      );
    }

    const storedName = buildStoredName(file.name, file.type);
    const bytes = Buffer.from(await file.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`receipt-media/${storedName}`, bytes, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type,
        addRandomSuffix: false,
      });

      return NextResponse.json({
        ok: true,
        media: {
          originalName: file.name,
          storedName,
          filePath: blob.url,
          contentType: file.type,
          size: file.size,
          storage: "blob",
        },
      });
    }

    const dir = uploadsDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, storedName);
    await fs.writeFile(filePath, bytes);

    return NextResponse.json({
      ok: true,
      media: {
        originalName: file.name,
        storedName,
        filePath,
        contentType: file.type,
        size: file.size,
        storage: "local",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
