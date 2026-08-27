/**
 * Image → AI Context — versioned internal representation.
 *
 * This module is the single source of truth for the shapes every analyzer,
 * merger and serializer speaks. It is pure TypeScript with no browser or
 * Node dependencies so it can be imported from the UI, from a Web Worker and
 * from unit tests alike.
 *
 * Two vocabularies live here and they must not be confused:
 *
 *  - `AnalysisDocument` is the INTERNAL representation. It may be verbose and
 *    it may carry provenance that is useful for debugging.
 *  - The PUBLIC copy/paste schema (`itisyou.image-context/1`) is produced from
 *    it by `compress.ts` + `serialize.ts`. Never leak model-specific names,
 *    tensor shapes, embeddings or pixels into the public schema.
 *
 * Everything derived from a user's image is untrusted text. It is rendered
 * through React escaping only, and it is never executed, evaluated or used to
 * choose a code path.
 */

/** Internal representation version. Bump on breaking shape changes. */
export const SCHEMA_VERSION = "1.0" as const;

/** Public, documented schema identifier used in the copyable JSON. */
export const SCHEMA_ID = "itisyou.image-context/1" as const;

/**
 * Probable kind of image. Always accompanied by a confidence — the classifier
 * must never assert a false absolute.
 */
export type ImageKind =
  | "photo"
  | "screenshot"
  | "document"
  | "diagram"
  | "mixed"
  | "unknown";

/**
 * Coarse confidence bucket, used where a backend genuinely does not expose a
 * calibrated numeric confidence. Do not invent numbers to fill this in.
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

/** How deep the local analysis goes. Modes change local work, never a backend. */
export type AnalysisMode = "fast" | "balanced" | "detailed";

/** User-selectable output representations. */
export type OutputFormat =
  | "compact"
  | "balanced"
  | "detailed"
  | "tagged"
  | "raw-ocr";

/** Which local runtime actually performed the analysis. */
export type ProcessingRuntime = "webgpu" | "wasm" | "minimal";

/** Where a piece of evidence came from. Kept internally, dropped in compact. */
export type EvidenceSource = "detector" | "caption" | "ocr" | "heuristic";

/**
 * Bounding box normalised to the [0,1] range with a top-left origin, so boxes
 * stay meaningful after the image is downscaled for inference.
 */
export interface NormalizedBBox {
  /** Left edge, 0 = left of image, 1 = right of image. */
  x: number;
  /** Top edge, 0 = top of image, 1 = bottom of image. */
  y: number;
  /** Width as a fraction of image width. */
  width: number;
  /** Height as a fraction of image height. */
  height: number;
}

/** A block of text recognised by OCR. `text` is preserved exactly. */
export interface OCRBlock {
  id: string;
  /** Exact recognised text. Only control characters are stripped. */
  text: string;
  /** 0–1 where the engine reports one. Absent means "not reported". */
  confidence?: number;
  bbox?: NormalizedBBox;
  /** Zero-based visual line index assigned by the reading-order sorter. */
  line?: number;
  /** Zero-based position in human reading order. */
  order?: number;
}

/** A visually meaningful thing in the image. */
export interface VisualEntity {
  id: string;
  label: string;
  confidence?: number;
  bbox?: NormalizedBBox;
  attributes?: string[];
  source: EvidenceSource;
}

/**
 * A relationship between entities. `description` is what a receiving model
 * reads; the ids are internal provenance.
 */
export interface VisualRelationship {
  id: string;
  /** Human-readable, e.g. "The error banner appears above the Retry button." */
  description: string;
  subjectId?: string;
  objectId?: string;
  source: EvidenceSource;
}

/** Heuristically inferred interface control. Never a DOM reconstruction. */
export interface UIElement {
  id: string;
  kind:
    | "heading"
    | "text"
    | "button"
    | "input"
    | "link"
    | "checkbox"
    | "radio"
    | "tab"
    | "menu"
    | "dialog"
    | "image"
    | "icon"
    | "table"
    | "unknown";
  text?: string;
  bbox?: NormalizedBBox;
  confidence?: number;
}

/** A heading plus the body text that follows it in reading order. */
export interface DocumentSection {
  heading?: string;
  text: string;
}

