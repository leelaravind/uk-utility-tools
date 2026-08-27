/**
 * Image → AI Context — public surface of the pure core.
 *
 * IMPORTANT: this barrel re-exports only modules that are safe to import
 * anywhere — no DOM, no worker, no OCR library. The browser-only entry points
 * are deliberately NOT re-exported here, because importing this file must
 * never pull an OCR engine into a page bundle. Import those directly, and
 * dynamically:
 *
 *   await import("@/lib/imageAi/context/analyzeInBrowser")
 *   await import("@/lib/imageAi/context/ocr/tesseractClient")
 *   await import("@/lib/imageAi/context/workers/analysisClient")
 *   await import("@/lib/imageAi/context/storage")
 */

export * from "./types";
export * from "./geometry";
export * from "./sanitize";
export * from "./capabilities";
export * from "./validate";
export * from "./signals";
export * from "./classify";
export * from "./readingOrder";
export * from "./dedupe";
export * from "./important";
export * from "./ui";
export * from "./document";
export * from "./diagram";
export * from "./merge";
export * from "./compress";
export * from "./serialize";
export * from "./providerWrappers";
export * from "./tokenEstimate";
export * from "./pipeline";

export type {
  OcrEngine,
  OcrImageInput,
  OcrInitOptions,
  OcrOutcome,
  OcrProgress,
  OcrRecognizeOptions,
  OcrResult,
  OcrStatus,
} from "./ocr/types";
export { emptyOcrOutcome } from "./ocr/types";
export {
  DEFAULT_OCR_LANGUAGE,
  OCR_ASSET_LIMITATION,
  OCR_CACHE_NAME,
  SELF_HOSTED as OCR_ASSETS_SELF_HOSTED,
  ocrAssetNote,
} from "./ocr/assets";
export { mapTesseractPage } from "./ocr/mapResult";

export type {
  ModelManifestEntry,
  SemanticResult,
  SemanticStatus,
  SemanticVisionEngine,
} from "./vision/types";
export {
  SEMANTIC_VISION_MODELS,
  SEMANTIC_VISION_UNAVAILABLE_REASON,
  semanticVisionStatus,
} from "./vision/modelManifest";
export { currentSemanticStatus } from "./vision/engine";

export { JobGuard } from "./workers/jobGuard";
export type {
  AnalyzePayload,
  SafeWorkerError,
  WorkerRequest,
  WorkerResponse,
} from "./workers/protocol";
