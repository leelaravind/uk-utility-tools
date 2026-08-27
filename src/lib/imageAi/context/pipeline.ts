/**
 * The analysis pipeline.
 *
 * This is the orchestration layer: it sequences the analyzers, reports
 * progress, honours cancellation and hands everything to the merger. It has no
 * browser dependencies — the OCR engine and the semantic engine arrive as
 * injected interfaces — so the whole flow, including the degraded paths, is
 * exercised in unit tests.
 *
 * Cancellation contract: after every await the abort signal is re-checked and
 * `AnalysisCancelledError` is thrown. A cancelled run therefore cannot return
 * a document, which is what stops a stale result racing a newer one into the
 * UI. Engines are also asked to cancel so their work stops rather than merely
 * being ignored.
 *
 * Failure contract: an analyzer failing degrades the result, it does not fail
 * the run. A device with no WebAssembly still gets dimensions, layout signals,
 * classification and an honest limitations list. Nothing anywhere falls back
 * to a remote service.
 */

import { buildAnalysisDocument, type MergeInput } from "./merge";
import { computePixelSignals, type PixelSource } from "./signals";
import type {
  AnalysisDocument,
  AnalysisMode,
  AnalysisProgress,
  AnalyzeImageOptions,
  ProcessingRuntime,
  SourceMeta,
} from "./types";
import { STAGE_LABELS } from "./types";
import { emptyOcrOutcome, type OcrEngine, type OcrImageInput, type OcrOutcome } from "./ocr/types";
import type { SemanticResult, SemanticStatus, SemanticVisionEngine } from "./vision/types";

/** Thrown when a run is abandoned. Never surfaced as an error to the visitor. */
export class AnalysisCancelledError extends Error {
  constructor() {
    super("Analysis cancelled");
    this.name = "AnalysisCancelledError";
  }
}

export interface AnalysisRequest {
  source: SourceMeta;
  /** Small RGBA buffer used for layout statistics. Null when unavailable. */
  signalImage: PixelSource | null;
  /** The downscaled image handed to OCR. Null when OCR should be skipped. */
  ocrImage: OcrImageInput | null;
  /** Dimensions of `ocrImage`, used to normalise bounding boxes. */
  ocrWidth: number;
  ocrHeight: number;
  options: AnalyzeImageOptions;
  runtime: ProcessingRuntime;
  downscaled: boolean;
  analysisMaxEdgePx: number;
  /** Validation notes to carry into the limitations list. */
  warnings?: string[];
}

/**
 * Everything needed to turn analyzer output into the merged document. Kept as
 * one value so the step can be handed to a Web Worker unchanged.
 */
export interface DocumentBuildInput {
  source: SourceMeta;
  signalImage: PixelSource | null;
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

/**
 * The pixel pass and the merge, run in the current thread. This is the
 * function the analysis worker runs; the main thread uses it directly when no
 * worker is available.
 */
export function buildDocumentInline(
  input: DocumentBuildInput,
): AnalysisDocument {
  const pixel = input.signalImage ? computePixelSignals(input.signalImage) : null;
  const merged: MergeInput = {
    source: input.source,
    pixel,
    ocr: input.ocr,
    semantic: input.semantic,
    semanticStatus: input.semanticStatus,
    mode: input.mode,
    runtime: input.runtime,
    durationMs: input.durationMs,
    downscaled: input.downscaled,
    analysisMaxEdgePx: input.analysisMaxEdgePx,
    warnings: input.warnings,
  };
  return buildAnalysisDocument(merged);
}

export interface AnalysisDependencies {
  /** Null on a device that cannot run local OCR. */
  ocr: OcrEngine | null;
  /** Null in this build; see vision/modelManifest.ts. */
  semantic: SemanticVisionEngine | null;
  semanticStatus: SemanticStatus;
  /** Shown when `ocr` is null. */
  ocrUnavailableReason?: string;
  /** Injectable clock so tests are not timing dependent. */
  now?: () => number;
  /**
   * Optional off-thread implementation of the pixel pass and merge. When
   * absent the work runs inline, which keeps the pipeline usable in a worker,
   * in a test, and in a browser without `Worker` support.
   */
  buildDocument?: (
    input: DocumentBuildInput,
  ) => Promise<AnalysisDocument> | AnalysisDocument;
}

export interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AnalysisCancelledError();
}

