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
    upc?: string;
    itemFlag?: string;
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
  const walmartLine = lines.find((line) => /WAL[\*\s-]*MART|WALMART/i.test(line));
  if (walmartLine) {
    return "Walmart";
  }

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

function parseWalmartItemLine(line: string) {
  const match = line.match(/^(.+?)\s+(\d{8,14})(?:\s+([A-Z]))?\s+(-?\$?\d+[\d,]*\.\d{2})$/);
  if (!match) {
    return null;
  }

  const description = match[1]?.replace(/\s{2,}/g, " ").trim();
  const upc = match[2]?.trim();
  const itemFlag = match[3]?.trim();
  const lineTotal = normalizeMoney(match[4]);

  if (!description || !lineTotal) {
    return null;
  }

  return {
    description,
    quantity: null,
    unitPrice: null,
    lineTotal,
    parseMeta: {
      confidence: {
        description: 0.96,
        quantity: 0.2,
        lineTotal: 0.95,
        upc: upc ? 0.98 : 0.25,
        itemFlag: itemFlag ? 0.92 : 0.25,
      },
      warnings: ["quantity_missing"],
      rawLine: line,
      inferredFields: ["quantity"],
      ...(upc ? { upc } : {}),
      ...(itemFlag ? { itemFlag } : {}),
    },
  } satisfies Omit<DraftItem, "lineNumber">;
}

function parseWalmartItems(lines: string[]) {
  const excluded = [
    /^RECEIPT\s+DETAILS$/i,
    /^WALMART\s*>$/i,
    /^SAVE MONEY\.\s*LIVE BETTER\.?$/i,
    /^WAL\*MART$/i,
    /^[A-Z]+,\s*[A-Z]{2}$/i,
    /\bSUBTOTAL\b/i,
    /\bTOTAL\b/i,
    /\bTAX\b/i,
    /\bCHANGE\b/i,
    /\bDEBIT\b/i,
    /\bMASTERCARD\b/i,
    /\bITEMS?\s+SOLD\b/i,
    /\bST#\b/i,
    /\bOP#\b/i,
    /\bTE#\b/i,
    /\bTR#\b/i,
    /\bTC#\b/i,
    /\bMGR\.?\b/i,
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/,
  ];

  const items: DraftItem[] = [];

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || excluded.some((pattern) => pattern.test(line))) {
      continue;
    }

    const parsed = parseWalmartItemLine(line);
    if (!parsed) {
      continue;
    }

    items.push({
      lineNumber: index + 1,
      ...parsed,
    });
  }

  return items;
}

function isLikelyNonItemLine(line: string) {
  const upper = line.toUpperCase();
  const reservedPatterns = [
    /\bTOTAL\b/,
    /\bSUBTOTAL\b/,
    /\bTAX\b/,
    /\bCHANGE\b/,
    /\bCASH\b/,
    /\bVISA\b/,
    /\bMASTERCARD\b/,
    /\bDEBIT\b/,
    /\bCREDIT\b/,
    /\bTHANK\b/,
    /\bBALANCE\b/,
    /\bITEMS?\s+SOLD\b/,
    /\bAPPROVED\b/,
    /\bAUTH\b/,
    /\bCARD\b/,
    /\bAID\b/,
    /\bTC#\b/,
    /\bST#\b/,
    /\bOP#\b/,
    /\bTE#\b/,
    /\bTR#\b/,
    /\bTERMINAL\b/,
    /\bCASHIER\b/,
    /\bMGR\.?\b/,
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/,
    /^\d{1,2}:\d{2}(:\d{2})?$/,
    /^RECEIPT\s+DETAILS$/,
    /^WALMART\s*>$/,
    /^SAVE MONEY\.\s*LIVE BETTER\.?$/,
  ];

  return reservedPatterns.some((pattern) => pattern.test(upper));
}

function cleanGenericItemDescription(line: string) {
  return line
    .replace(/(-?\$?\d+[\d,]*\.\d{2})\s*$/, "")
    .replace(/\b\d+\s*@\s*\d+[\d,]*\.\d{2}\b/gi, "")
    .replace(/\b[0-9]{6,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseGenericItems(lines: string[]) {
  const items: DraftItem[] = [];

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || isLikelyNonItemLine(line)) {
      continue;
    }

    const amountMatch = line.match(/(-?\$?\d+[\d,]*\.\d{2})\s*$/);
    const amount = amountMatch ? normalizeMoney(amountMatch[1]) : null;
    const qtyPriceMatch = line.match(/\b(\d+)\s*@\s*(\d+[\d,]*\.\d{2})\b/i);
    const quantity = qtyPriceMatch ? Number(qtyPriceMatch[1]) : null;
    const unitPrice = qtyPriceMatch ? normalizeMoney(qtyPriceMatch[2]) : null;
    const description = cleanGenericItemDescription(line);

    if (!description && !amount) {
      continue;
    }

    items.push({
      lineNumber: index + 1,
      description: description || `Line ${index + 1}`,
      quantity,
      unitPrice,
      lineTotal: amount,
      parseMeta: {
        confidence: {
          description: description ? 0.8 : 0.35,
          quantity: quantity != null ? 0.9 : 0.2,
          lineTotal: amount ? 0.85 : 0.3,
          unitPrice: unitPrice ? 0.85 : 0.25,
        },
        warnings: [
          ...(description ? [] : ["weak_description"]),
          ...(amount ? [] : ["amount_missing"]),
          ...(quantity != null ? [] : ["quantity_missing"]),
        ],
        rawLine: line,
        inferredFields: quantity != null ? [] : ["quantity"],
      },
    });
  }

  return items.slice(0, 40);
}

function buildItemDraft(lines: string[], storeName: string | null) {
  if (storeName === "Walmart") {
    const walmartItems = parseWalmartItems(lines);
    if (walmartItems.length) {
      return {
        items: walmartItems,
        parserName: "walmart-layout",
      };
    }
  }

  return {
    items: parseGenericItems(lines),
    parserName: "generic-layout",
  };
}

export function buildReceiptDraft(rawText: string): ReceiptDraft {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const storeName = detectStoreName(lines);
  const receiptDate = detectDate(rawText);
  const { total, subtotal, tax } = detectTotals(lines);
  const itemDraft = buildItemDraft(lines, storeName);
  const items = itemDraft.items;

  const warnings = [
    ...(storeName ? [] : ["missing_store_name"]),
    ...(receiptDate ? [] : ["missing_receipt_date"]),
    ...(total ? [] : ["missing_total"]),
    ...(items.length ? [] : ["missing_items"]),
  ];

  const qualityFlags = [
    ...(warnings.length ? ["review_required"] : []),
    ...(itemDraft.parserName === "generic-layout" ? ["generic_item_parser"] : []),
  ];

  const confidence = {
    storeName: storeName ? 0.9 : 0.25,
    receiptDate: receiptDate ? 0.78 : 0.2,
    total: total ? 0.9 : 0.25,
    items: items.length ? (itemDraft.parserName === "walmart-layout" ? 0.92 : 0.7) : 0.2,
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
    qualityFlags,
    overallConfidence: Number(overallConfidence.toFixed(2)),
    confidence,
    items,
  };
}
