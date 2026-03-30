import { z } from "zod";

const receiptItemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().nullable().optional(),
  unitPrice: z.string().nullable().optional(),
  lineTotal: z.string().nullable().optional(),
  upc: z.string().trim().optional(),
  itemFlag: z.string().trim().optional(),
});

export const openAiReceiptDraftSchema = z.object({
  storeName: z.string().trim().nullable().optional(),
  receiptDate: z.string().trim().nullable().optional(),
  total: z.string().trim().nullable().optional(),
  subtotal: z.string().trim().nullable().optional(),
  tax: z.string().trim().nullable().optional(),
  currency: z.string().trim().min(1).default("USD"),
  warnings: z.array(z.string().trim()).default([]),
  qualityFlags: z.array(z.string().trim()).default([]),
  overallConfidence: z.number().min(0).max(1).default(0.75),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
  items: z.array(receiptItemSchema).default([]),
});

export type OpenAiReceiptDraft = z.infer<typeof openAiReceiptDraftSchema>;

function buildPrompt(rawText: string) {
  return [
    "You extract structured receipt data.",
    "Return JSON only.",
    "Do not include markdown fences.",
    "Do not invent items not present in the receipt text.",
    "Ignore header/footer/control/payment lines unless they are needed for totals/date/store extraction.",
    "For item names, exclude UPC codes and trailing tax/category flags like F or H from the visible description.",
    "If a field is unknown, use null.",
    "Receipt OCR text:",
    rawText,
  ].join("\n\n");
}

export async function extractReceiptDraftWithOpenAi(rawText: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_RECEIPT_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a receipt extraction engine. Output valid JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(rawText),
        },
      ],
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no receipt content");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  return openAiReceiptDraftSchema.parse(parsedJson);
}
