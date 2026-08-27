/**
 * Typed worker protocol.
 *
 * Every message crossing the worker boundary is one of these shapes. Keeping
 * the union here — rather than casting `event.data` at each site — means the
 * compiler catches a missing field on both ends at once.
 *
 * What crosses the boundary is deliberately small: a 256px RGBA buffer and
 * already-recognised text. Neither the source file nor a full-resolution
 * bitmap is transferred, so peak memory stays bounded even for a 50 MP image.
 *
 * The worker is an accelerator, not a dependency. If it fails to start, the
 * same code path runs in the page (see `analysisClient.ts`).
 */

import type {
  AnalysisDocument,
  AnalysisProgress,
  AnalysisMode,
  ProcessingRuntime,
  SourceMeta,
} from "../types";
import type { OcrOutcome } from "../ocr/types";
import type { SemanticResult, SemanticStatus } from "../vision/types";

/** Transferable RGBA buffer. `data` is moved, not copied. */
export interface TransferableImage {
  data: ArrayBuffer;
  width: number;
  height: number;
}

export interface AnalyzePayload {
  source: SourceMeta;
  signalImage: TransferableImage | null;
  ocr: OcrOutcome;
  semantic: SemanticResult | null;
  semanticStatus: SemanticStatus;
  mode: AnalysisMode;
  runtime: ProcessingRuntime;
  durationMs?: number;
  downscaled?: boolean;
  analysisMaxEdgePx?: number;
  warnings?: string[];
}

export type WorkerRequest =
  | { type: "INIT" }
  | { type: "ANALYZE"; jobId: string; payload: AnalyzePayload }
  | { type: "CANCEL"; jobId: string }
  | { type: "DISPOSE" };

/** Error shape safe to show a visitor: a category and a plain message. */
export interface SafeWorkerError {
  code: "analysis-failed" | "bad-message";
  message: string;
}

export type WorkerResponse =
  | { type: "READY" }
  | { type: "PROGRESS"; jobId: string; progress: AnalysisProgress }
  | { type: "RESULT"; jobId: string; result: AnalysisDocument }
  | { type: "ERROR"; jobId?: string; error: SafeWorkerError };

/** Narrow an unknown `event.data` to a request without trusting its shape. */
export function asWorkerRequest(data: unknown): WorkerRequest | null {
  if (typeof data !== "object" || data === null) return null;
  const candidate = data as { type?: unknown };
  if (
    candidate.type === "INIT" ||
    candidate.type === "ANALYZE" ||
    candidate.type === "CANCEL" ||
    candidate.type === "DISPOSE"
  ) {
    return data as WorkerRequest;
  }
  return null;
}
