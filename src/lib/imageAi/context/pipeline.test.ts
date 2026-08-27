import { describe, expect, it, vi } from "vitest";

import { SCREENSHOT_BLOCKS, noisyPixels, sourceMeta } from "./fixtures";
import {
  AnalysisCancelledError,
  buildDocumentInline,
  runAnalysis,
  type AnalysisDependencies,
  type AnalysisRequest,
} from "./pipeline";
import type { AnalysisProgress } from "./types";
import type {
  OcrEngine,
  OcrImageInput,
  OcrRecognizeOptions,
  OcrResult,
} from "./ocr/types";
import { SEMANTIC_VISION_UNAVAILABLE_REASON } from "./vision/modelManifest";
import type { SemanticVisionEngine } from "./vision/types";

const semanticStatus = {
  available: false,
  reason: SEMANTIC_VISION_UNAVAILABLE_REASON,
};

function request(overrides: Partial<AnalysisRequest> = {}): AnalysisRequest {
  return {
    source: sourceMeta(),
    signalImage: noisyPixels(32, 32),
    ocrImage: { kind: "blob", blob: new Blob() },
    ocrWidth: 1600,
    ocrHeight: 900,
    options: { mode: "balanced", ocrLanguage: "eng", preferWebGPU: true },
    runtime: "wasm",
    downscaled: true,
    analysisMaxEdgePx: 1600,
    ...overrides,
  };
}

