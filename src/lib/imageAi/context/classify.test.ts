import { describe, expect, it } from "vitest";

import { classifyImage, describeClassification, isTextCentric } from "./classify";
import type { ClassificationSignals } from "./types";

function signals(
  overrides: Partial<ClassificationSignals> = {},
): ClassificationSignals {
  return {
    textDensity: 0,
    edgeDensity: 0,
    rectangleCount: 0,
    flatRegionRatio: 0,
    entropy: 0,
    ...overrides,
  };
}

const PHOTO = signals({
  textDensity: 0.01,
  edgeDensity: 0.4,
  rectangleCount: 0,
  flatRegionRatio: 0.05,
  entropy: 0.9,
});

const SCREENSHOT = signals({
  textDensity: 0.35,
  edgeDensity: 0.3,
  rectangleCount: 25,
  flatRegionRatio: 0.55,
  entropy: 0.45,
});

const DOCUMENT = signals({
  textDensity: 0.6,
  edgeDensity: 0.15,
  rectangleCount: 2,
  flatRegionRatio: 0.75,
  entropy: 0.25,
});

const DIAGRAM = signals({
  textDensity: 0.08,
  edgeDensity: 0.45,
  rectangleCount: 12,
  flatRegionRatio: 0.7,
  entropy: 0.2,
});

describe("classifyImage", () => {
  it("identifies a photograph", () => {
    const result = classifyImage(PHOTO);
    expect(result.kind).toBe("photo");
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it("identifies a screenshot", () => {
    expect(classifyImage(SCREENSHOT).kind).toBe("screenshot");
  });

  it("identifies a document", () => {
    expect(classifyImage(DOCUMENT).kind).toBe("document");
  });

  it("identifies a diagram", () => {
    expect(classifyImage(DIAGRAM).kind).toBe("diagram");
  });

  it("never returns absolute certainty", () => {
    for (const input of [PHOTO, SCREENSHOT, DOCUMENT, DIAGRAM]) {
      const result = classifyImage(input);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    }
  });

  it("returns unknown for a blank image instead of guessing", () => {
    const result = classifyImage(
      signals({ flatRegionRatio: 1, entropy: 0 }),
    );
    expect(result.kind).toBe("unknown");
    expect(result.confidence).toBeLessThan(0.3);
  });

  it("returns unknown when no pixel pass ran at all", () => {
    // Tier C with text but no measurable visual evidence: a document and a
    // screenshot are indistinguishable, so neither is claimed.
    const result = classifyImage(signals({ textDensity: 0.4, textBlockCount: 12 }));
    expect(result.kind).toBe("unknown");
    expect(result.scores).toEqual({});
  });

  it("returns mixed when two kinds are close", () => {
    // A photographed page: document-like text with screenshot-like panels.
    const result = classifyImage(
      signals({
        textDensity: 0.5,
        edgeDensity: 0.2,
        rectangleCount: 8,
        flatRegionRatio: 0.7,
        entropy: 0.3,
      }),
    );
    expect(result.kind).toBe("mixed");
    expect(result.mixedOf).toBeDefined();
    expect(result.mixedOf).toContain("document");
    expect(result.mixedOf).toContain("screenshot");
  });

  it("echoes the signals it was given so the decision is auditable", () => {
    const result = classifyImage(SCREENSHOT);
    expect(result.signals).toEqual(SCREENSHOT);
    expect(result.scores.screenshot).toBeGreaterThan(0);
    expect(result.scores.photo).toBeLessThan(result.scores.screenshot ?? 0);
  });

  it("is deterministic", () => {
    expect(classifyImage(SCREENSHOT)).toEqual(classifyImage(SCREENSHOT));
  });

  it("survives non-finite signal values", () => {
    const result = classifyImage(
      signals({ textDensity: Number.NaN, entropy: Number.POSITIVE_INFINITY }),
    );
    expect(["photo", "screenshot", "document", "diagram", "mixed", "unknown"])
      .toContain(result.kind);
    expect(Number.isFinite(result.confidence)).toBe(true);
  });
});

describe("describeClassification", () => {
  it("hedges rather than asserting", () => {
    expect(describeClassification(classifyImage(PHOTO))).toMatch(/^Probably a photo/);
    expect(
      describeClassification(classifyImage(signals({ flatRegionRatio: 1 }))),
    ).toContain("not determined");
  });

  it("names both halves of a mixed result", () => {
    const mixed = classifyImage(
      signals({
        textDensity: 0.5,
        edgeDensity: 0.2,
        rectangleCount: 8,
        flatRegionRatio: 0.7,
        entropy: 0.3,
      }),
    );
    const text = describeClassification(mixed);
    expect(text).toContain("Mixed");
    expect(text).toContain("document");
  });
});

describe("isTextCentric", () => {
  it("treats screenshots, documents and mixed images as text-led", () => {
    expect(isTextCentric("screenshot")).toBe(true);
    expect(isTextCentric("document")).toBe(true);
    expect(isTextCentric("mixed")).toBe(true);
    expect(isTextCentric("photo")).toBe(false);
    expect(isTextCentric("diagram")).toBe(false);
  });
});
