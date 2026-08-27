/**
 * Claude vision token model.
 *
 * This is a direct port of Anthropic's published reference implementation, not
 * an approximation. Claude views an image as 28×28-pixel patches; each patch is
 * one visual token, so an image costs `ceil(w / 28) × ceil(h / 28)` tokens.
 * Each model tier caps both the longest edge and the total visual tokens, and
 * images over either cap are downscaled — aspect preserved — to the largest
 * size that fits.
 *
 * Getting the resize right is what stops the tool overstating savings: a 4K
 * screenshot is already downscaled by Claude before it is charged for, so the
 * honest comparison is Claude's view of the original against Claude's view of
 * the optimised copy — not raw original pixels against optimised pixels.
 *
 * Source: https://platform.claude.com/docs/en/build-with-claude/vision
 *         https://platform.claude.com/docs/en/build-with-claude/vision-coordinates
 * Verified: 2026-08-27
 */

import type {
  EffectiveImage,
  ResolutionLimits,
  VisionProviderProfile,
} from "./types";

export const CLAUDE_PATCH_PX = 28;

/** Claude 4.7 and later. */
export const CLAUDE_HIGH_RESOLUTION_LIMITS: ResolutionLimits = {
  maxEdgePx: 2576,
  maxVisualTokens: 4784,
  patchPx: CLAUDE_PATCH_PX,
};

/** Every other Claude model. */
export const CLAUDE_STANDARD_LIMITS: ResolutionLimits = {
  maxEdgePx: 1568,
  maxVisualTokens: 1568,
  patchPx: CLAUDE_PATCH_PX,
};

/** Hard ceiling on either side of any image sent to the API. */
export const CLAUDE_MAX_SOURCE_EDGE_PX = 8000;

function ceilDiv(value: number, divisor: number): number {
  return Math.ceil(value / divisor);
}

/** Visual tokens consumed by an image: one token per 28×28 pixel patch. */
export function countClaudeVisualTokens(width: number, height: number): number {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return ceilDiv(w, CLAUDE_PATCH_PX) * ceilDiv(h, CLAUDE_PATCH_PX);
}

/**
 * Round half to even (banker's rounding), matching Python's `round()`.
 *
 * The live API resolves exact .5 ties toward the even neighbour, so plain
 * `Math.round` (which rounds halves up) computes a different size for some
 * images. This is copied from Anthropic's reference implementation rather than
 * simplified — the difference is real, if rare.
 */
export function roundTiesToEven(value: number): number {
  const floor = Math.floor(value);
  if (value - floor !== 0.5) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

function fitsWithin(
  width: number,
  height: number,
  limits: ResolutionLimits,
): boolean {
  const { maxEdgePx, maxVisualTokens, patchPx } = limits;
  return (
    ceilDiv(width, patchPx) * patchPx <= maxEdgePx &&
    ceilDiv(height, patchPx) * patchPx <= maxEdgePx &&
    countClaudeVisualTokens(width, height) <= maxVisualTokens
  );
}

/**
 * The size Claude resizes an image to before padding. Images already within
 * the limits are returned unchanged.
 *
 * Port of Anthropic's reference implementation: binary-search the long edge for
 * the largest aspect-preserving size that satisfies BOTH the edge cap and the
 * token cap.
 */
export function claudeResizedSize(
  width: number,
  height: number,
  limits: ResolutionLimits,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (fitsWithin(w, h, limits)) return { width: w, height: h };

  if (h > w) {
    const rotated = claudeResizedSize(h, w, limits);
    return { width: rotated.height, height: rotated.width };
  }

  const aspectRatio = w / h;
  const shortEdge = (longEdge: number): number =>
    Math.max(roundTiesToEven(longEdge / aspectRatio), 1);

  let lo = 1; // always fits
  let hi = w; // never fits
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsWithin(mid, shortEdge(mid), limits)) lo = mid;
    else hi = mid;
  }

  return { width: lo, height: shortEdge(lo) };
}

/**
 * Simulate exactly how Claude will process an image: the dimensions it ends up
 * seeing, and the visual tokens it charges for them.
 */
export function estimateClaudeImage(
  width: number,
  height: number,
  limits: ResolutionLimits,
): EffectiveImage {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const resizedTo = claudeResizedSize(w, h, limits);
  return {
    width: resizedTo.width,
    height: resizedTo.height,
    visualTokens: countClaudeVisualTokens(resizedTo.width, resizedTo.height),
    resized: resizedTo.width !== w || resizedTo.height !== h,
  };
}

const SOURCE = "https://platform.claude.com/docs/en/build-with-claude/vision";
const LAST_VERIFIED = "2026-08-27";

const CALCULATION_METHOD =
  "Claude sees an image as 28x28 pixel patches; each patch is one visual token, " +
  "so an image costs ceil(width / 28) x ceil(height / 28) tokens. Images over " +
  "the tier's edge or token limit are downscaled, preserving aspect ratio, to " +
  "the largest size that fits both.";

export const CLAUDE_HIGH_RESOLUTION_PROFILE: VisionProviderProfile = {
  id: "claude-high-resolution",
  provider: "claude",
  providerLabel: "Claude",
  modelTier: "High resolution",
  models: "Claude 4.7 and later",
  support: "documented",
  limits: CLAUDE_HIGH_RESOLUTION_LIMITS,
  calculationMethod: CALCULATION_METHOD,
  source: SOURCE,
  lastVerified: LAST_VERIFIED,
  estimate: (width, height) =>
    estimateClaudeImage(width, height, CLAUDE_HIGH_RESOLUTION_LIMITS),
};

export const CLAUDE_STANDARD_PROFILE: VisionProviderProfile = {
  id: "claude-standard",
  provider: "claude",
  providerLabel: "Claude",
  modelTier: "Standard",
  models: "Claude models before 4.7",
  support: "documented",
  limits: CLAUDE_STANDARD_LIMITS,
  calculationMethod: CALCULATION_METHOD,
  source: SOURCE,
  lastVerified: LAST_VERIFIED,
  estimate: (width, height) =>
    estimateClaudeImage(width, height, CLAUDE_STANDARD_LIMITS),
};
