/**
 * Browser orchestration. BROWSER ONLY — imported dynamically by the panel.
 *
 * This is the seam between the DOM (files, canvases, bitmaps) and the pure
 * pipeline. It decodes the chosen file, produces the two downscaled copies the
 * analyzers need, picks the runtime tier from measured capabilities, loads the
 * OCR engine lazily, and runs the pipeline.
 *
 * PRIVACY: there is no `fetch`, `XMLHttpRequest`, `sendBeacon` or WebSocket in
 * this file or anywhere it leads. The only network traffic an analysis can
 * cause is tesseract.js fetching its own static WebAssembly and language files
 * (see ocr/assets.ts), which carry no image data.
 *
 * MEMORY: the decoded bitmap is closed as soon as the two working copies exist,
 * and those copies are bounded at 2048px and 256px on the longest edge, so a
 * 50 megapixel input does not become a 200 MB resident buffer.
 */

import {
  ImageToolError,
  loadImage,
  releaseImage,
  type LoadedImage,
} from "@/lib/files/imageProcessing";

import {
  detectCapabilities,
  canRunOcr,
  selectTier,
  tierRuntime,
  type RuntimeCapabilities,
  type RuntimeTier,
} from "./capabilities";
import { AnalysisCancelledError, runAnalysis } from "./pipeline";
import {
  INFERENCE_MAX_EDGE_PX,
  SIGNAL_MAX_EDGE_PX,
  validateDimensions,
  validateImageFile,
  type SupportedMime,
} from "./validate";
import { fitWithin } from "./geometry";
import type {
  AnalysisDocument,
  AnalysisProgress,
  AnalyzeImageOptions,
  SourceMeta,
} from "./types";
import { DEFAULT_OCR_LANGUAGE, ocrAssetNote } from "./ocr/assets";
import type { OcrEngine } from "./ocr/types";
import { currentSemanticStatus } from "./vision/engine";
import { createAnalysisClient, type AnalysisWorkerClient } from "./workers/analysisClient";

/** Bytes of the file header inspected for magic-byte validation. */
const HEADER_BYTES = 32;

export class ImageContextError extends Error {}

export interface PreparedImage {
  file: File;
  /** Determined from magic bytes, not from the file's declared type. */
  mime: SupportedMime;
  width: number;
  height: number;
  sizeBytes: number;
  /** Object URL for the preview. The caller owns revoking it. */
  previewUrl: string;
  warnings: string[];
}

/**
 * Validate and decode a chosen file. Throws `ImageContextError` with a message
 * that is safe to show verbatim.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const header = new Uint8Array(
    await file.slice(0, HEADER_BYTES).arrayBuffer(),
  );
  const validation = validateImageFile({
    type: file.type,
    size: file.size,
    header,
  });
  if (!validation.ok) throw new ImageContextError(validation.message);

  let loaded: LoadedImage;
  try {
    loaded = await loadImage(file);
  } catch (error) {
    throw new ImageContextError(
      error instanceof ImageToolError
        ? error.message
        : "That image could not be decoded — it may be damaged.",
    );
  }

  const dimensions = validateDimensions(loaded.width, loaded.height);
  if (!dimensions.ok) {
    releaseImage(loaded);
    throw new ImageContextError(
      dimensions.message ?? "That image could not be analysed.",
    );
  }

  // The decoded copy is not kept: the analysis decodes again from the file so
  // that a visitor who never presses Analyse holds no bitmap in memory.
  releaseImage(loaded);

  return {
    file,
    mime: validation.mime,
    width: loaded.width,
    height: loaded.height,
    sizeBytes: validation.sizeBytes,
    previewUrl: URL.createObjectURL(file),
    warnings: [...validation.warnings, ...dimensions.warnings],
  };
}

interface DrawTarget {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
}

function createCanvas(width: number, height: number): DrawTarget {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) return { canvas, context, width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new ImageContextError(
      "Your browser could not create an image canvas, so the image cannot be analysed here.",
    );
  }
  return { canvas, context, width, height };
}

function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): DrawTarget {
  const target = createCanvas(width, height);
  // Flatten transparency onto white: OCR on a transparent PNG otherwise reads
  // black-on-black. The visitor's file is untouched; this is a working copy.
  target.context.fillStyle = "#ffffff";
  target.context.fillRect(0, 0, width, height);
  target.context.imageSmoothingEnabled = true;
  target.context.imageSmoothingQuality = "high";
  target.context.drawImage(source, 0, 0, width, height);
  return target;
}

export interface RuntimeInfo {
  capabilities: RuntimeCapabilities;
  tier: RuntimeTier;
}

/** Measure this browser once. Cheap, synchronous, no side effects. */
export function detectRuntime(): RuntimeInfo {
  const capabilities = detectCapabilities();
  return { capabilities, tier: selectTier(capabilities) };
}

