/**
 * Mode 1 — Optimize Image: crop geometry and conservative margin detection.
 *
 * Crops are stored normalised (0-1) so they survive a change of preview size,
 * and converted to pixels only at the moment they are applied.
 *
 * `detectUniformMargins` is deliberately timid. Trimming a blank border is a
 * nice convenience; trimming a line of text off a screenshot is a bug the user
 * may not notice until the model gives a wrong answer. So it refuses whenever
 * it is not confident, pads whatever it does find, and can never eat more than
 * a set fraction of any side. It takes an injected sampler rather than a
 * canvas, which keeps it pure, testable in Node, and free of any DOM coupling.
 */

import type { EffectiveImage, VisionProviderProfile } from "@/config/imageProviders";

import { compareForProvider, type ProviderComparison } from "./optimize";

/* ------------------------------------------------------------------ *
 * Rect types and conversions                                          *
 * ------------------------------------------------------------------ */

/** A crop expressed as fractions of the image, each value in 0-1. */
export interface NormalisedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A crop in whole pixels. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The whole image — the identity crop. */
export const FULL_RECT: NormalisedRect = { x: 0, y: 0, width: 1, height: 1 };

function finite(n: number, fallback: number): number {
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Force a normalised rect inside the image: origin in 0-1, non-zero size, and
 * never extending past the right or bottom edge.
 */
export function clampNormalisedRect(rect: NormalisedRect): NormalisedRect {
  const x = clamp(finite(rect.x, 0), 0, 1);
  const y = clamp(finite(rect.y, 0), 0, 1);
  const width = clamp(finite(rect.width, 1), 0, 1 - x);
  const height = clamp(finite(rect.height, 1), 0, 1 - y);
  return { x, y, width, height };
}

/** Force a pixel rect inside a `width` x `height` image, minimum 1x1. */
export function clampPixelRect(
  rect: PixelRect,
  width: number,
  height: number,
): PixelRect {
  const w = Math.max(1, Math.round(finite(width, 1)));
  const h = Math.max(1, Math.round(finite(height, 1)));
  const x = clamp(Math.round(finite(rect.x, 0)), 0, w - 1);
  const y = clamp(Math.round(finite(rect.y, 0)), 0, h - 1);
  return {
    x,
    y,
    width: clamp(Math.round(finite(rect.width, w)), 1, w - x),
    height: clamp(Math.round(finite(rect.height, h)), 1, h - y),
  };
}

/** Normalised rect -> whole pixels, clamped to the image. */
export function toPixelRect(
  rect: NormalisedRect,
  width: number,
  height: number,
): PixelRect {
  const safe = clampNormalisedRect(rect);
  const w = Math.max(1, Math.round(finite(width, 1)));
  const h = Math.max(1, Math.round(finite(height, 1)));
  return clampPixelRect(
    {
      x: Math.round(safe.x * w),
      y: Math.round(safe.y * h),
      width: Math.round(safe.width * w),
      height: Math.round(safe.height * h),
    },
    w,
    h,
  );
}

/** Whole pixels -> normalised rect. */
export function toNormalisedRect(
  rect: PixelRect,
  width: number,
  height: number,
): NormalisedRect {
  const w = Math.max(1, Math.round(finite(width, 1)));
  const h = Math.max(1, Math.round(finite(height, 1)));
  const safe = clampPixelRect(rect, w, h);
  return clampNormalisedRect({
    x: safe.x / w,
    y: safe.y / h,
    width: safe.width / w,
    height: safe.height / h,
  });
}

const FULL_RECT_EPSILON = 0.0005;

/** True when a rect covers (essentially) the whole image. */
export function isFullRect(
  rect: NormalisedRect,
  epsilon = FULL_RECT_EPSILON,
): boolean {
  const safe = clampNormalisedRect(rect);
  return (
    safe.x <= epsilon &&
    safe.y <= epsilon &&
    safe.width >= 1 - epsilon &&
    safe.height >= 1 - epsilon
  );
}

/**
 * Resolve a normalised crop against a real image size. This is the single
 * place the source rectangle for a crop is worked out.
 */
export function applyCrop(
  rect: NormalisedRect,
  width: number,
  height: number,
): PixelRect {
  return toPixelRect(rect, width, height);
}

/** "1,200 × 800 px from 2,000 × 1,600 px (60% of the area)". */
export function describeCrop(
  rect: NormalisedRect,
  width: number,
  height: number,
): string {
  const pixels = applyCrop(rect, width, height);
  const areaPercent = Math.round(
    ((pixels.width * pixels.height) / (Math.max(1, width) * Math.max(1, height))) *
      100,
  );
  return (
    `${pixels.width.toLocaleString("en-GB")} × ${pixels.height.toLocaleString("en-GB")} px ` +
    `from ${Math.round(width).toLocaleString("en-GB")} × ${Math.round(height).toLocaleString("en-GB")} px ` +
    `(${areaPercent}% of the area)`
  );
}

/* ------------------------------------------------------------------ *
 * Margin detection                                                    *
 * ------------------------------------------------------------------ */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Reads one pixel. Injected so detection can be unit-tested without a canvas,
 * and so the caller decides whether to sample the full image or a cheap
 * downscaled copy.
 */
export type PixelSampler = (x: number, y: number) => Rgba;

export interface MarginDetectionOptions {
  /** Max per-channel difference (0-255) still counted as the same colour. */
  tolerance: number;
  /** Fraction of sampled pixels in a line that must match for it to be blank. */
  uniformityThreshold: number;
  /** Hard limit on how much of any one side may be trimmed. */
  maxTrimFraction: number;
  /** Refuse if the crop would keep less than this fraction of the area. */
  minRemainingFraction: number;
  /** How many pixels to sample along each scanned row or column. */
  samplesPerLine: number;
  /** Fraction of the shorter side kept as a safety margin around content. */
  paddingFraction: number;
  /** Minimum safety margin in pixels. */
  minPaddingPx: number;
}

export const DEFAULT_MARGIN_OPTIONS: MarginDetectionOptions = {
  tolerance: 10,
  uniformityThreshold: 0.99,
  maxTrimFraction: 0.35,
  minRemainingFraction: 0.05,
  // Generous enough that any image up to 512px on a side — which is what the
  // panel samples — is scanned pixel by pixel, so a one-pixel-wide line of
  // content cannot slip between samples and get trimmed away.
  samplesPerLine: 512,
  paddingFraction: 0.005,
  minPaddingPx: 2,
};

/** Smallest image worth scanning at all. */
const MIN_SCANNABLE_PX = 8;

/** Grid resolution for the "is the whole image blank?" guard. */
const UNIFORM_GRID = 24;

function sameColour(a: Rgba, b: Rgba, tolerance: number): boolean {
  // Fully transparent pixels are equal whatever their (premultiplied, and
  // therefore meaningless) colour channels happen to contain.
  if (a.a === 0 && b.a === 0) return true;
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance &&
    Math.abs(a.a - b.a) <= tolerance
  );
}

