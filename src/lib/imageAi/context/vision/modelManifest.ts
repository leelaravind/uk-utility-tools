/**
 * Local semantic-vision model registry — DELIBERATELY EMPTY.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS EMPTY
 * ---------------------------------------------------------------------------
 * The implementation specification (Phase 4, §39) requires a *measured*
 * technical spike before any semantic vision model ships, and forbids shipping
 * a multi-gigabyte browser download. Those measurements have not been taken in
 * this environment, and shipping an unmeasured model would trade a real,
 * verifiable privacy-and-performance guarantee for a guess.
 *
 * So this build ships what the specification calls Tier C degradation for the
 * semantic layer: local OCR plus layout heuristics, with scene captioning and
 * object detection reported as unavailable rather than faked. The UI says this
 * in plain words. Nothing in this build falls back to a cloud model — that
 * path does not exist in the code and must never be added.
 *
 * ---------------------------------------------------------------------------
 * WHAT A CONTRIBUTOR MUST MEASURE BEFORE ADDING AN ENTRY HERE
 * ---------------------------------------------------------------------------
 * Add a model only when every one of these has been recorded, on a real
 * browser, with the numbers written into the entry's `measured` block and into
 * the project's dependency/model documentation:
 *
 *  1. TRANSFERRED BYTES on a cold load, read from the browser's network panel
 *     with the cache disabled. Not the repository size — the bytes the browser
 *     actually pulls for the quantised artefacts used at runtime. A model that
 *     transfers more than a few hundred MB is not acceptable for a public web
 *     tool; smaller is strongly preferred.
 *  2. COLD LOAD TIME to first usable inference, and CACHED LOAD TIME on a
 *     second visit, both on a mid-range laptop and a mid-range Android phone.
 *  3. PEAK MEMORY during inference, and behaviour on a device with ~2 GB of
 *     available memory. It must degrade, not crash the tab.
 *  4. WEBGPU AND WASM COMPATIBILITY, verified separately. A model that only
 *     works on WebGPU must degrade cleanly where WebGPU is absent, and the
 *     WASM path must be timed, not assumed.
 *  5. LICENCE, read from the model card, including whether redistribution and
 *     self-hosting are permitted. "It is on a model hub" is not a licence.
 *  6. REVISION PIN: an exact commit/revision, never a mutable branch. Record
 *     the sha256 of the artefact bundle if self-hosting.
 *  7. OUTPUT USEFULNESS on the fixture suite — photos, screenshots, documents
 *     and diagrams — judged on features present, not on exact prose.
 *
 * ---------------------------------------------------------------------------
 * WHAT MUST NOT HAPPEN
 * ---------------------------------------------------------------------------
 *  - No entry may point at a remote inference API. This registry describes
 *    static artefacts downloaded and executed locally, nothing else.
 *  - No entry may be added "temporarily" without the measurements above.
 *  - Adding an entry must not change the public output schema; if it does, the
 *    engine is leaking model-specific structure and needs an adapter.
 */

import type { ModelManifestEntry, SemanticStatus } from "./types";

/**
 * Registry of local semantic-vision models available to this build.
 * Empty by design — see the comment above.
 */
export const SEMANTIC_VISION_MODELS: readonly ModelManifestEntry[] = [];

/** Reason shown to visitors and recorded in `limitations`. */
export const SEMANTIC_VISION_UNAVAILABLE_REASON =
  "Local scene captioning and object detection are not enabled in this build. The result comes from local text recognition (OCR) and layout heuristics only, so it describes text and structure rather than photographic content.";

/**
 * Current semantic status. When the registry is empty this is always
 * unavailable; there is deliberately no branch that reaches a remote service.
 */
export function semanticVisionStatus(): SemanticStatus {
  if (SEMANTIC_VISION_MODELS.length === 0) {
    return { available: false, reason: SEMANTIC_VISION_UNAVAILABLE_REASON };
  }
  return { available: true, reason: "" };
}

/** Look up a manifest entry by id. */
export function findModel(id: string): ModelManifestEntry | undefined {
  return SEMANTIC_VISION_MODELS.find((entry) => entry.id === id);
}

/**
 * Total bytes a cold load would transfer, for the model-storage UI. Zero while
 * the registry is empty, which is the honest number to show.
 */
export function totalExpectedModelBytes(): number {
  return SEMANTIC_VISION_MODELS.reduce(
    (sum, entry) => sum + (entry.expectedDownloadBytes ?? 0),
    0,
  );
}
