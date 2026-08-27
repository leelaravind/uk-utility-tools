import { describe, expect, it } from "vitest";

import {
  CLAUDE_HIGH_RESOLUTION_PROFILE,
  CLAUDE_STANDARD_PROFILE,
  OPENAI_PROFILE,
} from "@/config/imageProviders";

import {
  DEFAULT_MARGIN_OPTIONS,
  FULL_RECT,
  applyCrop,
  clampNormalisedRect,
  clampPixelRect,
  cropTokenImpact,
  describeCrop,
  detectUniformMargins,
  isFullRect,
  samplerFromRgba,
  toNormalisedRect,
  toPixelRect,
  type PixelSampler,
  type Rgba,
} from "./crop";

const HIGH = CLAUDE_HIGH_RESOLUTION_PROFILE;
const STANDARD = CLAUDE_STANDARD_PROFILE;

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/* ------------------------------------------------------------------ */
/* Synthetic samplers                                                  */
/* ------------------------------------------------------------------ */

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Solid content block on a solid background. */
function boxedSampler(
  content: Box,
  background: Rgba = WHITE,
  foreground: Rgba = BLACK,
): PixelSampler {
  return (x, y) => {
    const inside =
      x >= content.x &&
      x < content.x + content.width &&
      y >= content.y &&
      y < content.y + content.height;
    return inside ? foreground : background;
  };
}

function uniformSampler(colour: Rgba = WHITE): PixelSampler {
  return () => colour;
}

/** Deterministic pseudo-random noise — no Math.random in tests. */
function noiseSampler(seed = 1): PixelSampler {
  return (x, y) => {
    let h = (x * 374_761_393 + y * 668_265_263 + seed * 69_069) >>> 0;
    h = ((h ^ (h >>> 13)) * 1_274_126_177) >>> 0;
    return {
      r: h % 256,
      g: (h >>> 8) % 256,
      b: (h >>> 16) % 256,
      a: 255,
    };
  };
}

/** Smooth left-to-right gradient — no two columns share a colour. */
function gradientSampler(width: number): PixelSampler {
  return (x) => {
    const value = Math.round((x / Math.max(1, width - 1)) * 255);
    return { r: value, g: value, b: value, a: 255 };
  };
}

/** Every content pixel of a box sampler, for "did we keep it all?" checks. */
function contentIsInside(box: Box, crop: Box): boolean {
  return (
    crop.x <= box.x &&
    crop.y <= box.y &&
    crop.x + crop.width >= box.x + box.width &&
    crop.y + crop.height >= box.y + box.height
  );
}

/* ------------------------------------------------------------------ */
/* Rect conversions                                                    */
/* ------------------------------------------------------------------ */

describe("rect conversion", () => {
  it("round-trips a pixel rect through normalised space", () => {
    const pixels = { x: 100, y: 50, width: 400, height: 300 };
    const normalised = toNormalisedRect(pixels, 1000, 800);
    expect(toPixelRect(normalised, 1000, 800)).toEqual(pixels);
  });

  it("converts the full rect to the whole image", () => {
    expect(toPixelRect(FULL_RECT, 640, 480)).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
  });

  it("clamps a rect that runs off the right and bottom edges", () => {
    const clamped = toPixelRect(
      { x: 0.8, y: 0.9, width: 0.5, height: 0.5 },
      1000,
      1000,
    );
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1000);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(1000);
  });

  it("clamps negative and non-finite values", () => {
    expect(
      clampNormalisedRect({ x: -1, y: -1, width: 5, height: 5 }),
    ).toEqual(FULL_RECT);
    expect(
      clampNormalisedRect({
        x: Number.NaN,
        y: Number.NaN,
        width: Number.NaN,
        height: Number.NaN,
      }),
    ).toEqual(FULL_RECT);
  });

  it("never produces a zero-sized pixel rect", () => {
    const tiny = toPixelRect({ x: 0, y: 0, width: 0, height: 0 }, 100, 100);
    expect(tiny.width).toBe(1);
    expect(tiny.height).toBe(1);
    const offEdge = clampPixelRect({ x: 500, y: 500, width: 10, height: 10 }, 100, 100);
    expect(offEdge).toEqual({ x: 99, y: 99, width: 1, height: 1 });
  });

  it("recognises the identity crop", () => {
    expect(isFullRect(FULL_RECT)).toBe(true);
    expect(isFullRect({ x: 0, y: 0, width: 0.9999, height: 1 })).toBe(true);
    expect(isFullRect({ x: 0, y: 0, width: 0.9, height: 1 })).toBe(false);
    expect(isFullRect({ x: 0.1, y: 0, width: 0.9, height: 1 })).toBe(false);
  });

  it("applies a crop to real pixels", () => {
    expect(applyCrop({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 800, 600)).toEqual(
      { x: 200, y: 150, width: 400, height: 300 },
    );
  });

  it("describes a crop in words", () => {
    expect(
      describeCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.5 }, 2000, 1600),
    ).toBe("1,600 × 800 px from 2,000 × 1,600 px (40% of the area)");
  });
});

