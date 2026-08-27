/**
 * Vision provider profiles — versioned configuration for image token estimates.
 *
 * Provider behaviour changes. Every profile records where its numbers came
 * from and when they were last checked, so a stale estimate can be flagged in
 * the UI rather than quietly presented as fact. Nothing in the UI hard-codes a
 * pixel limit or a token cap — it all comes from here.
 */

export const VISION_PROVIDERS = ["claude", "openai", "gemini", "grok"] as const;
export type VisionProviderId = (typeof VISION_PROVIDERS)[number];

/**
 * Whether we can compute a provider-specific token estimate at all.
 *
 * `documented` — the provider publishes an exact, reproducible rule.
 * `varies` — no stable public formula, so we show guidance instead of a number.
 * Inventing a number for a `varies` provider would be worse than saying nothing.
 */
export type EstimatorSupport = "documented" | "varies";

export interface ResolutionLimits {
  /** Neither side may exceed this after the provider's own resize. */
  maxEdgePx: number;
  /** Hard cap on visual tokens for a single image. */
  maxVisualTokens: number;
  /** Side length of one visual-token patch, in pixels. */
  patchPx: number;
}

/** The result of simulating how a provider would actually process an image. */
export interface EffectiveImage {
  /** Dimensions the provider will process, after its automatic resize. */
  width: number;
  height: number;
  /** Visual tokens the provider will charge for those dimensions. */
  visualTokens: number;
  /** True when the provider had to downscale the supplied image. */
  resized: boolean;
}

export interface VisionProviderProfile {
  /** Stable id, e.g. "claude-high-resolution". */
  id: string;
  provider: VisionProviderId;
  providerLabel: string;
  /** Human-readable tier name shown in the UI. */
  modelTier: string;
  /** Which models sit in this tier, in the provider's own words. */
  models: string;
  support: EstimatorSupport;
  /** Present only when `support` is "documented". */
  limits?: ResolutionLimits;
  /** Plain-English description of how the number is worked out. */
  calculationMethod: string;
  /** What we tell the visitor when no estimate can be produced. */
  unsupportedNote?: string;
  /** Documentation URL the numbers were taken from. */
  source: string;
  /** ISO date (YYYY-MM-DD) the numbers were last checked against `source`. */
  lastVerified: string;
  /**
   * Simulate the provider's own processing of an image. Absent when the
   * provider publishes no usable rule.
   */
  estimate?: (width: number, height: number) => EffectiveImage;
}

/**
 * How long a profile stays trustworthy before the UI warns about it. Provider
 * rules change without notice, so an estimate older than this is labelled
 * rather than silently trusted.
 */
export const PROFILE_STALE_AFTER_DAYS = 180;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days since a profile was last checked against its source. */
export function profileAgeDays(
  profile: Pick<VisionProviderProfile, "lastVerified">,
  now: Date,
): number {
  const verified = Date.parse(`${profile.lastVerified}T00:00:00Z`);
  if (!Number.isFinite(verified)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - verified) / MS_PER_DAY);
}

export function isProfileStale(
  profile: Pick<VisionProviderProfile, "lastVerified">,
  now: Date,
): boolean {
  return profileAgeDays(profile, now) > PROFILE_STALE_AFTER_DAYS;
}