/** An OCR engine that resolves after a controllable delay. */
function fakeOcr(options: {
  delayMs?: number;
  fail?: boolean;
  onCancel?: () => void;
} = {}): OcrEngine & { cancelled: boolean } {
  const engine = {
    cancelled: false,
    async initialize(): Promise<void> {},
    async recognize(
      _image: OcrImageInput,
      recognizeOptions: OcrRecognizeOptions,
    ): Promise<OcrResult> {
      if (options.fail) throw new Error("engine exploded");
      if (options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
      if (recognizeOptions.signal?.aborted) throw new Error("aborted");
      return {
        blocks: SCREENSHOT_BLOCKS,
        fullText: SCREENSHOT_BLOCKS.map((b) => b.text).join("\n"),
        meanConfidence: 0.91,
      };
    },
    cancel(): void {
      engine.cancelled = true;
      options.onCancel?.();
    },
    async dispose(): Promise<void> {},
  };
  return engine;
}

function deps(overrides: Partial<AnalysisDependencies> = {}): AnalysisDependencies {
  return {
    ocr: fakeOcr(),
    semantic: null,
    semanticStatus,
    now: () => 0,
    ...overrides,
  };
}

describe("runAnalysis", () => {
  it("produces a document from OCR plus layout heuristics", async () => {
    const doc = await runAnalysis(request(), deps());
    expect(doc.text.blocks.length).toBeGreaterThan(0);
    expect(doc.quality.ocrConfidence).toBe(0.91);
    expect(doc.processing.runtime).toBe("wasm");
    expect(doc.processing.mode).toBe("balanced");
  });

  it("reports progress through the named stages", async () => {
    const progress: AnalysisProgress[] = [];
    await runAnalysis(request(), deps(), {
      onProgress: (p) => progress.push(p),
    });
    const stages = progress.map((p) => p.stage);
    expect(stages).toContain("prepare");
    expect(stages).toContain("ocr");
    expect(stages).toContain("merge");
    expect(stages[stages.length - 1]).toBe("done");
    for (const item of progress) {
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("degrades to layout-only when no OCR engine exists (tier C)", async () => {
    const doc = await runAnalysis(
      request(),
      deps({
        ocr: null,
        ocrUnavailableReason: "This browser cannot run local OCR.",
        buildDocument: undefined,
      }),
    );
    expect(doc.text.blocks).toEqual([]);
    expect(doc.limitations).toContain("This browser cannot run local OCR.");
    // The rest of the document is still produced.
    expect(doc.source.width).toBe(1920);
    expect(doc.classification.kind).toBe("photo");
  });

  it("degrades rather than failing when the OCR engine throws", async () => {
    const doc = await runAnalysis(request(), deps({ ocr: fakeOcr({ fail: true }) }));
    expect(doc.text.blocks).toEqual([]);
    expect(doc.limitations.some((l) => l.includes("failed"))).toBe(true);
  });

  it("always states that semantic vision is unavailable in this build", async () => {
    const doc = await runAnalysis(request(), deps());
    expect(doc.limitations).toContain(SEMANTIC_VISION_UNAVAILABLE_REASON);
    expect(doc.scene.shortDescription).toBeUndefined();
  });

  it("uses a semantic engine when one is supplied", async () => {
    const semantic: SemanticVisionEngine = {
      id: "test-model",
      async initialize() {},
      async analyze() {
        return { shortCaption: "A settings page." };
      },
      async dispose() {},
    };
    const doc = await runAnalysis(
      request(),
      deps({ semantic, semanticStatus: { available: true, reason: "" } }),
    );
    expect(doc.scene.shortDescription).toBe("A settings page.");
    expect(doc.limitations).not.toContain(SEMANTIC_VISION_UNAVAILABLE_REASON);
  });

  it("keeps a semantic failure from failing the whole run", async () => {
    const semantic: SemanticVisionEngine = {
      id: "test-model",
      async initialize() {
        throw new Error("model missing");
      },
      async analyze() {
        return {};
      },
      async dispose() {},
    };
    const doc = await runAnalysis(request(), deps({ semantic }));
    expect(doc.text.blocks.length).toBeGreaterThan(0);
    expect(doc.scene.shortDescription).toBeUndefined();
  });

  it("delegates the merge when an off-thread builder is supplied", async () => {
    const buildDocument = vi.fn(buildDocumentInline);
    await runAnalysis(request(), deps({ buildDocument }));
    expect(buildDocument).toHaveBeenCalledTimes(1);
  });
});

describe("cancellation", () => {
  it("rejects immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runAnalysis(request(), deps(), { signal: controller.signal }),
    ).rejects.toBeInstanceOf(AnalysisCancelledError);
  });

  it("never resolves with a stale document once cancelled mid-run", async () => {
    const controller = new AbortController();
    const engine = fakeOcr({ delayMs: 30 });
    const promise = runAnalysis(request(), deps({ ocr: engine }), {
      signal: controller.signal,
    });
    // Abort while the OCR pass is still in flight.
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AnalysisCancelledError);
  });

  it("stops before the merge when cancelled after OCR completes", async () => {
    const controller = new AbortController();
    const buildDocument = vi.fn(async () => {
      controller.abort();
      return buildDocumentInline({
        source: sourceMeta(),
        signalImage: null,
        ocr: { status: "ok", blocks: [], fullText: "" },
        semantic: null,
        semanticStatus,
        mode: "balanced",
        runtime: "wasm",
      });
    });
    await expect(
      runAnalysis(request(), deps({ buildDocument }), {
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AnalysisCancelledError);
  });

  it("does not report a completed stage after cancellation", async () => {
    const controller = new AbortController();
    const progress: string[] = [];
    const promise = runAnalysis(
      request(),
      deps({ ocr: fakeOcr({ delayMs: 20 }) }),
      {
        signal: controller.signal,
        onProgress: (p) => progress.push(p.stage),
      },
    );
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AnalysisCancelledError);
    expect(progress).not.toContain("done");
  });
});

describe("buildDocumentInline", () => {
  it("runs the pixel pass and the merge together", () => {
    const doc = buildDocumentInline({
      source: sourceMeta(),
      signalImage: noisyPixels(32, 32),
      ocr: { status: "ok", blocks: SCREENSHOT_BLOCKS, fullText: "Settings" },
      semantic: null,
      semanticStatus,
      mode: "fast",
      runtime: "minimal",
    });
    expect(doc.classification.signals.entropy).toBeGreaterThan(0);
    expect(doc.processing.mode).toBe("fast");
  });

  it("copes with no pixel buffer at all", () => {
    const doc = buildDocumentInline({
      source: sourceMeta(),
      signalImage: null,
      ocr: { status: "ok", blocks: SCREENSHOT_BLOCKS, fullText: "Settings" },
      semantic: null,
      semanticStatus,
      mode: "fast",
      runtime: "minimal",
    });
    expect(doc.classification.kind).toBe("unknown");
  });
});
