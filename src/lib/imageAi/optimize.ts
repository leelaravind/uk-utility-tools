/**
 * Mode 1 — Optimize Image: planning maths and the honest provider comparison.
 *
 * Two rules govern everything in this file.
 *
 * 1. There is exactly ONE source of image-token truth: the profiles in
 *    `@/config/imageProviders`. No formula, patch size or pixel limit is
 *    re-derived here.
 * 2. A saving is only real if the PROVIDER sees a smaller image. Providers
 *    downscale oversized images before charging for them, so every comparison
 *    runs both the original and the optimised size through the provider's own
 *    simulation first. Comparing raw source pixels against optimised pixels
 *    would invent savings that do not exist — e.g. 3840x2160 vs 1920x1080 on
 *    Claude's standard tier, where both become 1456x819 and cost the same.
 *
 * Everything here is pure: no DOM, no canvas, no network. The browser-only
 * work lives in the panel component.
 */

import {
  CLAUDE_MAX_SOURCE_EDGE_PX,
  DEFAULT_PROFILE_ID,
  documentedProfiles,
  getProfile,
  type EffectiveImage,
  type ResolutionLimits,
  type VisionProviderProfile,
} from "@/config/imageProviders";
import {
  MAX_DIMENSION_PX,
  computeTargetDimensions,
  type OutputFormat,
} from "@/lib/files/imageProcessing";

export type { OutputFormat };

/* ------------------------------------------------------------------ *
 * Small numeric helpers                                               *
 * ------------------------------------------------------------------ */

function positive(n: number | undefined | null): number | undefined {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

function whole(n: number): number {
  return Math.max(1, Math.round(n));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0.01, n));
}

function longestEdge(width: number, height: number): number {
  return Math.max(width, height);
}

/** Round to one decimal place, keeping the sign. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * Provider helpers — the only place profiles are interrogated         *
 * ------------------------------------------------------------------ */

/**
 * Simulate how a provider will actually process an image, or `null` when the
 * provider publishes no usable rule. Never guesses.
 */
export function providerEffectiveSize(
  profile: VisionProviderProfile,
  width: number,
  height: number,
): EffectiveImage | null {
  if (typeof profile.estimate !== "function") return null;
  return profile.estimate(whole(width), whole(height));
}

/**
 * The profile used to derive preset sizes.
 *
 * A `varies` provider has no numbers of its own, so preset sizes fall back to
 * the default documented profile. That fallback is always disclosed in the
 * plan notes rather than presented as the chosen provider's rule.
 */
export function referenceProfileFor(
  profile: VisionProviderProfile,
): VisionProviderProfile {
  if (profile.support === "documented" && profile.limits) return profile;
  const preferred = getProfile(DEFAULT_PROFILE_ID);
  if (preferred && preferred.support === "documented" && preferred.limits) {
    return preferred;
  }
  return documentedProfiles()[0];
}

function referenceLimits(profile: VisionProviderProfile): ResolutionLimits {
  const reference = referenceProfileFor(profile);
  // documentedProfiles() only ever contains profiles carrying limits.
  return reference.limits as ResolutionLimits;
}

/** The size the reference provider would process this image at. */
function referenceEffectiveSize(
  profile: VisionProviderProfile,
  width: number,
  height: number,
): EffectiveImage {
  const reference = referenceProfileFor(profile);
  const estimated = providerEffectiveSize(reference, width, height);
  if (estimated) return estimated;
  // Unreachable in practice; degrade to "leave it alone" rather than guess.
  return {
    width: whole(width),
    height: whole(height),
    visualTokens: 0,
    resized: false,
  };
}

/**
 * Largest source edge the provider will accept at all, when it documents one.
 * Only Claude publishes this today, so it is read from the Claude constant
 * rather than invented for other providers.
 */
export function providerSourceEdgeCap(
  profile: VisionProviderProfile,
): number | null {
  return profile.provider === "claude" ? CLAUDE_MAX_SOURCE_EDGE_PX : null;
}

/** True when an image is too big for the provider to accept as-is. */
export function exceedsProviderSourceLimit(
  width: number,
  height: number,
  profile: VisionProviderProfile,
): boolean {
  const cap = providerSourceEdgeCap(profile);
  if (cap === null) return false;
  return whole(width) > cap || whole(height) > cap;
}

/* ------------------------------------------------------------------ *
 * Resize presets                                                      *
 * ------------------------------------------------------------------ */

