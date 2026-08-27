/**
 * Runtime capability detection and tier selection.
 *
 * Two rules govern this module:
 *
 *  1. FEATURE DETECTION ONLY. There is no user-agent parsing anywhere. Browser
 *     strings lie, are spoofed, and change; the presence of `navigator.gpu` or
 *     `WebAssembly` does not.
 *  2. INJECTABLE. `detectCapabilities` reads a plain object of globals rather
 *     than reaching for `globalThis` directly, so every branch is testable in
 *     a Node test runner without a DOM.
 *
 * A tier NEVER selects a remote service. The lowest tier degrades to local
 * heuristics only; there is no cloud path in this feature at all.
 */

import type { ProcessingRuntime } from "./types";

/** Capabilities that materially change what local analysis can run. */
export interface RuntimeCapabilities {
  webgpu: boolean;
  webWorkers: boolean;
  offscreenCanvas: boolean;
  wasm: boolean;
  wasmThreads: boolean;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  secureContext: boolean;
}

/**
 * Tier A — WebGPU available: the fastest local route, and the only tier where
 *          a GPU semantic-vision model could run if one were enabled.
 * Tier B — WebAssembly/CPU: local OCR plus heuristics.
 * Tier C — Minimal: no practical local inference; dimensions, metadata and
 *          layout heuristics only, with semantic and OCR analysis reported as
 *          unavailable rather than silently skipped.
 */
export type RuntimeTier = "A" | "B" | "C";

/**
 * The subset of global objects capability detection reads. Everything is
 * optional so tests can describe a browser by naming only what it has.
 */
export interface CapabilityGlobals {
  navigator?: {
    gpu?: unknown;
    hardwareConcurrency?: number;
    /** Chromium-only, coarse and rounded down. Treated as a hint, not a fact. */
    deviceMemory?: number;
  };
  Worker?: unknown;
  OffscreenCanvas?: unknown;
  WebAssembly?: unknown;
  SharedArrayBuffer?: unknown;
  isSecureContext?: boolean;
  crossOriginIsolated?: boolean;
  createImageBitmap?: unknown;
}

function present(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Read capabilities from the supplied globals. Defaults to the real runtime,
 * which in a Node test is simply "nothing available" — that is the correct
 * answer there, not a bug.
 */
export function detectCapabilities(
  globals: CapabilityGlobals = globalThis as CapabilityGlobals,
): RuntimeCapabilities {
  const nav = globals.navigator;
  const wasm = present(globals.WebAssembly);

  return {
    webgpu: present(nav?.gpu),
    webWorkers: typeof globals.Worker === "function",
    offscreenCanvas: typeof globals.OffscreenCanvas === "function",
    wasm,
    // Shared memory requires both SharedArrayBuffer and cross-origin isolation.
    // Reporting threads without isolation would promise speed we cannot use.
    wasmThreads:
      wasm &&
      present(globals.SharedArrayBuffer) &&
      globals.crossOriginIsolated === true,
    hardwareConcurrency: positiveNumber(nav?.hardwareConcurrency),
    deviceMemoryGb: positiveNumber(nav?.deviceMemory),
    secureContext: globals.isSecureContext === true,
  };
}

/** Below this reported memory we refuse to promise CPU inference. */
export const LOW_MEMORY_GB = 1;

/**
 * Pick the tier. Deliberately conservative: when a capability is merely
 * unknown we assume it is missing, because over-promising produces a crash
 * mid-analysis while under-promising only produces a slower, honest result.
 */
export function selectTier(caps: RuntimeCapabilities): RuntimeTier {
  const memoryOk =
    caps.deviceMemoryGb === undefined || caps.deviceMemoryGb >= LOW_MEMORY_GB;

  if (!caps.wasm || !memoryOk) return "C";
  // WebGPU is a secure-context API; without a secure context the entry point
  // may exist but is unusable, so it does not earn tier A.
  if (caps.webgpu && caps.secureContext && caps.webWorkers) return "A";
  return "B";
}

/** Map a tier onto the runtime label recorded in the analysis document. */
export function tierRuntime(tier: RuntimeTier): ProcessingRuntime {
  if (tier === "A") return "webgpu";
  if (tier === "B") return "wasm";
  return "minimal";
}

/** Short label for the runtime indicator in the UI. */
export function tierLabel(tier: RuntimeTier): string {
  if (tier === "A") return "WebGPU";
  if (tier === "B") return "Local CPU";
  return "Minimal";
}

/** One honest sentence about what this tier can actually do. */
export function tierDescription(tier: RuntimeTier): string {
  if (tier === "A") {
    return "Your browser exposes WebGPU, so local analysis can use the GPU where a model supports it.";
  }
  if (tier === "B") {
    return "Local analysis runs on your CPU through WebAssembly. It works everywhere, just more slowly than a GPU.";
  }
  return "This browser cannot run local inference, so the tool reports image facts and layout heuristics only.";
}

/** Whether local OCR can be attempted at all on this tier. */
export function canRunOcr(caps: RuntimeCapabilities): boolean {
  return caps.wasm;
}

/**
 * Whether analysis can be moved off the main thread. When false the pipeline
 * still runs — it just runs in the page, which is why the pure pipeline never
 * assumes a worker exists.
 */
export function canUseWorker(caps: RuntimeCapabilities): boolean {
  return caps.webWorkers;
}

/** Rows for the capability disclosure in the UI. Order is stable. */
export function capabilityRows(
  caps: RuntimeCapabilities,
): Array<{ label: string; value: string }> {
  const yesNo = (b: boolean) => (b ? "Available" : "Not available");
  return [
    { label: "WebGPU", value: yesNo(caps.webgpu) },
    { label: "Web Workers", value: yesNo(caps.webWorkers) },
    { label: "OffscreenCanvas", value: yesNo(caps.offscreenCanvas) },
    { label: "WebAssembly", value: yesNo(caps.wasm) },
    { label: "WebAssembly threads", value: yesNo(caps.wasmThreads) },
    { label: "Secure context", value: yesNo(caps.secureContext) },
    {
      label: "CPU cores reported",
      value:
        caps.hardwareConcurrency === undefined
          ? "Not reported"
          : String(caps.hardwareConcurrency),
    },
    {
      label: "Device memory reported",
      value:
        caps.deviceMemoryGb === undefined
          ? "Not reported"
          : `${caps.deviceMemoryGb} GB`,
    },
  ];
}
