import { NextResponse } from "next/server";
import { z } from "zod";
import { extractReceiptText } from "@/lib/ocr-provider";

const ocrSchema = z.object({
  filePath: z.string().trim().min(1),
  contentType: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = ocrSchema.parse(body);
    const ocr = await extractReceiptText(payload);
    return NextResponse.json({ ok: true, ocr });
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