export const RESIZE_PRESET_IDS = [
  "recommended",
  "balanced",
  "low-token",
  "high-detail",
  "custom",
] as const;

export type ResizePresetId = (typeof RESIZE_PRESET_IDS)[number];

export interface ResizePreset {
  id: ResizePresetId;
  label: string;
  description: string;
  /**
   * Target for the longest side, derived from the source size and the
   * provider profile. `null` means "the caller supplies the dimensions"
   * (the custom preset). Never larger than the source: presets do not upscale.
   */
  longEdgeFor: (
    sourceWidth: number,
    sourceHeight: number,
    profile: VisionProviderProfile,
  ) => number | null;
}

/** Fraction of the provider's effective long edge used by each ladder step. */
const BALANCED_SCALE = 0.75;
const LOW_TOKEN_SCALE = 0.5;

function effectiveLongEdge(
  sourceWidth: number,
  sourceHeight: number,
  profile: VisionProviderProfile,
): number {
  const effective = referenceEffectiveSize(profile, sourceWidth, sourceHeight);
  return longestEdge(effective.width, effective.height);
}

export const RESIZE_PRESETS: ResizePreset[] = [
  {
    id: "recommended",
    label: "Recommended — match the provider",
    description:
      "Resizes to exactly the size the provider would downscale the image to, " +
      "so no pixels are uploaded that the model never sees.",
    longEdgeFor: (w, h, profile) =>
      Math.min(longestEdge(whole(w), whole(h)), effectiveLongEdge(w, h, profile)),
  },
  {
    id: "balanced",
    label: "Balanced — a little smaller",
    description:
      "About three quarters of the provider's own size. Fewer visual tokens, " +
      "with most on-screen text still readable.",
    longEdgeFor: (w, h, profile) =>
      Math.min(
        longestEdge(whole(w), whole(h)),
        whole(effectiveLongEdge(w, h, profile) * BALANCED_SCALE),
      ),
  },
  {
    id: "low-token",
    label: "Low token — smallest useful size",
    description:
      "Half the provider's own edge length, so roughly a quarter of the " +
      "pixels. Lowest visual-token usage; small text may stop being readable.",
    longEdgeFor: (w, h, profile) =>
      Math.min(
        longestEdge(whole(w), whole(h)),
        whole(effectiveLongEdge(w, h, profile) * LOW_TOKEN_SCALE),
      ),
  },
  {
    id: "high-detail",
    label: "High detail — up to the provider's limit",
    description:
      "Keeps as much detail as the provider's documented edge limit allows. " +
      "For many images this is the same as Recommended.",
    longEdgeFor: (w, h, profile) =>
      Math.min(longestEdge(whole(w), whole(h)), referenceLimits(profile).maxEdgePx),
  },
  {
    id: "custom",
    label: "Custom size",
    description: "Type your own width and height.",
    longEdgeFor: () => null,
  },
];

export const DEFAULT_RESIZE_PRESET: ResizePresetId = "recommended";

export function getResizePreset(id: ResizePresetId): ResizePreset {
  const found = RESIZE_PRESETS.find((p) => p.id === id);
  return found ?? RESIZE_PRESETS[0];
}

/* ------------------------------------------------------------------ *
 * Content presets                                                     *
 * ------------------------------------------------------------------ */

export const CONTENT_PRESET_IDS = [
  "auto",
  "screenshot",
  "document",
  "photo",
  "diagram",
] as const;

export type ContentPresetId = (typeof CONTENT_PRESET_IDS)[number];

export interface ContentPreset {
  id: ContentPresetId;
  label: string;
  description: string;
  /** Suggested output format. */
  format: OutputFormat;
  /** Suggested encoder quality, 0-1. Ignored for PNG, which is lossless. */
  quality: number;
  /**
   * Whether crisp edges matter more than smooth gradients when downscaling.
   * Used to pick the resampling quality; it does not change token maths.
   */
  preferSharpDownscale: boolean;
}

