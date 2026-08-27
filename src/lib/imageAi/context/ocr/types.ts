/**
 * OCR engine contract.
 *
 * The pipeline only ever speaks to this interface, so the Tesseract client can
 * be replaced, stubbed in tests, or absent entirely. "Absent entirely" is a
 * supported outcome, not an error path: on a device that cannot run
 * WebAssembly the analysis still completes with `status: "unavailable"` and a
 * stated limitation.
 *
 * An implementation may download its own static assets. It may not send image
 * data, recognised text, or anything derived from either anywhere.
 */

import type { OCRBlock } from "../types";

export type OcrStatus =
  | "ok"
  | "unavailable"
  | "failed"
  | "cancelled"
  | "skipped";

export interface OcrResult {
  blocks: OCRBlock[];
  /** Recognised text in reading order. Exact, minus control characters. */
  fullText: string;
  /** Mean engine-reported confidence, 0–1, when the engine reports one. */
  meanConfidence?: number;
}

/** An OCR result plus why it looks the way it does. */
export interface OcrOutcome extends OcrResult {
  status: OcrStatus;
  /** Present when status is not "ok". Safe to show to the visitor. */
  reason?: string;
}

/** Empty outcome helper so callers never have to construct one by hand. */
export function emptyOcrOutcome(status: OcrStatus, reason?: string): OcrOutcome {
  return { status, reason, blocks: [], fullText: "" };
}

export interface OcrProgress {
  /** "load" covers engine and language-data download, "recognize" the work. */
  phase: "load" | "recognize";
  /** 0–1, or -1 when the engine reports no usable number. */
  progress: number;
  label: string;
}

export interface OcrInitOptions {
  language?: string;
  onProgress?: (progress: OcrProgress) => void;
  signal?: AbortSignal;
}

/** Anything the browser can rasterise. Structural so tests need no DOM. */
export type OcrImageInput =
  | { kind: "canvas"; canvas: unknown }
  | { kind: "blob"; blob: Blob }
  | { kind: "imageData"; data: Uint8ClampedArray; width: number; height: number };

export interface OcrRecognizeOptions {
  /** Source dimensions used to normalise bounding boxes back to [0,1]. */
  width: number;
  height: number;
  onProgress?: (progress: OcrProgress) => void;
  signal?: AbortSignal;
}

export interface OcrEngine {
  /** Loads the engine and language data. Safe to call more than once. */
  initialize(options?: OcrInitOptions): Promise<void>;
  recognize(
    image: OcrImageInput,
    options: OcrRecognizeOptions,
  ): Promise<OcrResult>;
  /** Abandons the in-flight job. The pending `recognize` promise rejects. */
  cancel(): void;
  /** Releases the worker and any cached engine state. */
  dispose(): Promise<void>;
}
