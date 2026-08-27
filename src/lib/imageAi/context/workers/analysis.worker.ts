/**
 * Analysis worker.
 *
 * Runs the pixel pass and the evidence merge off the main thread so the page
 * stays responsive while a large screenshot is analysed.
 *
 * It deliberately imports NOTHING but this feature's own pure modules — no OCR
 * library, no model runtime. OCR already runs in tesseract.js's own worker, so
 * duplicating it here would only add a nested-worker compatibility risk for no
 * gain. That also keeps this worker's bundle tiny and its failure modes few.
 *
 * There is no `fetch` in this file and there must never be one: this worker
 * handles image-derived data and has nothing to say to the network.
 */

/// <reference lib="webworker" />

import { buildDocumentInline } from "../pipeline";
import { asWorkerRequest, type WorkerResponse } from "./protocol";

const scope = self as unknown as DedicatedWorkerGlobalScope;

/** Jobs cancelled by the page. A cancelled job never posts a RESULT. */
const cancelled = new Set<string>();

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

scope.addEventListener("message", (event: MessageEvent) => {
  const request = asWorkerRequest(event.data);
  if (!request) {
    post({
      type: "ERROR",
      error: { code: "bad-message", message: "Unrecognised worker message." },
    });
    return;
  }

  switch (request.type) {
    case "INIT":
      post({ type: "READY" });
      return;

    case "CANCEL":
      cancelled.add(request.jobId);
      return;

    case "DISPOSE":
      cancelled.clear();
      scope.close();
      return;

    case "ANALYZE": {
      const { jobId, payload } = request;
      if (cancelled.has(jobId)) {
        cancelled.delete(jobId);
        return;
      }
      try {
        post({
          type: "PROGRESS",
          jobId,
          progress: {
            kind: "analysis",
            stage: "signals",
            label: "Measuring layout",
            progress: 0.5,
          },
        });

        const result = buildDocumentInline({
          source: payload.source,
          signalImage: payload.signalImage
            ? {
                data: new Uint8ClampedArray(payload.signalImage.data),
                width: payload.signalImage.width,
                height: payload.signalImage.height,
              }
            : null,
          ocr: payload.ocr,
          semantic: payload.semantic,
          semanticStatus: payload.semanticStatus,
          mode: payload.mode,
          runtime: payload.runtime,
          durationMs: payload.durationMs,
          downscaled: payload.downscaled,
          analysisMaxEdgePx: payload.analysisMaxEdgePx,
          warnings: payload.warnings,
        });

        // Re-check: the page may have cancelled while the merge was running.
        if (cancelled.has(jobId)) {
          cancelled.delete(jobId);
          return;
        }
        post({ type: "RESULT", jobId, result });
      } catch {
        post({
          type: "ERROR",
          jobId,
          error: {
            code: "analysis-failed",
            message: "The local analysis could not be completed for this image.",
          },
        });
      }
      return;
    }
  }
});

// Announce readiness for clients that construct the worker and wait.
post({ type: "READY" });
