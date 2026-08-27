/**
 * Cheap pixel statistics that feed the image-kind classifier.
 *
 * These run on a tiny copy of the image (256 px on the longest edge), so the
 * whole pass is a few hundred thousand integer operations — fast enough for a
 * low-end phone and small enough to transfer to a worker.
 *
 * The function takes a plain `{ data, width, height }` object rather than a
 * real `ImageData`, so it is testable in Node with a synthetic buffer and
 * usable in a worker without a DOM.
 */

import type { ClassificationSignals, NormalizedBBox, OCRBlock } from "./types";
import { clamp01, roundTo } from "./geometry";

/** RGBA pixel buffer, laid out exactly like `ImageData`. */
export interface PixelSource {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface PixelSignals {
  edgeDensity: number;
  flatRegionRatio: number;
  /** Shannon entropy of the luminance histogram, normalised to 0–1. */
  entropy: number;
  /** Estimated axis-aligned rectangles — see `estimateRectangles`. */
  rectangleCount: number;
  horizontalLines: number;
  verticalLines: number;
  /** True when any pixel is meaningfully transparent. */
  hasTransparency: boolean;
  /** Mean luminance 0–1, used to spot very dark or very washed-out images. */
  meanLuminance: number;
  /** Root-mean-square luminance contrast, 0–1. Low means low contrast. */
  contrast: number;
}

/** Luminance gradient above which two neighbouring pixels count as an edge. */
const EDGE_THRESHOLD = 24;

/** Luminance gradient below which a pixel counts as part of a flat region. */
const FLAT_THRESHOLD = 4;

/** A run must cover this fraction of the axis to count as a straight line. */
const LINE_RUN_FRACTION = 0.25;

/** Rows/columns closer together than this are treated as one thick line. */
const LINE_MERGE_GAP = 2;

const HISTOGRAM_BINS = 64;

/** ITU-R BT.601 luma. Integer maths keeps this identical across engines. */
function luma(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function toLuminance(src: PixelSource): {
  lum: Float32Array;
  hasTransparency: boolean;
} {
  const { data, width, height } = src;
  const lum = new Float32Array(width * height);
  let hasTransparency = false;
  for (let i = 0, p = 0; p < width * height; i += 4, p += 1) {
    const alpha = data[i + 3];
    if (alpha < 250) hasTransparency = true;
    lum[p] = luma(data[i], data[i + 1], data[i + 2]);
  }
  return { lum, hasTransparency };
}

/**
 * Count rows whose vertical gradient forms one long uninterrupted run — the
 * signature of a drawn horizontal rule, panel border or table line. Text
 * baselines do not qualify because the run breaks between glyphs.
 */
function countHorizontalLines(
  lum: Float32Array,
  width: number,
  height: number,
): number {
  const minRun = Math.max(8, Math.floor(width * LINE_RUN_FRACTION));
  let count = 0;
  let lastRow = -LINE_MERGE_GAP - 1;
  for (let y = 0; y < height - 1; y += 1) {
    let run = 0;
    let best = 0;
    const row = y * width;
    const next = (y + 1) * width;
    for (let x = 0; x < width; x += 1) {
      if (Math.abs(lum[row + x] - lum[next + x]) > EDGE_THRESHOLD) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    if (best >= minRun && y - lastRow > LINE_MERGE_GAP) {
      count += 1;
      lastRow = y;
    }
  }
  return count;
}

/** The vertical counterpart of `countHorizontalLines`. */
function countVerticalLines(
  lum: Float32Array,
  width: number,
  height: number,
): number {
  const minRun = Math.max(8, Math.floor(height * LINE_RUN_FRACTION));
  let count = 0;
  let lastCol = -LINE_MERGE_GAP - 1;
  for (let x = 0; x < width - 1; x += 1) {
    let run = 0;
    let best = 0;
    for (let y = 0; y < height; y += 1) {
      const i = y * width + x;
      if (Math.abs(lum[i] - lum[i + 1]) > EDGE_THRESHOLD) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    if (best >= minRun && x - lastCol > LINE_MERGE_GAP) {
      count += 1;
      lastCol = x;
    }
  }
  return count;
}

/**
 * Estimate rectangular regions from straight-line counts.
 *
 * This is deliberately a proxy, not a shape detector: a rectangle needs both
 * horizontal and vertical strokes, so the estimate is driven by whichever is
 * scarcer. A page of horizontal rules with no vertical strokes therefore
 * scores zero rectangles, which is the correct answer for a document.
 */
export function estimateRectangles(
  horizontalLines: number,
  verticalLines: number,
): number {
  return 2 * Math.min(horizontalLines, verticalLines);
}

/** Compute all pixel-derived signals in a single pass over the buffer. */
export function computePixelSignals(src: PixelSource): PixelSignals {
  const { width, height } = src;
  const pixels = width * height;
  if (
    pixels <= 0 ||
    !Number.isFinite(pixels) ||
    src.data.length < pixels * 4
  ) {
    return {
      edgeDensity: 0,
      flatRegionRatio: 0,
      entropy: 0,
      rectangleCount: 0,
      horizontalLines: 0,
      verticalLines: 0,
      hasTransparency: false,
      meanLuminance: 0,
      contrast: 0,
    };
  }

  const { lum, hasTransparency } = toLuminance(src);

  const histogram = new Uint32Array(HISTOGRAM_BINS);
  let sum = 0;
  for (let p = 0; p < pixels; p += 1) {
    const value = lum[p];
    sum += value;
    const bin = Math.min(
      HISTOGRAM_BINS - 1,
      Math.floor((value / 256) * HISTOGRAM_BINS),
    );
    histogram[bin] += 1;
  }
  const mean = sum / pixels;

  let variance = 0;
  for (let p = 0; p < pixels; p += 1) {
    const d = lum[p] - mean;
    variance += d * d;
  }
  variance /= pixels;

  let entropyBits = 0;
  for (let b = 0; b < HISTOGRAM_BINS; b += 1) {
    if (histogram[b] === 0) continue;
    const probability = histogram[b] / pixels;
    entropyBits -= probability * Math.log2(probability);
  }

  // Gradient pass: right and down neighbours only. Two comparisons per pixel
  // is enough to separate flat interface panels from photographic texture.
  let edgePixels = 0;
  let flatPixels = 0;
  let compared = 0;
  for (let y = 0; y < height - 1; y += 1) {
    const row = y * width;
    const next = row + width;
    for (let x = 0; x < width - 1; x += 1) {
      const i = row + x;
      const gradient =
        Math.abs(lum[i] - lum[i + 1]) + Math.abs(lum[i] - lum[next + x]);
      if (gradient > EDGE_THRESHOLD) edgePixels += 1;
      else if (gradient < FLAT_THRESHOLD) flatPixels += 1;
      compared += 1;
    }
  }

  const horizontalLines = countHorizontalLines(lum, width, height);
  const verticalLines = countVerticalLines(lum, width, height);

  return {
    edgeDensity: compared > 0 ? roundTo(edgePixels / compared, 4) : 0,
    flatRegionRatio: compared > 0 ? roundTo(flatPixels / compared, 4) : 0,
    entropy: roundTo(clamp01(entropyBits / Math.log2(HISTOGRAM_BINS)), 4),
    rectangleCount: estimateRectangles(horizontalLines, verticalLines),
    horizontalLines,
    verticalLines,
    hasTransparency,
    meanLuminance: roundTo(mean / 255, 4),
    contrast: roundTo(clamp01(Math.sqrt(variance) / 128), 4),
  };
}

/** Union-free area estimate: sum of block areas, capped at the whole image. */
export function textDensityFromBlocks(blocks: OCRBlock[]): number {
  let area = 0;
  for (const block of blocks) {
    const box: NormalizedBBox | undefined = block.bbox;
    if (!box) continue;
    area += Math.max(0, box.width) * Math.max(0, box.height);
  }
  return roundTo(clamp01(area), 4);
}

/**
 * Combine pixel statistics and OCR geometry into the classifier's input.
 * Kept separate from `computePixelSignals` so a Tier C run with no OCR still
 * produces a well-formed signal set.
 */
export function buildClassificationSignals(
  pixel: PixelSignals | null,
  blocks: OCRBlock[],
  sourceWidth: number,
  sourceHeight: number,
): ClassificationSignals {
  return {
    textDensity: textDensityFromBlocks(blocks),
    edgeDensity: pixel?.edgeDensity ?? 0,
    rectangleCount: pixel?.rectangleCount ?? 0,
    flatRegionRatio: pixel?.flatRegionRatio ?? 0,
    entropy: pixel?.entropy ?? 0,
    textBlockCount: blocks.length,
    aspectRatio:
      sourceHeight > 0 ? roundTo(sourceWidth / sourceHeight, 3) : undefined,
  };
}
