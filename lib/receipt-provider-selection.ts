export type ReceiptProcessingProvider = "local" | "worker" | "openai";

export type ReceiptFallbackOffer = {
  available: boolean;
  reason: string | null;
};

export function selectPrimaryProvider(args: {
  configuredProvider?: string | null;
  runtimeEnvironment?: "local" | "production";
  workerConfigured?: boolean;
}) {
  const configured = args.configuredProvider?.trim();

  if (configured === "worker" && args.workerConfigured) {
    return "worker" satisfies ReceiptProcessingProvider;
  }

  if (configured === "local") {
    return "local" satisfies ReceiptProcessingProvider;
  }

  if (configured === "openai") {
    return "openai" satisfies ReceiptProcessingProvider;
  }

  if (args.runtimeEnvironment === "local") {
    return "local" satisfies ReceiptProcessingProvider;
  }

  if (args.workerConfigured) {
    return "worker" satisfies ReceiptProcessingProvider;
  }

  return "openai" satisfies ReceiptProcessingProvider;
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
