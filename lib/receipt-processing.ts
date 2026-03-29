export type ReceiptProcessingSource = "local" | "worker" | "openai";

export type ReceiptProcessingStatus =
  | "uploaded"
  | "ocr_completed"
  | "draft_built"
  | "reviewed"
  | "saved"
  | "failed";

export function buildReceiptStructuredMetadata(args: {
  processingSource: ReceiptProcessingSource;
  processingStatus: ReceiptProcessingStatus;
  uploadStorage?: "local" | "blob";
  uploadContentType?: string;
  uploadOriginalName?: string;
  ocrMethod?: string;
  confidence?: Record<string, unknown>;
  overallConfidence?: number | null;
  warnings?: string[];
  qualityFlags?: string[];
}) {
  return {
    processing: {
      source: args.processingSource,
      status: args.processingStatus,
      uploadStorage: args.uploadStorage ?? null,
      uploadContentType: args.uploadContentType ?? null,
      uploadOriginalName: args.uploadOriginalName ?? null,
      ocrMethod: args.ocrMethod ?? null,
    },
    ...(args.confidence ? { confidence: args.confidence } : {}),
    ...(args.overallConfidence != null ? { overallConfidence: args.overallConfidence } : {}),
    ...(args.warnings?.length ? { warnings: args.warnings } : {}),
    ...(args.qualityFlags?.length ? { qualityFlags: args.qualityFlags } : {}),
  };
}