/** Evenly spread sample positions across 0..size-1, endpoints included. */
function samplePositions(size: number, count: number): number[] {
  const n = Math.max(1, Math.min(size, count));
  if (n === 1) return [0];
  const positions: number[] = [];
  for (let i = 0; i < n; i += 1) {
    positions.push(Math.round((i * (size - 1)) / (n - 1)));
  }
  return positions;
}

function lineIsBlank(
  positions: number[],
  reference: Rgba,
  opts: MarginDetectionOptions,
  read: (position: number) => Rgba,
): boolean {
  let matches = 0;
  for (const position of positions) {
    if (sameColour(read(position), reference, opts.tolerance)) matches += 1;
  }
  return matches / positions.length >= opts.uniformityThreshold;
}

/**
 * Find the blank border around an image's content, or `null` when it is not
 * safe to say.
 *
 * Returns `null` when:
 * - the image is too small to scan;
 * - the four corners are not the same colour (so there is no single background);
 * - the whole image is that colour (there is no content to keep);
 * - no border was found;
 * - the proposed crop would keep too little of the image.
 *
 * Whatever it does find is padded outwards, so the crop always errs towards
 * keeping content rather than removing it.
 */
export function detectUniformMargins(
  sampler: PixelSampler,
  width: number,
  height: number,
  options: Partial<MarginDetectionOptions> = {},
): NormalisedRect | null {
  const opts: MarginDetectionOptions = { ...DEFAULT_MARGIN_OPTIONS, ...options };
  const w = Math.round(finite(width, 0));
  const h = Math.round(finite(height, 0));
  if (w < MIN_SCANNABLE_PX || h < MIN_SCANNABLE_PX) return null;

  // 1. All four corners must agree on a background colour.
  const reference = sampler(0, 0);
  const corners = [
    sampler(w - 1, 0),
    sampler(0, h - 1),
    sampler(w - 1, h - 1),
  ];
  for (const corner of corners) {
    if (!sameColour(corner, reference, opts.tolerance)) return null;
  }

  // 2. If the whole image is that colour there is nothing to keep. This test
  //    is exact rather than proportional: a single differing grid sample is
  //    enough to mean "there is content here", which stops a small logo on a
  //    large canvas from being written off as an empty image.
  const gridX = samplePositions(w, UNIFORM_GRID);
  const gridY = samplePositions(h, UNIFORM_GRID);
  let allBackground = true;
  for (const y of gridY) {
    for (const x of gridX) {
      if (!sameColour(sampler(x, y), reference, opts.tolerance)) {
        allBackground = false;
        break;
      }
    }
    if (!allBackground) break;
  }
  if (allBackground) return null;

  // 3. Walk in from each side while the line is still background.
  const xs = samplePositions(w, opts.samplesPerLine);
  const ys = samplePositions(h, opts.samplesPerLine);
  const maxTrimX = Math.floor(w * opts.maxTrimFraction);
  const maxTrimY = Math.floor(h * opts.maxTrimFraction);

  const rowBlank = (y: number) =>
    lineIsBlank(xs, reference, opts, (x) => sampler(x, y));
  const columnBlank = (x: number) =>
    lineIsBlank(ys, reference, opts, (y) => sampler(x, y));

  let top = 0;
  while (top < maxTrimY && rowBlank(top)) top += 1;
  let bottom = 0;
  while (bottom < maxTrimY && rowBlank(h - 1 - bottom)) bottom += 1;
  let left = 0;
  while (left < maxTrimX && columnBlank(left)) left += 1;
  let right = 0;
  while (right < maxTrimX && columnBlank(w - 1 - right)) right += 1;

  if (top === 0 && bottom === 0 && left === 0 && right === 0) return null;

  // 4. Give the content some breathing room back.
  const padding = Math.max(
    opts.minPaddingPx,
    Math.round(Math.min(w, h) * opts.paddingFraction),
  );
  top = Math.max(0, top - padding);
  bottom = Math.max(0, bottom - padding);
  left = Math.max(0, left - padding);
  right = Math.max(0, right - padding);

  if (top === 0 && bottom === 0 && left === 0 && right === 0) return null;

  const cropWidth = w - left - right;
  const cropHeight = h - top - bottom;
  if (cropWidth < 1 || cropHeight < 1) return null;
  if ((cropWidth * cropHeight) / (w * h) < opts.minRemainingFraction) return null;

  return toNormalisedRect(
    { x: left, y: top, width: cropWidth, height: cropHeight },
    w,
    h,
  );
}

