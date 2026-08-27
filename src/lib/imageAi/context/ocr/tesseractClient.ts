/**
 * Local OCR via tesseract.js. BROWSER ONLY.
 *
 * This module must never be imported at the top level of a page component:
 * importing it pulls in the OCR library, and the whole point of the lazy
 * architecture is that a visitor who never analyses an image never downloads
 * an OCR engine. Load it with `await import(...)` from an event handler.
 *
 * Design notes:
 *  - ONE worker is created and reused for every image in the session. Creating
 *    a worker per image re-downloads nothing (the language data is cached) but
 *    it does re-instantiate the WASM module, which is slow and memory-hungry.
 *  - Cancellation terminates the worker. Tesseract has no mid-page abort, so
 *    the only honest way to stop work is to tear the worker down; the next
 *    analysis transparently creates a new one.
 *  - Recognised text is returned as data. It is never evaluated, never used to
 *    choose a code path, and never rendered as HTML.
 *
 * Network: the library fetches its own WASM and language files (see
 * `assets.ts`). It sends nothing. No image bytes, no recognised text, and no
 * derived value ever leaves this process.
 */

import { mapTesseractPage, type TesseractPageLike } from "./mapResult";
import { DEFAULT_OCR_LANGUAGE, tesseractAssetOptions } from "./assets";
import type {
  OcrEngine,
  OcrImageInput,
  OcrInitOptions,
  OcrProgress,
  OcrRecognizeOptions,
  OcrResult,
} from "./types";

interface TesseractLogMessage {
  status?: string;
  progress?: number;
}

interface TesseractWorkerLike {
  recognize(
    image: unknown,
    options?: unknown,
    output?: unknown,
  ): Promise<{ data: TesseractPageLike }>;
  terminate(): Promise<unknown>;
}

type CreateWorkerFn = (
  langs?: string,
  oem?: number,
  options?: Record<string, unknown>,
) => Promise<TesseractWorkerLike>;

/** Statuses tesseract reports while fetching assets rather than recognising. */
const LOADING_STATUSES = [
  "loading tesseract core",
  "initializing tesseract",
  "loading language traineddata",
  "initializing api",
  "loading core",
];

function phaseFor(status: string): OcrProgress["phase"] {
  return LOADING_STATUSES.some((s) => status.startsWith(s)) ? "load" : "recognize";
}

function friendlyLabel(status: string): string {
  if (status.startsWith("recognizing")) return "Reading text";
  if (status.includes("traineddata")) return "Loading language data";
  if (status.includes("core") || status.includes("initializing")) {
    return "Loading local OCR engine";
  }
  return "Working";
}

/** Resolve `createWorker` across the CommonJS/ESM interop boundary. */
function resolveCreateWorker(mod: unknown): CreateWorkerFn {
  const candidate = mod as {
    createWorker?: CreateWorkerFn;
    default?: { createWorker?: CreateWorkerFn };
  };
  const fn = candidate.createWorker ?? candidate.default?.createWorker;
  if (typeof fn !== "function") {
    throw new Error("tesseract.js did not expose createWorker");
  }
  return fn;
}

/**
 * Draw an `ImageData` buffer onto a canvas, because tesseract accepts canvases
 * and blobs but not raw pixel buffers.
 */
function canvasFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): unknown {
  const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      return canvas;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas for OCR");
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function toTesseractImage(input: OcrImageInput): unknown {
  if (input.kind === "canvas") return input.canvas;
  if (input.kind === "blob") return input.blob;
  return canvasFromImageData(input.data, input.width, input.height);
}

export class TesseractOcrEngine implements OcrEngine {
  private worker: TesseractWorkerLike | null = null;

  private starting: Promise<TesseractWorkerLike> | null = null;

  private language = DEFAULT_OCR_LANGUAGE;

  private onProgress: ((progress: OcrProgress) => void) | undefined;

  private cancelled = false;

  async initialize(options: OcrInitOptions = {}): Promise<void> {
    this.cancelled = false;
    this.language = options.language ?? this.language;
    this.onProgress = options.onProgress;
    await this.ensureWorker();
    if (options.signal?.aborted) this.cancel();
  }

  private async ensureWorker(): Promise<TesseractWorkerLike> {
    if (this.worker) return this.worker;
    if (this.starting) return this.starting;

    this.starting = (async () => {
      // Dynamic import: nothing OCR-related is fetched until this line runs.
      const mod = await import("tesseract.js");
      const createWorker = resolveCreateWorker(mod);
      const worker = await createWorker(this.language, undefined, {
        ...tesseractAssetOptions(),
        logger: (message: TesseractLogMessage) => {
          const status = (message.status ?? "").toLowerCase();
          this.onProgress?.({
            phase: phaseFor(status),
            progress:
              typeof message.progress === "number" ? message.progress : -1,
            label: friendlyLabel(status),
          });
        },
      });
      this.worker = worker;
      return worker;
    })();

    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async recognize(
    image: OcrImageInput,
    options: OcrRecognizeOptions,
  ): Promise<OcrResult> {
    this.cancelled = false;
    this.onProgress = options.onProgress ?? this.onProgress;
    const worker = await this.ensureWorker();

    if (options.signal?.aborted || this.cancelled) {
      throw new Error("Cancelled");
    }

    const abortListener = () => this.cancel();
    options.signal?.addEventListener("abort", abortListener, { once: true });

    try {
      const result = await worker.recognize(
        toTesseractImage(image),
        {},
        // Ask for block geometry explicitly: recent versions omit it unless
        // requested, and without boxes there is no reading order or layout.
        { text: true, blocks: true },
      );
      if (this.cancelled || options.signal?.aborted) throw new Error("Cancelled");
      return mapTesseractPage(result.data, options.width, options.height);
    } finally {
      options.signal?.removeEventListener("abort", abortListener);
    }
  }

  /**
   * Abandon in-flight work. Tesseract cannot interrupt a page mid-recognition,
   * so the worker is torn down; the pending promise rejects and the next call
   * creates a fresh worker.
   */
  cancel(): void {
    this.cancelled = true;
    const worker = this.worker;
    this.worker = null;
    if (worker) void worker.terminate().catch(() => undefined);
  }

  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    this.starting = null;
    this.onProgress = undefined;
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // A worker that has already gone away is exactly what we wanted.
      }
    }
  }
}

/** Factory kept separate so callers never import the class eagerly. */
export function createTesseractOcrEngine(): OcrEngine {
  return new TesseractOcrEngine();
}
