import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDb } from "@/db/client";
import { receipts } from "@/db/schema";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const resolvedParams = await params;
    const receiptId = Number(resolvedParams.id);

    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid receipt id" }, { status: 400 });
    }

    const connection = createDb();
    pool = connection.pool;

    const receipt = await connection.db.query.receipts.findFirst({
      columns: { imagePath: true },
      where: eq(receipts.id, receiptId),
    });

    if (!receipt?.imagePath) {
      return NextResponse.json({ ok: false, error: "No media attached" }, { status: 404 });
    }

    const resolvedPath = path.resolve(receipt.imagePath);
    const fileBuffer = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load receipt media",
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
