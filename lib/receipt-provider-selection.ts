export type ReceiptProcessingProvider = "local" | "worker" | "openai";

export type ReceiptFallbackOffer = {
  available: boolean;
  reason: string | null;
};

export function selectPrimaryProvider(args: {
  storage?: "local" | "blob";
  configuredProvider?: string | null;
}) {
  const configured = args.configuredProvider?.trim();

  if (configured === "worker") {
    return "worker" satisfies ReceiptProcessingProvider;
  }

  if (configured === "local") {
    return "local" satisfies ReceiptProcessingProvider;
  }

  if (configured === "openai") {
    return "openai" satisfies ReceiptProcessingProvider;
  }

  return args.storage === "blob" ? "worker" : "local";
}

export function getOpenAiFallbackOffer(args: {
  failedProvider: ReceiptProcessingProvider;
  failedMessage?: string | null;
  openAiEnabled?: boolean;
}) {
  if (!args.openAiEnabled) {
    return {
      available: false,
      reason: "OpenAI fallback is not enabled.",
    } satisfies ReceiptFallbackOffer;
  }

  if (args.failedProvider === "openai") {
    return {
      available: false,
      reason: "OpenAI already failed for this attempt.",
    } satisfies ReceiptFallbackOffer;
  }

  return {
    available: true,
    reason: args.failedMessage || "Primary receipt processing failed.",
  } satisfies ReceiptFallbackOffer;
}
