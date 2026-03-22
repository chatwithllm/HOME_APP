type UnknownRecord = Record<string, unknown>;

type ConfidenceMap = Record<string, number>;

export type ReceiptParseSummary = {
  parserSource: string | null;
  parserName: string | null;
  parserVersion: string | null;
  overallConfidence: number | null;
  confidence: ConfidenceMap;
  warnings: string[];
  qualityFlags: string[];
};

export type ItemParseSummary = {
  confidence: ConfidenceMap;
  warnings: string[];
  rawLine: string | null;
  lowConfidenceFields: string[];
};

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as UnknownRecord;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asConfidenceMap(value: unknown): ConfidenceMap {
  const record = asRecord(value);
  const entries = Object.entries(record).flatMap(([key, raw]) => {
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;

    if (!Number.isFinite(parsed)) {
      return [];
    }

    return [[key, Math.max(0, Math.min(1, parsed))] as const];
  });

  return Object.fromEntries(entries);
}

export function isLowConfidence(value: number | null | undefined, threshold = 0.7) {
  return typeof value === "number" && value < threshold;
}

export function getReceiptParseSummary(structuredJson: unknown): ReceiptParseSummary {
  const root = asRecord(structuredJson);
  const parser = asRecord(root.parser);
  const confidence = asConfidenceMap(root.confidence);
  const warnings = asStringArray(root.warnings);
  const qualityFlags = asStringArray(root.qualityFlags);
  const overallConfidence = (() => {
    const raw = root.overallConfidence ?? confidence.overall;
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : null;
  })();

  return {
    parserSource: asString(parser.source),
    parserName: asString(parser.name),
    parserVersion: asString(parser.version),
    overallConfidence,
    confidence,
    warnings,
    qualityFlags,
  };
}

export function getItemParseSummary(metaJson: unknown): ItemParseSummary {
  const root = asRecord(metaJson);
  const confidence = asConfidenceMap(root.confidence);
  const warnings = asStringArray(root.warnings);
  const rawLine = asString(root.rawLine);
  const lowConfidenceFields = Object.entries(confidence)
    .filter(([, value]) => isLowConfidence(value))
    .map(([key]) => key);

  return {
    confidence,
    warnings,
    rawLine,
    lowConfidenceFields,
  };
}

export function getReceiptQualityFlagCount(structuredJson: unknown) {
  const summary = getReceiptParseSummary(structuredJson);
  const lowConfidenceCoreFields = ["storeName", "receiptDate", "total", "items"].filter((field) =>
    isLowConfidence(summary.confidence[field]),
  );

  return {
    warningCount: summary.warnings.length,
    qualityFlagCount: summary.qualityFlags.length,
    lowConfidenceCoreFieldCount: lowConfidenceCoreFields.length,
    lowConfidenceCoreFields,
    isLowConfidenceReceipt:
      isLowConfidence(summary.overallConfidence) ||
      lowConfidenceCoreFields.length > 0 ||
      summary.warnings.length > 0 ||
      summary.qualityFlags.length > 0,
  };
}
