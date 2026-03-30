import { NextResponse } from "next/server";
import { z } from "zod";
import { extractReceiptDraftWithOpenAiVision } from "@/lib/openai-receipt";

const openAiVisionDraftSchema = z.object({
  fileUrl: z.string().trim().min(1),
  contentType: z.string().trim().optional(),
  consentApproved: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = openAiVisionDraftSchema.parse(body);
    const draft = await extractReceiptDraftWithOpenAiVision({
      fileUrl: payload.fileUrl,
      contentType: payload.contentType,
    });

    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid OpenAI vision draft payload", issues: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "OpenAI vision draft failed" },
      { status: 500 },
    );
  }
}