export interface AnalyzeOptions extends Partial<AnalyzeImageOptions> {
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
  /** Reused across runs so the OCR worker is not rebuilt for every image. */
  ocrEngine?: OcrEngine | null;
  /** Why `ocrEngine` is null, when the caller already worked that out. */
  ocrUnavailableReason?: string;
  analysisClient?: AnalysisWorkerClient;
}

/** Lazily construct the OCR engine. Returns null when the device cannot run it. */
export async function createOcrEngineIfSupported(
  capabilities: RuntimeCapabilities,
): Promise<{ engine: OcrEngine | null; reason?: string }> {
  if (!canRunOcr(capabilities)) {
    return {
      engine: null,
      reason:
        "Local text recognition needs WebAssembly, which this browser does not provide, so no text could be extracted.",
    };
  }
  try {
    // Dynamic import: the OCR library is fetched only once an analysis starts.
    const client = await import("./ocr/tesseractClient");
    return { engine: client.createTesseractOcrEngine() };
  } catch {
    return {
      engine: null,
      reason:
        "The local text-recognition engine could not be loaded, so no text was extracted.",
    };
  }
}

/**
 * Run a full local analysis of an already-prepared image.
 *
 * Cancellation is honoured throughout; an aborted run rejects with
 * `AnalysisCancelledError` and can never resolve with a document.
 */
export async function analyzePreparedImage(
  prepared: PreparedImage,
  options: AnalyzeOptions = {},
): Promise<AnalysisDocument> {
  const mode = options.mode ?? "balanced";
  const { capabilities, tier } = detectRuntime();

  const loaded = await loadImage(prepared.file);
  let ocrTarget: DrawTarget | null = null;
  let signalData: ImageData | null = null;

  try {
    if (options.signal?.aborted) throw new AnalysisCancelledError();

    const inference = fitWithin(
      loaded.width,
      loaded.height,
      INFERENCE_MAX_EDGE_PX[mode],
    );
    ocrTarget = drawScaled(loaded.source, inference.width, inference.height);

    const signalSize = fitWithin(
      loaded.width,
      loaded.height,
      SIGNAL_MAX_EDGE_PX,
    );
    const signalTarget = drawScaled(
      loaded.source,
      signalSize.width,
      signalSize.height,
    );
    signalData = signalTarget.context.getImageData(
      0,
      0,
      signalSize.width,
      signalSize.height,
    );
  } finally {
    // The full-resolution bitmap is no longer needed once the working copies
    // exist, and it is the largest thing in memory.
    releaseImage(loaded);
  }

  const ocr =
    options.ocrEngine !== undefined
      ? { engine: options.ocrEngine, reason: options.ocrUnavailableReason }
      : await createOcrEngineIfSupported(capabilities);

  const client = options.analysisClient ?? createAnalysisClient();

  const source: SourceMeta = {
    type: "image",
    mime: prepared.mime,
    width: prepared.width,
    height: prepared.height,
    sizeBytes: prepared.sizeBytes,
    localOnly: true,
  };

  const warnings = [...prepared.warnings];
  if (ocr.engine) warnings.push(ocrAssetNote());

  return runAnalysis(
    {
      source,
      signalImage: signalData
        ? {
            data: signalData.data,
            width: signalData.width,
            height: signalData.height,
          }
        : null,
      ocrImage: ocrTarget ? { kind: "canvas", canvas: ocrTarget.canvas } : null,
      ocrWidth: ocrTarget?.width ?? prepared.width,
      ocrHeight: ocrTarget?.height ?? prepared.height,
      options: {
        mode,
        ocrLanguage: options.ocrLanguage ?? DEFAULT_OCR_LANGUAGE,
        preferWebGPU: options.preferWebGPU ?? true,
      },
      runtime: tierRuntime(tier),
      downscaled: (ocrTarget?.width ?? prepared.width) < prepared.width,
      analysisMaxEdgePx: INFERENCE_MAX_EDGE_PX[mode],
      warnings,
    },
    {
      ocr: ocr.engine,
      semantic: null,
      semanticStatus: currentSemanticStatus(),
      ocrUnavailableReason: ocr.reason,
      buildDocument: (input) =>
        client.buildDocument(input, {
          signal: options.signal,
          onProgress: options.onProgress,
        }),
    },
    { signal: options.signal, onProgress: options.onProgress },
  );
}

export { AnalysisCancelledError };
export { createAnalysisClient } from "./workers/analysisClient";
export type { AnalysisWorkerClient } from "./workers/analysisClient";
