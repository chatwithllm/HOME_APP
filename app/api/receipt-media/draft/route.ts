import { NextResponse } from "next/server";
import { z } from "zod";
import { buildReceiptDraft } from "@/lib/receipt-draft";

const draftSchema = z.object({
  rawText: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = draftSchema.parse(body);
    const draft = buildReceiptDraft(payload.rawText);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid draft payload", issues: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Draft build failed" },
      { status: 500 },
    );
  }
}
