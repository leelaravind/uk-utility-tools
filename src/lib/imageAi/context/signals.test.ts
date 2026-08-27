import { describe, expect, it } from "vitest";

import { block, box, makePixels, noisyPixels } from "./fixtures";
import {
  buildClassificationSignals,
  computePixelSignals,
  estimateRectangles,
  textDensityFromBlocks,
} from "./signals";

const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];

describe("computePixelSignals", () => {
  it("reports a flat image as flat, low-entropy and edge-free", () => {
    const signals = computePixelSignals(makePixels(64, 64, () => WHITE));
    expect(signals.flatRegionRatio).toBe(1);
    expect(signals.edgeDensity).toBe(0);
    expect(signals.entropy).toBe(0);
    expect(signals.rectangleCount).toBe(0);
    expect(signals.contrast).toBe(0);
  });

  it("reports photographic noise as high-entropy and not flat", () => {
    const signals = computePixelSignals(noisyPixels(64, 64));
    expect(signals.entropy).toBeGreaterThan(0.8);
    expect(signals.edgeDensity).toBeGreaterThan(0.5);
    expect(signals.flatRegionRatio).toBeLessThan(0.2);
  });

  it("finds the straight lines of a drawn rectangle", () => {
    // A hollow rectangle: two long horizontal strokes, two long vertical.
    const signals = computePixelSignals(
      makePixels(64, 64, (x, y) => {
        const onBorder =
          (y === 8 || y === 55) && x >= 8 && x <= 55
            ? true
            : (x === 8 || x === 55) && y >= 8 && y <= 55;
        return onBorder ? BLACK : WHITE;
      }),
    );
    expect(signals.horizontalLines).toBeGreaterThanOrEqual(2);
    expect(signals.verticalLines).toBeGreaterThanOrEqual(2);
    expect(signals.rectangleCount).toBeGreaterThanOrEqual(4);
  });

  it("does not mistake a horizontally striped page for rectangles", () => {
    // Horizontal rules with no vertical strokes: a document, not a UI.
    const signals = computePixelSignals(
      makePixels(64, 64, (_, y) => (y % 8 === 0 ? BLACK : WHITE)),
    );
    expect(signals.horizontalLines).toBeGreaterThan(4);
    expect(signals.verticalLines).toBe(0);
    expect(signals.rectangleCount).toBe(0);
  });

  it("detects transparency", () => {
    expect(
      computePixelSignals(makePixels(8, 8, () => [255, 255, 255, 0]))
        .hasTransparency,
    ).toBe(true);
    expect(
      computePixelSignals(makePixels(8, 8, () => WHITE)).hasTransparency,
    ).toBe(false);
  });

  it("reports mean luminance", () => {
    expect(
      computePixelSignals(makePixels(8, 8, () => BLACK)).meanLuminance,
    ).toBe(0);
    expect(
      computePixelSignals(makePixels(8, 8, () => WHITE)).meanLuminance,
    ).toBeCloseTo(1, 2);
  });

  it("returns zeroed signals for an unusable buffer instead of throwing", () => {
    const signals = computePixelSignals({
      data: new Uint8ClampedArray(4),
      width: 100,
      height: 100,
    });
    expect(signals.entropy).toBe(0);
    expect(signals.rectangleCount).toBe(0);
  });

  it("is deterministic", () => {
    const pixels = noisyPixels(32, 32);
    expect(computePixelSignals(pixels)).toEqual(computePixelSignals(pixels));
  });
});

describe("estimateRectangles", () => {
  it("needs both axes to claim a rectangle", () => {
    expect(estimateRectangles(20, 0)).toBe(0);
    expect(estimateRectangles(0, 20)).toBe(0);
    expect(estimateRectangles(6, 10)).toBe(12);
  });
});

describe("textDensityFromBlocks", () => {
  it("sums block areas and caps at the whole image", () => {
    expect(
      textDensityFromBlocks([
        block("a", "x", box(0, 0, 0.5, 0.2)),
        block("b", "y", box(0, 0.5, 0.5, 0.2)),
      ]),
    ).toBeCloseTo(0.2, 5);
    expect(
      textDensityFromBlocks([
        block("a", "x", box(0, 0, 1, 1)),
        block("b", "y", box(0, 0, 1, 1)),
      ]),
    ).toBe(1);
  });

  it("ignores blocks without geometry", () => {
    expect(textDensityFromBlocks([block("a", "x")])).toBe(0);
  });
});

describe("buildClassificationSignals", () => {
  it("combines pixel statistics with OCR geometry", () => {
    const pixel = computePixelSignals(noisyPixels(32, 32));
    const signals = buildClassificationSignals(
      pixel,
      [block("a", "hello", box(0, 0, 0.4, 0.1))],
      1920,
      1080,
    );
    expect(signals.textDensity).toBeCloseTo(0.04, 5);
    expect(signals.entropy).toBe(pixel.entropy);
    expect(signals.textBlockCount).toBe(1);
    expect(signals.aspectRatio).toBeCloseTo(1.778, 3);
  });

  it("produces a well-formed signal set with no pixel pass", () => {
    const signals = buildClassificationSignals(null, [], 100, 100);
    expect(signals).toMatchObject({
      textDensity: 0,
      edgeDensity: 0,
      rectangleCount: 0,
      flatRegionRatio: 0,
      entropy: 0,
      textBlockCount: 0,
    });
  });
});
