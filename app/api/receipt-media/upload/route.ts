import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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

    const dir = uploadsDir();
    await fs.mkdir(dir, { recursive: true });

    const extension = ALLOWED_TYPES.get(file.type) || path.extname(file.name) || ".bin";
    const safeBaseName = path
      .basename(file.name, path.extname(file.name))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "receipt";
    const filename = `${new Date().toISOString().slice(0, 10)}-${safeBaseName}-${randomUUID()}${extension}`;
    const filePath = path.join(dir, filename);
    const bytes = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, bytes);

    return NextResponse.json({
      ok: true,
      media: {
        originalName: file.name,
        storedName: filename,
        filePath,
        contentType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
