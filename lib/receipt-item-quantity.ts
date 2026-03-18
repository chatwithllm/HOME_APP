import { normalizeItemName } from "@/lib/normalize-item";

type QuantityLikeItem = {
  id: number;
  description: string;
  quantity: number | null;
  lineTotal?: number | string | null;
};

export type InferredQuantitySource =
  | "explicit"
  | "duplicate_lines"
  | "costco_default"
  | "unresolved";

export type InferredQuantity = {
  value: number | null;
  source: InferredQuantitySource;
};

function isCostcoStore(storeName?: string | null) {
  return /costco/i.test(storeName ?? "");
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldCountAsDuplicateCandidate(item: QuantityLikeItem) {
  const normalizedName = normalizeItemName(item.description);

  if (!normalizedName) {
    return false;
  }

  const lineTotal = toNumber(item.lineTotal);

  if (lineTotal != null && lineTotal < 0) {
    return false;
  }

  return true;
}

function buildDuplicateCounts(items: QuantityLikeItem[]) {
  const duplicateCounts = new Map<string, number>();

  for (const item of items) {
    if (!shouldCountAsDuplicateCandidate(item)) {
      continue;
    }

    const key = normalizeItemName(item.description);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  return duplicateCounts;
}

export function buildInferredQuantityDetailsMap(items: QuantityLikeItem[], storeName?: string | null) {
  const inferred = new Map<number, InferredQuantity>();
  const duplicateCounts = buildDuplicateCounts(items);
  const costco = isCostcoStore(storeName);

  for (const item of items) {
    if (item.quantity != null) {
      inferred.set(item.id, {
        value: item.quantity,
        source: "explicit",
      });
      continue;
    }

    const key = normalizeItemName(item.description);
    const duplicateCount = key ? (duplicateCounts.get(key) ?? 0) : 0;

    if (duplicateCount > 1) {
      inferred.set(item.id, {
        value: duplicateCount,
        source: "duplicate_lines",
      });
      continue;
    }

    if (costco && shouldCountAsDuplicateCandidate(item)) {
      inferred.set(item.id, {
        value: 1,
        source: "costco_default",
      });
      continue;
    }

    inferred.set(item.id, {
      value: null,
      source: "unresolved",
    });
  }

  return inferred;
}

export function buildInferredQuantityMap(items: QuantityLikeItem[], storeName?: string | null) {
  const inferredDetails = buildInferredQuantityDetailsMap(items, storeName);
  const inferred = new Map<number, number | null>();

  for (const [itemId, detail] of inferredDetails) {
    inferred.set(itemId, detail.value);
  }

  return inferred;
}

export function getInferredQuantity(
  item: QuantityLikeItem,
  allItems: QuantityLikeItem[],
  storeName?: string | null,
) {
  return buildInferredQuantityMap(allItems, storeName).get(item.id) ?? null;
}

export function summarizeInferredQuantities(items: QuantityLikeItem[], storeName?: string | null) {
  const details = buildInferredQuantityDetailsMap(items, storeName);

  let explicitCount = 0;
  let duplicateLineCount = 0;
  let costcoDefaultCount = 0;
  let unresolvedCount = 0;

  for (const detail of details.values()) {
    if (detail.source === "explicit") {
      explicitCount += 1;
    } else if (detail.source === "duplicate_lines") {
      duplicateLineCount += 1;
    } else if (detail.source === "costco_default") {
      costcoDefaultCount += 1;
    } else {
      unresolvedCount += 1;
    }
  }

  return {
    explicitCount,
    duplicateLineCount,
    costcoDefaultCount,
    unresolvedCount,
  };
}
