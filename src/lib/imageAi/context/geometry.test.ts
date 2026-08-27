import { describe, expect, it } from "vitest";

import {
  boxIou,
  boxToArray,
  clamp01,
  describePosition,
  fitWithin,
  normalizeBox,
  roundConfidence,
  roundCoord,
  roundTo,
  verticalOverlapRatio,
} from "./geometry";
import { box } from "./fixtures";

describe("clamp01", () => {
  it("clamps to the unit range and neutralises non-finite input", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("roundTo", () => {
  it("rounds to the requested precision", () => {
    expect(roundTo(0.123456, 3)).toBe(0.123);
    expect(roundTo(0.987654, 2)).toBe(0.99);
  });

  it("never produces negative zero, which would break byte-identical output", () => {
    expect(Object.is(roundTo(-0.0001, 2), 0)).toBe(true);
  });

  it("maps non-finite values to zero", () => {
    expect(roundTo(Number.NaN, 2)).toBe(0);
  });
});

describe("roundCoord / roundConfidence", () => {
  it("uses 3 decimals for coordinates and 2 for confidence", () => {
    expect(roundCoord(0.1234567)).toBe(0.123);
    expect(roundConfidence(0.9876)).toBe(0.99);
  });

  it("clamps confidence into the unit range", () => {
    expect(roundConfidence(1.4)).toBe(1);
    expect(roundConfidence(-0.2)).toBe(0);
  });
});

describe("normalizeBox", () => {
  it("converts pixel coordinates to a normalised top-left box", () => {
    const result = normalizeBox({ x0: 100, y0: 50, x1: 300, y1: 150 }, 1000, 500);
    expect(result).toEqual({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 });
  });

  it("clamps a box that overflows the image bounds", () => {
    const result = normalizeBox({ x0: -20, y0: -10, x1: 1200, y1: 600 }, 1000, 500);
    expect(result).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it("accepts reversed corners", () => {
    const result = normalizeBox({ x0: 300, y0: 150, x1: 100, y1: 50 }, 1000, 500);
    expect(result).toEqual({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 });
  });

  it("returns undefined for unusable geometry rather than a fake box", () => {
    expect(normalizeBox({ x0: 0, y0: 0, x1: 0, y1: 0 }, 1000, 500)).toBeUndefined();
    expect(normalizeBox({ x0: 0, y0: 0, x1: 10, y1: 10 }, 0, 500)).toBeUndefined();
    expect(
      normalizeBox({ x0: Number.NaN, y0: 0, x1: 10, y1: 10 }, 100, 100),
    ).toBeUndefined();
  });

  it("rounds to 3 decimals", () => {
    const result = normalizeBox({ x0: 1, y0: 1, x1: 2, y1: 2 }, 3, 3);
    expect(result).toEqual({ x: 0.333, y: 0.333, width: 0.333, height: 0.333 });
  });
});

describe("boxToArray", () => {
  it("emits [x, y, width, height] rounded to 3 decimals", () => {
    expect(boxToArray(box(0.12345, 0.5, 0.25, 0.1))).toEqual([
      0.123, 0.5, 0.25, 0.1,
    ]);
  });
});

describe("boxIou", () => {
  it("is 1 for identical boxes and 0 for disjoint ones", () => {
    const a = box(0.1, 0.1, 0.2, 0.2);
    expect(boxIou(a, a)).toBeCloseTo(1);
    expect(boxIou(a, box(0.8, 0.8, 0.1, 0.1))).toBe(0);
  });

  it("measures partial overlap", () => {
    // Two unit-quarter boxes overlapping on half of each axis.
    const iou = boxIou(box(0, 0, 0.2, 0.2), box(0.1, 0.1, 0.2, 0.2));
    expect(iou).toBeCloseTo(0.01 / (0.04 + 0.04 - 0.01), 5);
  });
});

describe("verticalOverlapRatio", () => {
  it("reports overlap as a fraction of the shorter box", () => {
    expect(
      verticalOverlapRatio(box(0, 0, 0.1, 0.1), box(0.5, 0.05, 0.1, 0.2)),
    ).toBeCloseTo(0.5);
    expect(
      verticalOverlapRatio(box(0, 0, 0.1, 0.1), box(0, 0.5, 0.1, 0.1)),
    ).toBe(0);
  });
});

describe("describePosition", () => {
  it("names the third of the image a box sits in", () => {
    expect(describePosition(box(0.4, 0.4, 0.2, 0.2))).toBe("center");
    expect(describePosition(box(0, 0, 0.1, 0.1))).toBe("top-left");
    expect(describePosition(box(0.9, 0.9, 0.1, 0.1))).toBe("bottom-right");
    expect(describePosition(box(0.7, 0.45, 0.1, 0.1))).toBe("center-right");
  });
});

describe("fitWithin", () => {
  it("scales down to the longest edge and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 2000, 1600)).toEqual({
      width: 1600,
      height: 800,
      scale: 0.4,
    });
  });

  it("leaves a smaller image untouched", () => {
    expect(fitWithin(100, 50, 1600)).toEqual({
      width: 100,
      height: 50,
      scale: 1,
    });
  });

  it("never returns a zero dimension", () => {
    const result = fitWithin(10_000, 1, 100);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});