export const CONTENT_PRESETS: ContentPreset[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Balanced settings that suit most images.",
    format: "image/webp",
    quality: 0.85,
    preferSharpDownscale: true,
  },
  {
    id: "screenshot",
    label: "Screenshot / UI",
    description:
      "High-quality WebP so menus, labels and small UI text stay legible.",
    format: "image/webp",
    quality: 0.92,
    preferSharpDownscale: true,
  },
  {
    id: "document",
    label: "Document / text",
    description:
      "Very high quality, because compression artefacts around letterforms " +
      "are what makes text hard to read.",
    format: "image/webp",
    quality: 0.95,
    preferSharpDownscale: true,
  },
  {
    id: "photo",
    label: "Photo",
    description:
      "Stronger lossy compression. Photographs hide compression far better " +
      "than text does.",
    format: "image/webp",
    quality: 0.78,
    preferSharpDownscale: false,
  },
  {
    id: "diagram",
    label: "Diagram / chart",
    description:
      "Lossless PNG. Flat colours and thin lines compress well and stay sharp.",
    format: "image/png",
    quality: 1,
    preferSharpDownscale: true,
  },
];

export const DEFAULT_CONTENT_PRESET: ContentPresetId = "auto";

export function getContentPreset(id: ContentPresetId): ContentPreset {
  const found = CONTENT_PRESETS.find((p) => p.id === id);
  return found ?? CONTENT_PRESETS[0];
}

/**
 * A deliberately shallow hint based on the source file type only. There is no
 * image analysis here and none is implied: PNG usually means a screen capture
 * or export, JPEG usually means a camera photo. The user can always override.
 */
export function suggestContentPreset(sourceMimeType: string): ContentPresetId {
  const type = sourceMimeType.toLowerCase();
  if (type === "image/png") return "screenshot";
  if (type === "image/jpeg" || type === "image/jpg") return "photo";
  return "auto";
}

/* ------------------------------------------------------------------ *
 * Planning                                                            *
 * ------------------------------------------------------------------ */

export interface OptimisationInput {
  /** Source dimensions AFTER any crop has been applied. */
  sourceWidth: number;
  sourceHeight: number;
  profile: VisionProviderProfile;
  resizePreset: ResizePresetId;
  contentPreset?: ContentPresetId;
  /** Only read when `resizePreset` is "custom". */
  customWidth?: number;
  customHeight?: number;
  /** Preserve the source aspect ratio. Defaults to true. */
  lockAspect?: boolean;
  /** Opt in to enlarging the image. Defaults to false. */
  allowUpscale?: boolean;
  /** Overrides the content preset's format. */
  format?: OutputFormat;
  /** Overrides the content preset's quality, 0-1. */
  quality?: number;
}

export interface OptimisationPlan {
  width: number;
  height: number;
  format: OutputFormat;
  /** 0-1. Always 1 for PNG, which has no quality setting. */
  quality: number;
  preferSharpDownscale: boolean;
  resizePreset: ResizePresetId;
  contentPreset: ContentPresetId;
  /** The dimensions the plan started from (post-crop source). */
  sourceWidth: number;
  sourceHeight: number;
  /** True when the plan changes no pixels at all. */
  noOp: boolean;
  /** True when the requested size was larger than the source. */
  upscaleRequested: boolean;
  /** True when an upscale was actually allowed through. */
  upscaled: boolean;
  /** True when the source aspect ratio is preserved (within rounding). */
  aspectPreserved: boolean;
  notes: string[];
}

const ASPECT_TOLERANCE = 0.02;

function aspectPreserved(
  srcW: number,
  srcH: number,
  outW: number,
  outH: number,
): boolean {
  const source = srcW / srcH;
  const output = outW / outH;
  return Math.abs(source - output) <= ASPECT_TOLERANCE * source;
}

/**
 * Work out the concrete width, height, format and quality for an optimisation.
 *
 * Aspect ratio is preserved unless the caller turns `lockAspect` off, and the
 * output is never larger than the source unless `allowUpscale` is explicitly
 * true — enlarging invents pixels without adding detail, and would raise
 * visual-token usage while pretending to be an optimisation.
 */
