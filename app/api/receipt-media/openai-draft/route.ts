import { NextResponse } from "next/server";
import { z } from "zod";
import { extractReceiptDraftWithOpenAi } from "@/lib/openai-receipt";

const openAiDraftSchema = z.object({
  rawText: z.string().trim().min(1),
  consentApproved: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = openAiDraftSchema.parse(body);
    const draft = await extractReceiptDraftWithOpenAi(payload.rawText);

    return NextResponse.json({
      ok: true,
      draft: {
        ...draft,
        rawText: payload.rawText,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid OpenAI draft payload", issues: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "OpenAI draft failed" },
      { status: 500 },
    );
  }
}