/**
 * Build a sampler over a flat RGBA byte array — the layout `getImageData`
 * returns. Kept here so the panel does not need any pixel arithmetic of its
 * own, and so the same code path is exercised by the tests.
 */
export function samplerFromRgba(
  data: ArrayLike<number>,
  width: number,
  height: number,
): PixelSampler {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return (x, y) => {
    const px = clamp(Math.round(x), 0, w - 1);
    const py = clamp(Math.round(y), 0, h - 1);
    const i = (py * w + px) * 4;
    return {
      r: data[i] ?? 0,
      g: data[i + 1] ?? 0,
      b: data[i + 2] ?? 0,
      a: data[i + 3] ?? 0,
    };
  };
}

/* ------------------------------------------------------------------ *
 * What a crop does to token usage                                     *
 * ------------------------------------------------------------------ */

export interface CropTokenImpact {
  /** Dimensions after the crop. */
  width: number;
  height: number;
  /** What the provider processes for the uncropped image. */
  original: EffectiveImage | null;
  /** What the provider processes for the cropped image. */
  cropped: EffectiveImage | null;
  /** Null when the provider publishes no rule — never a guess. */
  tokenReduction: number | null;
  tokenReductionPercent: number | null;
  providerResizedOriginal: boolean;
  note?: string;
}

/**
 * Crop -> new dimensions -> provider effective tokens.
 *
 * Both sides go through the provider's own resize first, so cropping an image
 * the provider was already going to shrink reports the real change and not an
 * imaginary one. Cropping a 4K screenshot down to its content can genuinely
 * cost the same number of tokens, and this says so.
 */
export function cropTokenImpact(
  sourceWidth: number,
  sourceHeight: number,
  rect: NormalisedRect,
  profile: VisionProviderProfile,
): CropTokenImpact {
  const pixels = applyCrop(rect, sourceWidth, sourceHeight);
  const comparison: ProviderComparison = compareForProvider(
    sourceWidth,
    sourceHeight,
    pixels.width,
    pixels.height,
    profile,
  );
  return {
    width: pixels.width,
    height: pixels.height,
    original: comparison.original,
    cropped: comparison.optimised,
    tokenReduction: comparison.tokenReduction,
    tokenReductionPercent: comparison.tokenReductionPercent,
    providerResizedOriginal: comparison.providerResizedOriginal,
    note: comparison.note,
  };
}