/** Document-like structure recovered from OCR. Never invented. */
export interface DocumentStructure {
  title?: string;
  sections?: DocumentSection[];
  keyValues?: Array<[string, string]>;
}

/** Signals feeding the image-kind classifier. All values are 0–1 unless noted. */
export interface ClassificationSignals {
  /** Fraction of the image area covered by OCR text boxes. */
  textDensity: number;
  /** Fraction of sampled pixels sitting on a strong luminance edge. */
  edgeDensity: number;
  /** Estimated count of axis-aligned rectangular regions (not a fraction). */
  rectangleCount: number;
  /** Fraction of the image made of large flat single-colour areas. */
  flatRegionRatio: number;
  /** Shannon entropy of the luminance histogram, normalised to 0–1. */
  entropy: number;
  /** Number of OCR text blocks found (not a fraction). */
  textBlockCount?: number;
  /** width / height of the source image. */
  aspectRatio?: number;
}

/** Result of image-kind classification. Always probabilistic. */
export interface Classification {
  kind: ImageKind;
  /** 0–1. Never 1. */
  confidence: number;
  signals: ClassificationSignals;
  /** Per-kind normalised scores, useful as evidence in detailed output. */
  scores: Partial<Record<ImageKind, number>>;
  /** When `kind` is "mixed", the two kinds that were close. */
  mixedOf?: [ImageKind, ImageKind];
}

/** Facts about the file the visitor chose. Never includes the filename. */
export interface SourceMeta {
  type: "image";
  /** MIME type determined from magic bytes, not from the file extension. */
  mime: string;
  width: number;
  height: number;
  sizeBytes: number;
  /** Always true: this pipeline has no server or cloud path at all. */
  localOnly: true;
}

/** Local scene description. Absent in builds without a semantic vision model. */
export interface SceneInfo {
  shortDescription?: string;
  detailedDescription?: string;
}

/** OCR output plus the joined reading-order text. */
export interface TextInfo {
  fullText?: string;
  blocks: OCRBlock[];
}

/** Honest quality reporting. Absent fields mean "not measured". */
export interface QualityInfo {
  overallConfidence?: number;
  ocrConfidence?: number;
  semanticConfidence?: number;
  /** Coarse bucket for display when a number would imply false precision. */
  level?: ConfidenceLevel;
}

/** What ran, for how long, and with which model artefacts. */
export interface ProcessingInfo {
  runtime: ProcessingRuntime;
  durationMs?: number;
  modelIds?: string[];
  mode?: AnalysisMode;
  /** True when the analysis copy was downscaled from the source dimensions. */
  downscaled?: boolean;
  /** Longest edge in px of the bitmap actually analysed. */
  analysisMaxEdgePx?: number;
}

/**
 * The merged internal representation. Everything the UI shows and everything
 * the serializers emit is derived from exactly this object.
 */
export interface AnalysisDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  source: SourceMeta;
  classification: Classification;
  scene: SceneInfo;
  text: TextInfo;
  entities: VisualEntity[];
  relationships: VisualRelationship[];
  ui?: { elements: UIElement[] };
  document?: DocumentStructure;
  quality: QualityInfo;
  /** Plain-English statements about what this representation cannot tell you. */
  limitations: string[];
  processing: ProcessingInfo;
}

/** Options for a single analysis run. */
export interface AnalyzeImageOptions {
  mode: AnalysisMode;
  /** Tesseract language code, e.g. "eng". */
  ocrLanguage: string;
  preferWebGPU: boolean;
}

/** Progress reported while an analysis runs. */
export interface AnalysisProgress {
  /** "model" = downloading/initialising assets, "analysis" = actual work. */
  kind: "model" | "analysis";
  /** Machine-readable stage id. */
  stage: string;
  /** Human-readable label, e.g. "Reading text". */
  label: string;
  /** 0–1, or -1 when genuinely indeterminate. */
  progress: number;
}

/** Human-readable stage labels. Kept here so worker and UI cannot drift. */
export const STAGE_LABELS: Record<string, string> = {
  validate: "Checking the image",
  prepare: "Preparing image",
  "ocr-load": "Loading local OCR engine",
  ocr: "Reading text",
  semantic: "Understanding scene",
  signals: "Measuring layout",
  heuristics: "Finding important elements",
  merge: "Building compact AI context",
  done: "Ready",
};
