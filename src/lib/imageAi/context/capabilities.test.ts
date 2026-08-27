import { describe, expect, it } from "vitest";

import {
  canRunOcr,
  canUseWorker,
  capabilityRows,
  detectCapabilities,
  selectTier,
  tierDescription,
  tierLabel,
  tierRuntime,
  type CapabilityGlobals,
} from "./capabilities";

/** A Chromium-like browser with everything available. */
const modernBrowser: CapabilityGlobals = {
  navigator: { gpu: {}, hardwareConcurrency: 8, deviceMemory: 8 },
  Worker: function Worker() {},
  OffscreenCanvas: function OffscreenCanvas() {},
  WebAssembly: {},
  SharedArrayBuffer: function SharedArrayBuffer() {},
  isSecureContext: true,
  crossOriginIsolated: true,
};

/** A browser with WebAssembly but no WebGPU — the common case. */
const cpuBrowser: CapabilityGlobals = {
  navigator: { hardwareConcurrency: 4 },
  Worker: function Worker() {},
  OffscreenCanvas: function OffscreenCanvas() {},
  WebAssembly: {},
  isSecureContext: true,
};

describe("detectCapabilities", () => {
  it("reads capabilities from the injected globals only", () => {
    const caps = detectCapabilities(modernBrowser);
    expect(caps).toEqual({
      webgpu: true,
      webWorkers: true,
      offscreenCanvas: true,
      wasm: true,
      wasmThreads: true,
      hardwareConcurrency: 8,
      deviceMemoryGb: 8,
      secureContext: true,
    });
  });

  it("reports everything missing for an empty environment", () => {
    const caps = detectCapabilities({});
    expect(caps.webgpu).toBe(false);
    expect(caps.wasm).toBe(false);
    expect(caps.secureContext).toBe(false);
    expect(caps.hardwareConcurrency).toBeUndefined();
    expect(caps.deviceMemoryGb).toBeUndefined();
  });

  it("does not claim WASM threads without cross-origin isolation", () => {
    const caps = detectCapabilities({
      WebAssembly: {},
      SharedArrayBuffer: function SharedArrayBuffer() {},
      crossOriginIsolated: false,
    });
    expect(caps.wasm).toBe(true);
    expect(caps.wasmThreads).toBe(false);
  });

  it("ignores nonsensical numeric hints", () => {
    const caps = detectCapabilities({
      navigator: { hardwareConcurrency: 0, deviceMemory: -1 },
    });
    expect(caps.hardwareConcurrency).toBeUndefined();
    expect(caps.deviceMemoryGb).toBeUndefined();
  });
});

describe("selectTier", () => {
  it("selects tier A only with WebGPU in a secure context", () => {
    expect(selectTier(detectCapabilities(modernBrowser))).toBe("A");
  });

  it("falls back to tier B without WebGPU", () => {
    expect(selectTier(detectCapabilities(cpuBrowser))).toBe("B");
  });

  it("refuses tier A when WebGPU exists but the context is insecure", () => {
    const caps = detectCapabilities({
      ...modernBrowser,
      isSecureContext: false,
    });
    expect(selectTier(caps)).toBe("B");
  });

  it("falls back to tier C without WebAssembly", () => {
    expect(selectTier(detectCapabilities({ Worker: function W() {} }))).toBe("C");
  });

  it("falls back to tier C on a device reporting very little memory", () => {
    const caps = detectCapabilities({
      ...modernBrowser,
      navigator: { gpu: {}, deviceMemory: 0.5 },
    });
    expect(caps.deviceMemoryGb).toBe(0.5);
    expect(selectTier(caps)).toBe("C");
  });

  it("does not punish a browser that simply does not report memory", () => {
    expect(selectTier(detectCapabilities(cpuBrowser))).toBe("B");
  });
});

describe("tier presentation", () => {
  it("maps tiers to runtimes recorded in the document", () => {
    expect(tierRuntime("A")).toBe("webgpu");
    expect(tierRuntime("B")).toBe("wasm");
    expect(tierRuntime("C")).toBe("minimal");
  });

  it("labels tiers for the runtime indicator", () => {
    expect(tierLabel("A")).toBe("WebGPU");
    expect(tierLabel("B")).toBe("Local CPU");
    expect(tierLabel("C")).toBe("Minimal");
  });

  it("describes every tier without promising remote processing", () => {
    for (const tier of ["A", "B", "C"] as const) {
      const description = tierDescription(tier);
      expect(description.length).toBeGreaterThan(20);
      expect(description.toLowerCase()).not.toContain("server");
      expect(description.toLowerCase()).not.toContain("cloud");
    }
  });
});

describe("feature gates", () => {
  it("allows OCR wherever WebAssembly exists", () => {
    expect(canRunOcr(detectCapabilities(cpuBrowser))).toBe(true);
    expect(canRunOcr(detectCapabilities({}))).toBe(false);
  });

  it("reports worker availability separately from OCR", () => {
    expect(canUseWorker(detectCapabilities(cpuBrowser))).toBe(true);
    expect(canUseWorker(detectCapabilities({ WebAssembly: {} }))).toBe(false);
  });
});

describe("capabilityRows", () => {
  it("returns a stable, complete list for the disclosure panel", () => {
    const rows = capabilityRows(detectCapabilities(cpuBrowser));
    expect(rows.map((r) => r.label)).toEqual([
      "WebGPU",
      "Web Workers",
      "OffscreenCanvas",
      "WebAssembly",
      "WebAssembly threads",
      "Secure context",
      "CPU cores reported",
      "Device memory reported",
    ]);
    expect(rows[0].value).toBe("Not available");
    expect(rows[7].value).toBe("Not reported");
  });
});
