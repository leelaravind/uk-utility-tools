/**
 * Vision provider registry.
 *
 * Claude is the only provider with a documented, reproducible image-token rule,
 * so it is the only one that gets a number. The others are listed so a visitor
 * can see the tool knows about them — with an honest "varies by model" note
 * rather than a fabricated estimate. Adding a provider means adding a profile
 * here with a real `source` and `lastVerified` date, never a guessed formula.
 */

import {
  CLAUDE_HIGH_RESOLUTION_PROFILE,
  CLAUDE_STANDARD_PROFILE,
} from "./claude";
import type { VisionProviderProfile } from "./types";

const VARIES_NOTE =
  "Token calculation varies by model and provider. This provider does not " +
  "publish a stable public formula for image tokens, so no estimate is shown.";

export const OPENAI_PROFILE: VisionProviderProfile = {
  id: "openai-varies",
  provider: "openai",
  providerLabel: "ChatGPT / OpenAI",
  modelTier: "All models",
  models: "GPT-family multimodal models",
  support: "varies",
  calculationMethod:
    "Image token cost depends on the model and the detail setting chosen at " +
    "request time, and the published rules differ between model families.",
  unsupportedNote: VARIES_NOTE,
  source: "https://platform.openai.com/docs/guides/images",
  lastVerified: "2026-08-27",
};

export const GEMINI_PROFILE: VisionProviderProfile = {
  id: "gemini-varies",
  provider: "gemini",
  providerLabel: "Gemini",
  modelTier: "All models",
  models: "Gemini multimodal models",
  support: "varies",
  calculationMethod:
    "Image token cost depends on the model and how the image is tiled, and " +
    "differs across Gemini model generations.",
  unsupportedNote: VARIES_NOTE,
  source: "https://ai.google.dev/gemini-api/docs/image-understanding",
  lastVerified: "2026-08-27",
};

export const GROK_PROFILE: VisionProviderProfile = {
  id: "grok-varies",
  provider: "grok",
  providerLabel: "Grok",
  modelTier: "All models",
  models: "Grok multimodal models",
  support: "varies",
  calculationMethod:
    "No stable public image-token formula is documented for Grok models.",
  unsupportedNote: VARIES_NOTE,
  source: "https://docs.x.ai/docs/guides/image-understanding",
  lastVerified: "2026-08-27",
};

/** Display order in the provider picker. */
export const VISION_PROVIDER_PROFILES: VisionProviderProfile[] = [
  CLAUDE_HIGH_RESOLUTION_PROFILE,
  CLAUDE_STANDARD_PROFILE,
  OPENAI_PROFILE,
  GEMINI_PROFILE,
  GROK_PROFILE,
];

/** The profile a first-time visitor sees. */
export const DEFAULT_PROFILE_ID = CLAUDE_HIGH_RESOLUTION_PROFILE.id;

export function getProfile(id: string): VisionProviderProfile | undefined {
  return VISION_PROVIDER_PROFILES.find((p) => p.id === id);
}

/** Profiles that can actually produce a number. */
export function documentedProfiles(): VisionProviderProfile[] {
  return VISION_PROVIDER_PROFILES.filter((p) => p.support === "documented");
}

export * from "./types";
export {
  CLAUDE_HIGH_RESOLUTION_LIMITS,
  CLAUDE_HIGH_RESOLUTION_PROFILE,
  CLAUDE_MAX_SOURCE_EDGE_PX,
  CLAUDE_PATCH_PX,
  CLAUDE_STANDARD_LIMITS,
  CLAUDE_STANDARD_PROFILE,
  claudeResizedSize,
  countClaudeVisualTokens,
  estimateClaudeImage,
  roundTiesToEven,
} from "./claude";