export function planOptimisation(input: OptimisationInput): OptimisationPlan {
  const srcW = whole(input.sourceWidth);
  const srcH = whole(input.sourceHeight);
  const contentPresetId = input.contentPreset ?? DEFAULT_CONTENT_PRESET;
  const content = getContentPreset(contentPresetId);
  const format = input.format ?? content.format;
  const quality =
    format === "image/png" ? 1 : clamp01(input.quality ?? content.quality);
  const lockAspect = input.lockAspect !== false;
  const allowUpscale = input.allowUpscale === true;
  const preset = getResizePreset(input.resizePreset);
  const notes: string[] = [];

  let width: number;
  let height: number;
  let upscaleRequested = false;

  const targetLongEdge = preset.longEdgeFor(srcW, srcH, input.profile);

  if (targetLongEdge === null) {
    const reqW = positive(input.customWidth);
    const reqH = positive(input.customHeight);
    upscaleRequested =
      (reqW !== undefined && reqW > srcW) || (reqH !== undefined && reqH > srcH);
    const dims = computeTargetDimensions(srcW, srcH, {
      width: reqW,
      height: reqH,
      lockAspect,
      maxDimension: MAX_DIMENSION_PX,
    });
    width = dims.width;
    height = dims.height;
  } else {
    // `maxDimension` only ever scales down, so a preset can never upscale.
    const dims = computeTargetDimensions(srcW, srcH, {
      lockAspect: true,
      maxDimension: Math.min(targetLongEdge, MAX_DIMENSION_PX),
    });
    width = dims.width;
    height = dims.height;
  }

  if (!allowUpscale && (width > srcW || height > srcH)) {
    if (lockAspect) {
      const scale = Math.min(1, srcW / width, srcH / height);
      width = whole(width * scale);
      height = whole(height * scale);
    } else {
      width = Math.min(width, srcW);
      height = Math.min(height, srcH);
    }
    notes.push(
      "That size is larger than the original, so it was capped at the " +
        "original size. Enlarging adds pixels but no detail, and would " +
        "increase visual-token usage rather than reduce it.",
    );
  }

  const upscaled = width > srcW || height > srcH;
  if (upscaled) {
    notes.push(
      "This enlarges the image. It will not add detail, and it increases " +
        "both the file size and the visual-token estimate.",
    );
  }

  const noOp = width === srcW && height === srcH;

  const referenceUsed = referenceProfileFor(input.profile);
  if (input.profile.support !== "documented" && input.resizePreset !== "custom") {
    notes.push(
      `${input.profile.providerLabel} does not publish an image-token rule, so ` +
        `preset sizes use ${referenceUsed.providerLabel} (${referenceUsed.modelTier}) ` +
        "as a reference. No token estimate is shown for this provider.",
    );
  }

  const providerEffective = providerEffectiveSize(input.profile, srcW, srcH);
  if (
    providerEffective &&
    providerEffective.resized &&
    providerEffective.width === width &&
    providerEffective.height === height
  ) {
    notes.push(
      `${input.profile.providerLabel} would resize this image to ` +
        `${width} x ${height} px itself, so this makes the upload smaller ` +
        "without changing visual-token usage.",
    );
  }

  if (exceedsProviderSourceLimit(srcW, srcH, input.profile)) {
    const cap = providerSourceEdgeCap(input.profile);
    notes.push(
      `The original is larger than the ${cap} px maximum ` +
        `${input.profile.providerLabel} accepts, so it has to be resized ` +
        "before it can be sent at all.",
    );
  }

  if (noOp) {
    notes.push(
      "These settings keep the original pixel dimensions. Changing format or " +
        "quality alters the file size, not the visual-token estimate.",
    );
  }

  return {
    width,
    height,
    format,
    quality,
    preferSharpDownscale: content.preferSharpDownscale,
    resizePreset: input.resizePreset,
    contentPreset: contentPresetId,
    sourceWidth: srcW,
    sourceHeight: srcH,
    noOp,
    upscaleRequested,
    upscaled,
    aspectPreserved: aspectPreserved(srcW, srcH, width, height),
    notes,
  };
}

/* ------------------------------------------------------------------ *
 * The honest comparison                                               *
 * ------------------------------------------------------------------ */

export interface ProviderComparison {
  /** What the provider actually processes for the original. */
  original: EffectiveImage | null;
  /** What the provider actually processes for the optimised copy. */
  optimised: EffectiveImage | null;
  /**
   * Tokens saved: original effective tokens minus optimised effective tokens.
   * Negative when the "optimised" copy costs more. `null` when the provider
   * publishes no rule — never 0, never a guess.
   */
  tokenReduction: number | null;
  /** The same figure as a percentage of the original, to one decimal place. */
  tokenReductionPercent: number | null;
  /** True when the provider would have downscaled the original itself. */
  providerResizedOriginal: boolean;
  note?: string;
}

const NO_RULE_NOTE =
  "This provider does not publish a stable image-token rule, so no token " +
  "estimate is shown. Reducing dimensions still reduces upload size.";

