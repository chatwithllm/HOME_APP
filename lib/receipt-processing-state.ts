export type UploadProcessingStep = "upload" | "ocr" | "draft" | "save";
export type UploadProcessingState = "idle" | "running" | "success" | "failed";

export type UploadStepStatus = {
  step: UploadProcessingStep;
  state: UploadProcessingState;
  message?: string;
};

export function createInitialProcessingSteps(): Record<UploadProcessingStep, UploadStepStatus> {
  return {
    upload: { step: "upload", state: "idle" },
    ocr: { step: "ocr", state: "idle" },
    draft: { step: "draft", state: "idle" },
    save: { step: "save", state: "idle" },
  };
}

export function setStepState(
  current: Record<UploadProcessingStep, UploadStepStatus>,
  step: UploadProcessingStep,
  state: UploadProcessingState,
  message?: string,
) {
  return {
    ...current,
    [step]: {
      step,
      state,
      ...(message ? { message } : {}),
    },
  };
}
