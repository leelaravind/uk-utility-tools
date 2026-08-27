/**
 * Bounding-box and number normalisation.
 *
 * Every coordinate that reaches the public schema passes through here, so the
 * rounding rules of the specification (§29: coordinates to 3 decimals,
 * confidence to 2) live in exactly one place and the serializers stay
 * deterministic.
 */

import type { NormalizedBBox } from "./types";

/** Pixel-space rectangle as most OCR engines report it. */
export interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Clamp to the [0,1] range. NaN becomes 0 (no evidence), infinities clamp to
 * the end of the range they point at rather than collapsing to zero.
 */
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Round to `decimals` places without ever producing `-0` or an exponent form,
 * both of which would make serializer output non-deterministic across engines.
 */
export function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  const rounded = Math.round(n * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Coordinates are rounded to 3 decimals in every output format. */
export function roundCoord(n: number): number {
  return roundTo(n, 3);
}

/** Confidence is rounded to 2 decimals in every output format. */
export function roundConfidence(n: number): number {
  return roundTo(clamp01(n), 2);
}

/**
 * Convert a pixel-space box into a normalised box, clamped so a slightly
 * out-of-bounds OCR box can never produce coordinates outside [0,1].
 * Returns undefined when the source dimensions or the box are unusable.
 */
export function normalizeBox(
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
): NormalizedBBox | undefined {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return undefined;
  }
  const left = Math.min(box.x0, box.x1);
  const right = Math.max(box.x0, box.x1);
  const top = Math.min(box.y0, box.y1);
  const bottom = Math.max(box.y0, box.y1);
  if (![left, right, top, bottom].every(Number.isFinite)) return undefined;

  const x = clamp01(left / imageWidth);
  const y = clamp01(top / imageHeight);
  const width = clamp01(right / imageWidth) - x;
  const height = clamp01(bottom / imageHeight) - y;
  if (width <= 0 || height <= 0) return undefined;

  return {
    x: roundCoord(x),
    y: roundCoord(y),
    width: roundCoord(width),
    height: roundCoord(height),
  };
}

/** Round every component of a normalised box to 3 decimals. */
export function roundBox(box: NormalizedBBox): NormalizedBBox {
  return {
    x: roundCoord(box.x),
    y: roundCoord(box.y),
    width: roundCoord(box.width),
    height: roundCoord(box.height),
  };
}

/** Compact array form `[x, y, width, height]` used by the public schema. */
export function boxToArray(
  box: NormalizedBBox,
): [number, number, number, number] {
  return [
    roundCoord(box.x),
    roundCoord(box.y),
    roundCoord(box.width),
    roundCoord(box.height),
  ];
}

export function boxArea(box: NormalizedBBox): number {
  return Math.max(0, box.width) * Math.max(0, box.height);
}

/** Intersection-over-union, used by entity de-duplication / NMS. */
export function boxIou(a: NormalizedBBox, b: NormalizedBBox): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  const intersection = (right - left) * (bottom - top);
  const union = boxArea(a) + boxArea(b) - intersection;
  return union > 0 ? intersection / union : 0;
}

/** Vertical overlap of two boxes as a fraction of the shorter one. */
export function verticalOverlapRatio(
  a: NormalizedBBox,
  b: NormalizedBBox,
): number {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (bottom <= top) return 0;
  const shorter = Math.min(a.height, b.height);
  return shorter > 0 ? (bottom - top) / shorter : 0;
}

export function boxCenterY(box: NormalizedBBox): number {
  return box.y + box.height / 2;
}

export function boxCenterX(box: NormalizedBBox): number {
  return box.x + box.width / 2;
}

const VERTICAL_BANDS = ["top", "center", "bottom"] as const;
const HORIZONTAL_BANDS = ["left", "center", "right"] as const;

function band(value: number): 0 | 1 | 2 {
  if (value < 1 / 3) return 0;
  if (value < 2 / 3) return 1;
  return 2;
}

/**
 * Coarse human description of where a box sits, e.g. "center-right".
 * Used in the tagged-text format; never implies pixel precision.
 */
export function describePosition(box: NormalizedBBox): string {
  const v = VERTICAL_BANDS[band(boxCenterY(box))];
  const h = HORIZONTAL_BANDS[band(boxCenterX(box))];
  if (v === "center" && h === "center") return "center";
  if (v === "center") return `center-${h}`;
  if (h === "center") return `${v}-center`;
  return `${v}-${h}`;
}

/**
 * Fit `width`×`height` inside a square of `maxEdge`, only ever scaling down.
 * Used to build the downscaled analysis copy without touching the original.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number; scale: number } {
  const w = Number.isFinite(width) && width > 0 ? width : 1;
  const h = Number.isFinite(height) && height > 0 ? height : 1;
  const edge = Number.isFinite(maxEdge) && maxEdge > 0 ? maxEdge : 1;
  const longest = Math.max(w, h);
  if (longest <= edge) return { width: Math.round(w), height: Math.round(h), scale: 1 };
  const scale = edge / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  };
}
