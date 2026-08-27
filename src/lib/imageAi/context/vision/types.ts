/**
 * Semantic vision — the pluggable interface.
 *
 * NOTHING IS BUNDLED IN THIS BUILD. The registry in `modelManifest.ts` is
 * empty on purpose; see the long comment there for what a contributor has to
 * measure before adding an entry.
 *
 * This file exists so that adding a local captioning/detection model later is
 * a matter of implementing one interface, not rewriting the pipeline. The
 * public output schema deliberately contains no model-specific field, so
 * swapping the engine cannot change what visitors copy.
 *
 * Hard constraint on every future implementation: `analyze` receives pixels
 * and returns meaning, and it may not perform any network request other than
 * fetching its own static model artefacts. There is no remote-inference
 * variant of this interface and there must never be one.
 */

import type { VisualEntity, VisualRelationship } from "../types";

/** What a semantic engine is asked to produce. */
export interface SemanticResult {
  shortCaption?: string;
  detailedCaption?: string;
  entities?: VisualEntity[];
  relationships?: VisualRelationship[];
  /** Engine-reported caveats, surfaced to the visitor verbatim. */
  warnings?: string[];
}

export interface SemanticProgress {
  /** "download" for model artefacts, "compute" for inference. */
  phase: "download" | "warmup" | "compute";
  /** 0–1, or -1 when genuinely indeterminate. */
  progress: number;
  label: string;
}

export interface SemanticInitOptions {
  preferWebGPU: boolean;
  onProgress?: (progress: SemanticProgress) => void;
  signal?: AbortSignal;
}

export interface SemanticAnalyzeOptions {
  /** Detailed mode may request the longer caption and more regions. */
  detail: "short" | "full";
  onProgress?: (progress: SemanticProgress) => void;
  signal?: AbortSignal;
}

/** Pixels handed to an engine. Kept structural so no DOM type is required. */
export interface SemanticImageInput {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/**
 * The contract a local semantic vision model must satisfy.
 *
 * Implementations must be cancellable at every await point and must release
 * their session in `dispose` — a browser tab that keeps a model resident after
 * the visitor has cleared the image is a memory leak and a privacy smell.
 */
export interface SemanticVisionEngine {
  /** Manifest id of the model this engine runs. */
  readonly id: string;
  initialize(options: SemanticInitOptions): Promise<void>;
  analyze(
    input: SemanticImageInput,
    options: SemanticAnalyzeOptions,
  ): Promise<SemanticResult>;
  dispose(): Promise<void>;
}

/** Provenance record for a model artefact. Every field is mandatory to ship. */
export interface ModelManifestEntry {
  /** Stable local id used in `processing.modelIds`. */
  id: string;
  /** e.g. "image-to-text", "object-detection". */
  task: string;
  /** Exact upstream revision/commit. Never a mutable branch name. */
  versionOrRevision: string;
  /** SPDX identifier of the model licence, verified on the model card. */
  license: string;
  /** Where the artefacts are served from. */
  source: string;
  /** Bytes actually transferred by a cold browser load, measured. */
  expectedDownloadBytes?: number;
  /** Checksum of the artefact bundle when self-hosted. */
  sha256?: string;
  /** Runtimes the model was actually verified on. */
  verifiedRuntimes?: Array<"webgpu" | "wasm">;
  /** Measured evidence backing the decision to ship it. */
  measured?: {
    coldLoadMs?: number;
    cachedLoadMs?: number;
    peakMemoryMb?: number;
    notes?: string;
  };
}

/** Why semantic analysis produced nothing, for the limitations list. */
export interface SemanticStatus {
  available: boolean;
  reason: string;
}
