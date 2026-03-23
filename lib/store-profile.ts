export type StoreProfileMetadata = {
  preferredForCategories: string[];
  shoppingTips: string[];
  pricingNotes: string | null;
  reliability: "high" | "medium" | "low" | null;
  defaultPriority: "high" | "normal" | "low" | null;
  avoidForItems: string[];
  preferForItems: string[];
};

const EMPTY_METADATA: StoreProfileMetadata = {
  preferredForCategories: [],
  shoppingTips: [],
  pricingNotes: null,
  reliability: null,
  defaultPriority: null,
  avoidForItems: [],
  preferForItems: [],
};

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseStoreProfileNotes(notes: string | null | undefined): StoreProfileMetadata {
  if (!notes?.trim()) {
    return EMPTY_METADATA;
  }

  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    const reliability = parsed.reliability;
    const defaultPriority = parsed.defaultPriority;

    return {
      preferredForCategories: normalizeStringArray(parsed.preferredForCategories),
      shoppingTips: normalizeStringArray(parsed.shoppingTips),
      pricingNotes: typeof parsed.pricingNotes === "string" && parsed.pricingNotes.trim() ? parsed.pricingNotes.trim() : null,
      reliability: reliability === "high" || reliability === "medium" || reliability === "low" ? reliability : null,
      defaultPriority:
        defaultPriority === "high" || defaultPriority === "normal" || defaultPriority === "low"
          ? defaultPriority
          : null,
      avoidForItems: normalizeStringArray(parsed.avoidForItems),
      preferForItems: normalizeStringArray(parsed.preferForItems),
    };
  } catch {
    return {
      ...EMPTY_METADATA,
      pricingNotes: notes.trim(),
    };
  }
}

export function serializeStoreProfileNotes(metadata: Partial<StoreProfileMetadata>, fallbackNotes?: string | null) {
  const merged: StoreProfileMetadata = {
    ...EMPTY_METADATA,
    ...metadata,
    preferredForCategories: normalizeStringArray(metadata.preferredForCategories),
    shoppingTips: normalizeStringArray(metadata.shoppingTips),
    avoidForItems: normalizeStringArray(metadata.avoidForItems),
    preferForItems: normalizeStringArray(metadata.preferForItems),
    pricingNotes:
      typeof metadata.pricingNotes === "string"
        ? metadata.pricingNotes.trim() || null
        : fallbackNotes?.trim() || null,
  };

  if (
    !merged.preferredForCategories.length &&
    !merged.shoppingTips.length &&
    !merged.pricingNotes &&
    !merged.reliability &&
    !merged.defaultPriority &&
    !merged.avoidForItems.length &&
    !merged.preferForItems.length
  ) {
    return null;
  }

  return JSON.stringify(merged);
}

export function scoreStorePreference(args: {
  normalizedName: string;
  storeName: string;
  purchaseCount: number;
  profileNotes?: string | null;
}) {
  const metadata = parseStoreProfileNotes(args.profileNotes);
  let score = args.purchaseCount;

  if (metadata.preferForItems.some((item) => args.normalizedName.includes(item.toLowerCase()))) {
    score += 3;
  }

  if (metadata.avoidForItems.some((item) => args.normalizedName.includes(item.toLowerCase()))) {
    score -= 4;
  }

  if (metadata.reliability === "high") score += 1.5;
  if (metadata.reliability === "low") score -= 1.5;

  return {
    score,
    metadata,
    storeName: args.storeName,
  };
}