function report(
  run: RunOptions,
  kind: AnalysisProgress["kind"],
  stage: string,
  progress: number,
): void {
  run.onProgress?.({
    kind,
    stage,
    label: STAGE_LABELS[stage] ?? stage,
    progress,
  });
}

/** Only `detailed` asks a semantic engine for the longer caption. */
function detailFor(mode: AnalysisMode): "short" | "full" {
  return mode === "detailed" ? "full" : "short";
}

async function runOcr(
  request: AnalysisRequest,
  deps: AnalysisDependencies,
  run: RunOptions,
): Promise<OcrOutcome> {
  if (!deps.ocr) {
    return emptyOcrOutcome(
      "unavailable",
      deps.ocrUnavailableReason ??
        "Local text recognition is not available in this browser, so no text was extracted.",
    );
  }
  if (!request.ocrImage) {
    return emptyOcrOutcome("skipped", "Text recognition was not run for this image.");
  }

  try {
    report(run, "model", "ocr-load", 0);
    await deps.ocr.initialize({
      language: request.options.ocrLanguage,
      signal: run.signal,
      onProgress: (progress) =>
        report(
          run,
          progress.phase === "load" ? "model" : "analysis",
          progress.phase === "load" ? "ocr-load" : "ocr",
          progress.progress,
        ),
    });
    throwIfAborted(run.signal);

    report(run, "analysis", "ocr", 0);
    const result = await deps.ocr.recognize(request.ocrImage, {
      width: request.ocrWidth,
      height: request.ocrHeight,
      signal: run.signal,
      onProgress: (progress) =>
        report(run, "analysis", "ocr", progress.progress),
    });
    throwIfAborted(run.signal);
    return { ...result, status: "ok" };
  } catch (error) {
    if (error instanceof AnalysisCancelledError) throw error;
    if (run.signal?.aborted) throw new AnalysisCancelledError();
    return emptyOcrOutcome(
      "failed",
      "Local text recognition failed on this image, so the result describes its layout only.",
    );
  }
}

async function runSemantic(
  request: AnalysisRequest,
  deps: AnalysisDependencies,
  run: RunOptions,
): Promise<SemanticResult | null> {
  if (!deps.semantic || !request.signalImage) return null;
  try {
    report(run, "model", "semantic", 0);
    await deps.semantic.initialize({
      preferWebGPU: request.options.preferWebGPU,
      signal: run.signal,
      onProgress: (progress) =>
        report(
          run,
          progress.phase === "download" ? "model" : "analysis",
          "semantic",
          progress.progress,
        ),
    });
    throwIfAborted(run.signal);
    const result = await deps.semantic.analyze(request.signalImage, {
      detail: detailFor(request.options.mode),
      signal: run.signal,
      onProgress: (progress) => report(run, "analysis", "semantic", progress.progress),
    });
    throwIfAborted(run.signal);
    return result;
  } catch (error) {
    if (error instanceof AnalysisCancelledError) throw error;
    if (run.signal?.aborted) throw new AnalysisCancelledError();
    // A semantic failure is a degraded result, never a failed run.
    return null;
  }
}

/**
 * Run the full local analysis and return the merged document.
 *
 * Throws only `AnalysisCancelledError`. Every other failure is absorbed into
 * the document's `limitations`.
 */
export async function runAnalysis(
  request: AnalysisRequest,
  deps: AnalysisDependencies,
  run: RunOptions = {},
): Promise<AnalysisDocument> {
  const now = deps.now ?? (() => Date.now());
  const startedAt = now();

  throwIfAborted(run.signal);
  report(run, "analysis", "prepare", 0);

  const ocr = await runOcr(request, deps, run);
  throwIfAborted(run.signal);

  const semantic = await runSemantic(request, deps, run);
  throwIfAborted(run.signal);

  report(run, "analysis", "signals", 0.8);
  const build = deps.buildDocument ?? buildDocumentInline;
  const document = await build({
    source: request.source,
    signalImage: request.signalImage,
    ocr,
    semantic,
    semanticStatus: deps.semanticStatus,
    mode: request.options.mode,
    runtime: request.runtime,
    durationMs: Math.max(0, Math.round(now() - startedAt)),
    downscaled: request.downscaled,
    analysisMaxEdgePx: request.analysisMaxEdgePx,
    warnings: request.warnings,
  });

  report(run, "analysis", "merge", 0.95);
  throwIfAborted(run.signal);
  report(run, "analysis", "done", 1);
  return document;
}