/**
 * Compare an original and an optimised size THROUGH the provider's own
 * processing.
 *
 * This is the function that keeps the tool honest. It never looks at raw
 * source pixels: both sizes are run through the provider's documented resize
 * first, so an image the provider was going to shrink anyway reports the zero
 * saving it actually delivers.
 */
export function compareForProvider(
  originalWidth: number,
  originalHeight: number,
  optimisedWidth: number,
  optimisedHeight: number,
  profile: VisionProviderProfile,
): ProviderComparison {
  const original = providerEffectiveSize(profile, originalWidth, originalHeight);
  const optimised = providerEffectiveSize(
    profile,
    optimisedWidth,
    optimisedHeight,
  );

  if (!original || !optimised) {
    return {
      original: null,
      optimised: null,
      tokenReduction: null,
      tokenReductionPercent: null,
      providerResizedOriginal: false,
      note: profile.unsupportedNote ?? NO_RULE_NOTE,
    };
  }

  const tokenReduction = original.visualTokens - optimised.visualTokens;
  const tokenReductionPercent =
    original.visualTokens > 0
      ? round1((tokenReduction / original.visualTokens) * 100)
      : null;

  const sameDimensions =
    whole(originalWidth) === whole(optimisedWidth) &&
    whole(originalHeight) === whole(optimisedHeight);

  let note: string | undefined;
  if (tokenReduction < 0) {
    note =
      `This costs ${Math.abs(tokenReduction)} more visual tokens than the ` +
      "original, because the image is larger than the original in pixels.";
  } else if (tokenReduction === 0 && sameDimensions) {
    note =
      "Same pixel dimensions, so visual-token usage is unchanged. Re-encoding " +
      "or changing quality alters the file size only.";
  } else if (tokenReduction === 0) {
    note =
      `${profile.providerLabel} resizes both the original and this copy to ` +
      `${optimised.width} x ${optimised.height} px, so visual-token usage is ` +
      "unchanged. The smaller file still uploads faster.";
  } else if (optimised.resized) {
    note =
      `${profile.providerLabel} will still downscale this copy to ` +
      `${optimised.width} x ${optimised.height} px.`;
  }

  return {
    original,
    optimised,
    tokenReduction,
    tokenReductionPercent,
    providerResizedOriginal: original.resized,
    note,
  };
}

/* ------------------------------------------------------------------ *
 * Formatting helpers                                                  *
 * ------------------------------------------------------------------ */

/** Raw megapixel count for a size. */
export function megapixels(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  return Math.max(0, width) * Math.max(0, height) / 1_000_000;
}

/**
 * Megapixels as display text, e.g. 3840x2160 -> "8.3 MP", 640x480 -> "0.31 MP".
 * Sub-megapixel sizes get two decimals so small images do not all read "0.0".
 */
export function describeMegapixels(width: number, height: number): string {
  const mp = megapixels(width, height);
  if (mp === 0) return "0 MP";
  if (mp < 0.01) return "<0.01 MP";
  if (mp < 1) return `${(Math.round(mp * 100) / 100).toFixed(2)} MP`;
  if (mp < 100) return `${(Math.round(mp * 10) / 10).toFixed(1)} MP`;
  return `${Math.round(mp)} MP`;
}

/** "3,840 x 2,160 px" — grouped for readability on large images. */
export function formatDimensions(width: number, height: number): string {
  return `${whole(width).toLocaleString("en-GB")} × ${whole(height).toLocaleString("en-GB")} px`;
}

/** Token counts with thousands separators. */
export function formatTokens(tokens: number): string {
  return Math.round(tokens).toLocaleString("en-GB");
}

/**
 * A signed percentage for display, e.g. 67.4 -> "67.4%", -12 -> "+12% more",
 * 0 -> "no change". Never dresses an increase up as a saving.
 */
export function formatReductionPercent(percent: number | null): string {
  if (percent === null) return "Not available";
  if (percent === 0) return "No change";
  if (percent < 0) return `${round1(Math.abs(percent))}% more`;
  return `${round1(percent)}% less`;
}

/** Short label for an output format. */
export const FORMAT_LABELS: Record<OutputFormat, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/** Human label for a MIME type that may not be one of our output formats. */
export function describeFormat(mimeType: string): string {
  const known = FORMAT_LABELS[mimeType as OutputFormat];
  if (known) return known;
  const slash = mimeType.indexOf("/");
  const tail = slash >= 0 ? mimeType.slice(slash + 1) : mimeType;
  return tail ? tail.toUpperCase() : "Unknown";
}
