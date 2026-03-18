type QuantityLikeItem = {
  id: number;
  description: string;
  quantity: number | null;
};

function normalizeDescription(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isCostcoStore(storeName?: string | null) {
  return /costco/i.test(storeName ?? "");
}

export function buildInferredQuantityMap(items: QuantityLikeItem[], storeName?: string | null) {
  const inferred = new Map<number, number | null>();

  if (!isCostcoStore(storeName)) {
    for (const item of items) {
      inferred.set(item.id, item.quantity ?? null);
    }
    return inferred;
  }

  const duplicateCounts = new Map<string, number>();

  for (const item of items) {
    const key = normalizeDescription(item.description);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  for (const item of items) {
    if (item.quantity != null) {
      inferred.set(item.id, item.quantity);
      continue;
    }

    const key = normalizeDescription(item.description);
    inferred.set(item.id, duplicateCounts.get(key) ?? 1);
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
