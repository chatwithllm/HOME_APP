type DraftItem = {
  lineNumber: number;
  description: string;
  quantity: number | null;
  unitPrice: string | null;
  lineTotal: string | null;
  parseMeta: {
    confidence: Record<string, number>;
    warnings: string[];
    rawLine: string;
    inferredFields: string[];
  };
};

export type ReceiptDraft = {
  storeName: string | null;
  receiptDate: string | null;
  total: string | null;
  subtotal: string | null;
  tax: string | null;
  currency: string;
  rawText: string;
  warnings: string[];
  qualityFlags: string[];
  overallConfidence: number;
  confidence: Record<string, number>;
  items: DraftItem[];
};

function normalizeMoney(raw: string) {
  const value = raw.replace(/[^0-9.]/g, "");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

function detectStoreName(lines: string[]) {
  const firstMeaningful = lines.find((line) => /[A-Za-z]/.test(line));
  return firstMeaningful ? firstMeaningful.slice(0, 80) : null;
}

function detectDate(rawText: string) {
  const match = rawText.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
  if (!match) return null;

  const candidate = match[1].replace(/-/g, "/");
  const parts = candidate.split("/");
  if (parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const [month, day, year] = parts;
  const normalizedYear = year.length === 2 ? `20${year}` : year.padStart(4, "0");
  return `${normalizedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function detectTotals(lines: string[]) {
  let total: string | null = null;
  let subtotal: string | null = null;
  let tax: string | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    const amountMatch = line.match(/(-?\$?\d+[\d,]*\.\d{2})\s*$/);
    if (!amountMatch) continue;
    const amount = normalizeMoney(amountMatch[1]);
    if (!amount) continue;

    if (!total && /\bTOTAL\b/.test(upper)) {
      total = amount;
      continue;
    }
    if (!subtotal && /\bSUBTOTAL\b/.test(upper)) {
      subtotal = amount;
      continue;
    }
    if (!tax && /\bTAX\b/.test(upper)) {
      tax = amount;
    }
  }

  return { total, subtotal, tax };
}

function draftItems(lines: string[]) {
  const reserved = /(TOTAL|SUBTOTAL|TAX|CHANGE|CASH|VISA|MASTERCARD|DEBIT|CREDIT|THANK|BALANCE)/i;

  return lines
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => !reserved.test(line) && /\d/.test(line))
    .map(({ line, index }) => {
      const amountMatch = line.match(/(-?\$?\d+[\d,]*\.\d{2})\s*$/);
      const amount = amountMatch ? normalizeMoney(amountMatch[1]) : null;
      const description = line
        .replace(/(-?\$?\d+[\d,]*\.\d{2})\s*$/, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      return {
        lineNumber: index,
        description: description || `Line ${index}`,
        quantity: null,
        unitPrice: null,
        lineTotal: amount,
        parseMeta: {
          confidence: {
            description: description ? 0.82 : 0.35,
            quantity: 0.2,
            lineTotal: amount ? 0.88 : 0.3,
          },
          warnings: [
            ...(description ? [] : ["weak_description"]),
            ...(amount ? ["quantity_missing"] : ["amount_missing"]),
          ],
          rawLine: line,
          inferredFields: ["quantity"],
        },
      };
    })
    .filter((item) => item.description || item.lineTotal)
    .slice(0, 40);
}

export function buildReceiptDraft(rawText: string): ReceiptDraft {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const storeName = detectStoreName(lines);
  const receiptDate = detectDate(rawText);
  const { total, subtotal, tax } = detectTotals(lines);
  const items = draftItems(lines);

  const warnings = [
    ...(storeName ? [] : ["missing_store_name"]),
    ...(receiptDate ? [] : ["missing_receipt_date"]),
    ...(total ? [] : ["missing_total"]),
    ...(items.length ? [] : ["missing_items"]),
  ];

  const confidence = {
    storeName: storeName ? 0.82 : 0.25,
    receiptDate: receiptDate ? 0.72 : 0.2,
    total: total ? 0.86 : 0.25,
    items: items.length ? 0.7 : 0.2,
  };

  const overallConfidence = Object.values(confidence).reduce((sum, value) => sum + value, 0) / Object.values(confidence).length;

  return {
    storeName,
    receiptDate,
    total,
    subtotal,
    tax,
    currency: "USD",
    rawText,
    warnings,
    qualityFlags: warnings.length ? ["review_required"] : [],
    overallConfidence: Number(overallConfidence.toFixed(2)),
    confidence,
    items,
  };
}