/* ------------------------------------------------------------------ */
/* Margin detection                                                    */
/* ------------------------------------------------------------------ */

describe("detectUniformMargins", () => {
  it("trims white margins without touching the content", () => {
    const content = { x: 40, y: 50, width: 120, height: 100 };
    const rect = detectUniformMargins(boxedSampler(content), 200, 200);
    expect(rect).not.toBeNull();

    const crop = applyCrop(rect!, 200, 200);
    expect(contentIsInside(content, crop)).toBe(true);
    // It has to actually be a saving, not a token gesture.
    expect(crop.width).toBeLessThan(200);
    expect(crop.height).toBeLessThan(200);
    expect(crop.width * crop.height).toBeLessThan(200 * 200 * 0.5);
  });

  it("pads the crop outwards rather than shaving the content", () => {
    const content = { x: 40, y: 50, width: 120, height: 100 };
    const crop = applyCrop(detectUniformMargins(boxedSampler(content), 200, 200)!, 200, 200);
    expect(crop.x).toBeLessThan(content.x);
    expect(crop.y).toBeLessThan(content.y);
    expect(crop.x + crop.width).toBeGreaterThan(content.x + content.width);
    expect(crop.y + crop.height).toBeGreaterThan(content.y + content.height);
  });

  it("leaves a side alone when its content runs to the edge", () => {
    // Content reaches the right-hand edge (but not the corners), so only the
    // left, top and bottom have anything to trim.
    const content = { x: 60, y: 20, width: 140, height: 160 };
    const crop = applyCrop(detectUniformMargins(boxedSampler(content), 200, 200)!, 200, 200);
    expect(contentIsInside(content, crop)).toBe(true);
    expect(crop.x + crop.width).toBe(200);
    expect(crop.x).toBeGreaterThan(0);
    expect(crop.y).toBeGreaterThan(0);
  });

  it("refuses when content reaches a corner and there is no background colour", () => {
    // A corner pixel that is content means the four corners disagree, so
    // there is no single background to trim — better to say nothing.
    const content = { x: 60, y: 0, width: 140, height: 200 };
    expect(detectUniformMargins(boxedSampler(content), 200, 200)).toBeNull();
  });

  it("returns null when the content fills the frame", () => {
    const full = { x: 0, y: 0, width: 200, height: 200 };
    expect(detectUniformMargins(boxedSampler(full), 200, 200)).toBeNull();
  });

  it("returns null for a fully uniform image rather than cropping it away", () => {
    expect(detectUniformMargins(uniformSampler(WHITE), 200, 200)).toBeNull();
    expect(detectUniformMargins(uniformSampler(BLACK), 400, 300)).toBeNull();
    expect(detectUniformMargins(uniformSampler(TRANSPARENT), 200, 200)).toBeNull();
  });

  it("returns null for a noisy image", () => {
    expect(detectUniformMargins(noiseSampler(), 200, 200)).toBeNull();
    expect(detectUniformMargins(noiseSampler(7), 512, 384)).toBeNull();
  });

  it("returns null for a gradient", () => {
    expect(detectUniformMargins(gradientSampler(200), 200, 200)).toBeNull();
  });

  it("returns null for an image too small to scan", () => {
    expect(detectUniformMargins(boxedSampler({ x: 2, y: 2, width: 2, height: 2 }), 6, 6)).toBeNull();
  });

  it("trims a transparent border around opaque content", () => {
    const content = { x: 30, y: 30, width: 140, height: 140 };
    const sampler = boxedSampler(content, TRANSPARENT, BLACK);
    const crop = applyCrop(detectUniformMargins(sampler, 200, 200)!, 200, 200);
    expect(contentIsInside(content, crop)).toBe(true);
    expect(crop.width).toBeLessThan(200);
  });

  it("never removes more than maxTrimFraction of a side", () => {
    // Content is a tiny dot in the middle: an unbounded trim would take ~90%.
    const content = { x: 95, y: 95, width: 10, height: 10 };
    const crop = applyCrop(
      detectUniformMargins(boxedSampler(content), 200, 200)!,
      200,
      200,
    );
    const maxTrim = Math.floor(200 * DEFAULT_MARGIN_OPTIONS.maxTrimFraction);
    expect(crop.x).toBeLessThanOrEqual(maxTrim);
    expect(200 - (crop.x + crop.width)).toBeLessThanOrEqual(maxTrim);
    expect(contentIsInside(content, crop)).toBe(true);
  });

  it("respects a tightened maxTrimFraction", () => {
    const content = { x: 40, y: 50, width: 120, height: 100 };
    const crop = applyCrop(
      detectUniformMargins(boxedSampler(content), 200, 200, {
        maxTrimFraction: 0.05,
      })!,
      200,
      200,
    );
    expect(crop.x).toBeLessThanOrEqual(10);
    expect(contentIsInside(content, crop)).toBe(true);
  });

  it("refuses when the corners disagree about the background", () => {
    const sampler: PixelSampler = (x, y) =>
      x < 100 && y < 100 ? WHITE : BLACK;
    expect(detectUniformMargins(sampler, 200, 200)).toBeNull();
  });

  it("tolerates mild sensor noise in the margin", () => {
    const content = { x: 40, y: 50, width: 120, height: 100 };
    const clean = boxedSampler(content);
    const noisy: PixelSampler = (x, y) => {
      const base = clean(x, y);
      if (base === BLACK) return base;
      const jitter = ((x * 31 + y * 17) % 7) - 3; // -3..+3, inside tolerance
      return { r: 255 + jitter, g: 255 + jitter, b: 255 + jitter, a: 255 };
    };
    const rect = detectUniformMargins(noisy, 200, 200);
    expect(rect).not.toBeNull();
    expect(contentIsInside(content, applyCrop(rect!, 200, 200))).toBe(true);
  });

  it("refuses when the margin colour drifts past the tolerance", () => {
    const content = { x: 40, y: 50, width: 120, height: 100 };
    const clean = boxedSampler(content);
    const drifting: PixelSampler = (x, y) => {
      const base = clean(x, y);
      if (base === BLACK) return base;
      const shade = 255 - Math.round((x / 199) * 120); // corners differ by 120
      return { r: shade, g: shade, b: shade, a: 255 };
    };
    expect(detectUniformMargins(drifting, 200, 200)).toBeNull();
  });

  it("scales to a large image", () => {
    const content = { x: 400, y: 300, width: 1200, height: 900 };
    const crop = applyCrop(
      detectUniformMargins(boxedSampler(content), 2000, 1500)!,
      2000,
      1500,
    );
    expect(contentIsInside(content, crop)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Sampler over raw RGBA bytes                                         */
/* ------------------------------------------------------------------ */

describe("samplerFromRgba", () => {
  it("reads pixels out of a flat RGBA buffer", () => {
    const width = 4;
    const height = 2;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      data[i * 4] = i;
      data[i * 4 + 1] = i + 1;
      data[i * 4 + 2] = i + 2;
      data[i * 4 + 3] = 255;
    }
    const sampler = samplerFromRgba(data, width, height);
    expect(sampler(0, 0)).toEqual({ r: 0, g: 1, b: 2, a: 255 });
    expect(sampler(1, 1)).toEqual({ r: 5, g: 6, b: 7, a: 255 });
  });

  it("clamps out-of-range coordinates instead of reading rubbish", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4]);
    const sampler = samplerFromRgba(data, 1, 1);
    expect(sampler(-10, -10)).toEqual({ r: 1, g: 2, b: 3, a: 4 });
    expect(sampler(99, 99)).toEqual({ r: 1, g: 2, b: 3, a: 4 });
  });

  it("feeds detection end to end", () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 30; y < 70; y += 1) {
      for (let x = 25; x < 75; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }
    const rect = detectUniformMargins(
      samplerFromRgba(data, width, height),
      width,
      height,
    );
    expect(rect).not.toBeNull();
    expect(
      contentIsInside(
        { x: 25, y: 30, width: 50, height: 40 },
        applyCrop(rect!, width, height),
      ),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Token impact of a crop                                              */
/* ------------------------------------------------------------------ */

describe("cropTokenImpact", () => {
  it("reports no change for the identity crop", () => {
    const impact = cropTokenImpact(1600, 1200, FULL_RECT, HIGH);
    expect(impact).toMatchObject({ width: 1600, height: 1200 });
    expect(impact.tokenReduction).toBe(0);
    expect(impact.tokenReductionPercent).toBe(0);
  });

  it("reports a real saving when the crop shrinks what the provider sees", () => {
    const impact = cropTokenImpact(
      1600,
      1200,
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      HIGH,
    );
    expect(impact).toMatchObject({ width: 800, height: 600 });
    expect(impact.original?.visualTokens).toBe(2494);
    expect(impact.cropped?.visualTokens).toBe(638);
    expect(impact.tokenReduction).toBe(1856);
    expect(impact.tokenReductionPercent).toBe(74.4);
  });

  it("does not invent a saving when the provider downscales both anyway", () => {
    // Claude's standard tier resizes a 4K frame and a half-size crop of the
    // same shape to the same 1456x819, so a crop that only removes pixels the
    // model never saw is worth exactly nothing in tokens.
    const impact = cropTokenImpact(
      3840,
      2160,
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      STANDARD,
    );
    expect(impact).toMatchObject({ width: 1920, height: 1080 });
    expect(impact.tokenReduction).toBe(0);
    expect(impact.tokenReductionPercent).toBe(0);
    expect(impact.providerResizedOriginal).toBe(true);
    expect(impact.note).toContain("unchanged");
  });

  it("returns null (never zero) for a provider with no published rule", () => {
    const impact = cropTokenImpact(
      1600,
      1200,
      { x: 0, y: 0, width: 0.5, height: 0.5 },
      OPENAI_PROFILE,
    );
    expect(impact.tokenReduction).toBeNull();
    expect(impact.tokenReductionPercent).toBeNull();
    expect(impact.original).toBeNull();
    expect(impact.cropped).toBeNull();
    expect(impact.width).toBe(800);
  });

  it("handles a crop that changes the aspect ratio", () => {
    const impact = cropTokenImpact(
      2000,
      2000,
      { x: 0, y: 0.4, width: 1, height: 0.2 },
      HIGH,
    );
    expect(impact).toMatchObject({ width: 2000, height: 400 });
    expect(impact.tokenReduction as number).toBeGreaterThan(0);
  });
});
