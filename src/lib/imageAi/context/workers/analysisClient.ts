/**
 * Main-thread client for the analysis worker. BROWSER ONLY.
 *
 * Responsibilities:
 *  - construct the worker lazily, the first time an analysis actually runs;
 *  - refuse to let a stale job update anything (see `JobGuard`);
 *  - fall back to running the same code in the page if the worker cannot be
 *    created or dies. The worker is an optimisation; losing it must degrade
 *    responsiveness, never correctness.
 *
 * The client never sends anything to the network and the worker it talks to
 * has no network access in its code path either.
 */

import { AnalysisCancelledError, buildDocumentInline, type DocumentBuildInput } from "../pipeline";
import type { AnalysisDocument, AnalysisProgress } from "../types";
import { JobGuard } from "./jobGuard";
import type { AnalyzePayload, WorkerResponse } from "./protocol";

export interface BuildDocumentOptions {
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
}

export interface AnalysisWorkerClient {
  buildDocument(
    input: DocumentBuildInput,
    options?: BuildDocumentOptions,
  ): Promise<AnalysisDocument>;
  /** True when work is genuinely running off the main thread. */
  readonly usingWorker: boolean;
  dispose(): void;
}

interface Pending {
  resolve: (doc: AnalysisDocument) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: AnalysisProgress) => void;
}

/** Copy the pixel buffer into a transferable payload. */
function toPayload(input: DocumentBuildInput): AnalyzePayload {
  const signalImage = input.signalImage
    ? {
        // A fresh copy is taken because the buffer is transferred (detached)
        // and the caller may still be holding the original.
        data: new Uint8ClampedArray(input.signalImage.data).buffer,
        width: input.signalImage.width,
        height: input.signalImage.height,
      }
    : null;
  return {
    source: input.source,
    signalImage,
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
}

/**
 * Whether to attempt the dedicated analysis worker.
 *
 * Currently FALSE, and deliberately so. Under `output: "export"` this repo's
 * Turbopack build resolves `new URL("./analysis.worker.ts", import.meta.url)`
 * as a static *asset* and copies the raw TypeScript to
 * `out/_next/static/media/analysis.worker.<hash>.ts` instead of compiling it
 * into a worker bundle. A browser cannot execute that file, so every analysis
 * would fire a doomed request and then fall back — slower than not trying at
 * all, and a silent failure rather than a visible one.
 *
 * Turning it back on: build, confirm a real `.js` worker chunk is emitted (not
 * a `.ts` under `static/media`), load `/image-context`, run an analysis, and
 * check the Network panel shows the worker script fetched and executed. Only
 * then flip this to `true`.
 *
 * The cost of it being off is small: OCR — the genuinely slow part — already
 * runs in tesseract.js's own worker, which does work. What stays on the main
 * thread here is the pixel pass and the merge over an already-downscaled
 * bitmap.
 */
const WORKER_ENABLED = false;

class WorkerBackedClient implements AnalysisWorkerClient {
  private worker: Worker | null = null;

  private broken = false;

  private readonly guard = new JobGuard();

  private readonly pending = new Map<string, Pending>();

  get usingWorker(): boolean {
    return this.worker !== null && !this.broken;
  }

  private ensureWorker(): Worker | null {
    if (!WORKER_ENABLED) {
      this.broken = true;
      return null;
    }
    if (this.broken) return null;
    if (this.worker) return this.worker;
    if (typeof Worker === "undefined") {
      this.broken = true;
      return null;
    }
    try {
      const worker = new Worker(
        new URL("./analysis.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.addEventListener("message", (event: MessageEvent) =>
        this.handleMessage(event.data as WorkerResponse),
      );
      worker.addEventListener("error", () => this.breakWorker());
      worker.addEventListener("messageerror", () => this.breakWorker());
      this.worker = worker;
      return worker;
    } catch {
      // A bundler or a browser that cannot start module workers is a
      // performance problem, not a functional one.
      this.broken = true;
      return null;
    }
  }

  private breakWorker(): void {
    this.broken = true;
    const worker = this.worker;
    this.worker = null;
    worker?.terminate();
    for (const [, pending] of this.pending) {
      pending.reject(new Error("worker-unavailable"));
    }
    this.pending.clear();
  }

  private handleMessage(message: WorkerResponse): void {
    if (!message || typeof message !== "object") return;
    if (message.type === "READY") return;

    if (message.type === "PROGRESS") {
      if (!this.guard.isCurrent(message.jobId)) return;
      this.pending.get(message.jobId)?.onProgress?.(message.progress);
      return;
    }

    if (message.type === "RESULT") {
      const pending = this.pending.get(message.jobId);
      this.pending.delete(message.jobId);
      // A superseded job's result is dropped here, before it can reach state.
      if (!pending || !this.guard.isCurrent(message.jobId)) return;
      pending.resolve(message.result);
      return;
    }

    if (message.type === "ERROR") {
      if (message.jobId) {
        const pending = this.pending.get(message.jobId);
        this.pending.delete(message.jobId);
        pending?.reject(new Error(message.error.message));
      }
    }
  }

  async buildDocument(
    input: DocumentBuildInput,
    options: BuildDocumentOptions = {},
  ): Promise<AnalysisDocument> {
    if (options.signal?.aborted) throw new AnalysisCancelledError();

    const worker = this.ensureWorker();
    if (!worker) return buildDocumentInline(input);

    const jobId = this.guard.start();
    const payload = toPayload(input);

    try {
      return await new Promise<AnalysisDocument>((resolve, reject) => {
        this.pending.set(jobId, {
          resolve,
          reject,
          onProgress: options.onProgress,
        });

        const abort = () => {
          this.guard.cancel(jobId);
          this.pending.delete(jobId);
          worker.postMessage({ type: "CANCEL", jobId });
          reject(new AnalysisCancelledError());
        };
        options.signal?.addEventListener("abort", abort, { once: true });

        const transfer = payload.signalImage ? [payload.signalImage.data] : [];
        worker.postMessage({ type: "ANALYZE", jobId, payload }, transfer);
      });
    } catch (error) {
      if (error instanceof AnalysisCancelledError) throw error;
      // The worker failed us; do the work here rather than failing the run.
      this.breakWorker();
      return buildDocumentInline(input);
    }
  }

  dispose(): void {
    this.guard.cancel();
    this.pending.clear();
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.postMessage({ type: "DISPOSE" });
      worker.terminate();
    }
  }
}

/** In-page client used when workers are unavailable. */
class InlineClient implements AnalysisWorkerClient {
  readonly usingWorker = false;

  async buildDocument(
    input: DocumentBuildInput,
    options: BuildDocumentOptions = {},
  ): Promise<AnalysisDocument> {
    if (options.signal?.aborted) throw new AnalysisCancelledError();
    return buildDocumentInline(input);
  }

  dispose(): void {
    // Nothing to release.
  }
}

/** Create the best available client for this browser. */
export function createAnalysisClient(): AnalysisWorkerClient {
  if (typeof Worker === "undefined") return new InlineClient();
  return new WorkerBackedClient();
}
