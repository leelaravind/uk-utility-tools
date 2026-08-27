/**
 * Semantic vision engine resolution.
 *
 * `createSemanticVisionEngine` is the single place the pipeline asks for a
 * local semantic model. It returns `null` in this build because the registry
 * is empty (see `modelManifest.ts`), and the pipeline treats `null` as a
 * first-class outcome: the analysis still runs, the scene fields are simply
 * absent, and the limitation is stated.
 *
 * There is no `else` branch that calls a remote service. If you are reading
 * this because you are adding a model, the only correct change is to return an
 * implementation of `SemanticVisionEngine` that loads static artefacts.
 */

import { SEMANTIC_VISION_MODELS, semanticVisionStatus } from "./modelManifest";
import type {
  SemanticStatus,
  SemanticVisionEngine,
} from "./types";

export interface CreateEngineOptions {
  preferWebGPU: boolean;
  /** Manifest id to load. Defaults to the first registered model. */
  modelId?: string;
}

/**
 * Resolve a local semantic vision engine, or `null` when none is available.
 * Never throws: an absent semantic layer is a degraded result, not an error.
 */
export async function createSemanticVisionEngine(
  options: CreateEngineOptions,
): Promise<SemanticVisionEngine | null> {
  const entry = options.modelId
    ? SEMANTIC_VISION_MODELS.find((model) => model.id === options.modelId)
    : SEMANTIC_VISION_MODELS[0];
  if (!entry) return null;
  // Unreachable while the registry is empty. A future implementation loads the
  // artefacts named by `entry` here, with a dynamic import, so nothing is
  // fetched until a visitor actually starts an analysis.
  return null;
}

/** Status for the UI and the limitations builder. */
export function currentSemanticStatus(): SemanticStatus {
  return semanticVisionStatus();
}
