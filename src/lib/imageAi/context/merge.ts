/**
 * Evidence merger — assembles the `AnalysisDocument`.
 *
 * Every analyzer produces its own partial view; this module reconciles them
 * into the single internal representation that the serializers read. It is
 * pure: given the same inputs it produces the same document, which is what
 * makes the output deterministic and the whole pipeline testable in Node.
 *
 * The merger is also where honesty is enforced. It builds the `limitations`
 * list from what actually happened during the run — an absent semantic model,
 * a failed OCR pass, a downscaled image, low contrast — rather than from a
 * fixed string, so the caveats a visitor copies always match their image.
 */

import { classifyImage } from "./classify";
import { countSuppressedLabels, dedupeEntities, dedupeOcrBlocks } from "./dedupe";
import { inferDiagramNotes } from "./diagram";
import { inferDocumentStructure, uncertainLines } from "./document";
import { roundConfidence } from "./geometry";
import { findImportantLines } from "./important";
import { readingOrderText, sortReadingOrder } from "./readingOrder";
import { sanitizeLine, sanitizeText, TRUNCATION_MARKER } from "./sanitize";
import { buildClassificationSignals, type PixelSignals } from "./signals";
import { inferUiElements } from "./ui";
import type {
  AnalysisDocument,
  AnalysisMode,
  ConfidenceLevel,
  OCRBlock,
  ProcessingRuntime,
  SourceMeta,
  UIElement,
  VisualEntity,
  VisualRelationship,
} from "./types";
import { SCHEMA_VERSION } from "./types";
import type { OcrOutcome } from "./ocr/types";
import type { SemanticResult, SemanticStatus } from "./vision/types";

export interface MergeInput {
  source: SourceMeta;
  /** Pixel statistics, or null when no pixel pass could run. */
  pixel: PixelSignals | null;
  ocr: OcrOutcome;
  semantic: SemanticResult | null;
  semanticStatus: SemanticStatus;
  mode: AnalysisMode;
  runtime: ProcessingRuntime;
  durationMs?: number;
  modelIds?: string[];
  downscaled?: boolean;
  analysisMaxEdgePx?: number;
  /** Validation warnings, e.g. a declared MIME type that did not match. */
  warnings?: string[];
}

/** Cap on limitations shown; beyond this the list stops being read. */
const MAX_LIMITATIONS = 12;

/** Fraction of blocks below the threshold that triggers a warning. */
const LOW_CONFIDENCE_SHARE = 0.15;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

/** The one caveat that is always true of this tool's output. */
export const BASE_LIMITATION =
  "This is a compact interpretation of the image, not a copy of it. Visual detail that was not recognised is absent rather than described.";

function meanConfidence(blocks: OCRBlock[]): number | undefined {
  const values = blocks
    .map((b) => b.confidence)
    .filter((c): c is number => typeof c === "number");
  if (values.length === 0) return undefined;
  return roundConfidence(values.reduce((a, b) => a + b, 0) / values.length);
}

function confidenceLevel(value: number | undefined): ConfidenceLevel {
  if (value === undefined) return "unknown";
  if (value >= 0.85) return "high";
  if (value >= 0.65) return "medium";
  return "low";
}

/** Clean and de-duplicate raw OCR blocks, then put them in reading order. */
export function prepareBlocks(blocks: OCRBlock[]): OCRBlock[] {
  const sanitized = blocks
    .map((block) => ({ ...block, text: sanitizeLine(block.text) }))
    .filter((block) => block.text.length > 0);
  return sortReadingOrder(dedupeOcrBlocks(sanitized));
}

/** Entities recovered from text alone: error and warning banners. */
export function entitiesFromText(blocks: OCRBlock[]): VisualEntity[] {
  const important = findImportantLines(blocks);
  const byId = new Map(blocks.map((b) => [b.id, b]));
  return important.map((line, index) => {
    const block = line.blockId ? byId.get(line.blockId) : undefined;
    return {
      id: `text-entity-${index + 1}`,
      label: line.importance === "error" ? "error message" : "warning message",
      // The exact recognised string is kept as an attribute so it is never
      // paraphrased into the label.
      attributes: [line.text],
      bbox: block?.bbox,
      confidence: block?.confidence,
      source: "ocr" as const,
    };
  });
}

/**
 * Spatial relationships that can be stated as fact from geometry alone.
 * Nothing here infers causation, intent or interaction.
 */
export function spatialRelationships(
  entities: VisualEntity[],
  elements: UIElement[],
  limit = 3,
): VisualRelationship[] {
  const out: VisualRelationship[] = [];
  const buttons = elements.filter((e) => e.kind === "button" && e.bbox && e.text);
  for (const entity of entities) {
    if (!entity.bbox) continue;
    for (const button of buttons) {
      if (out.length >= limit) return out;
      const box = button.bbox;
      if (!box) continue;
      const entityBottom = entity.bbox.y + entity.bbox.height;
      if (entityBottom > box.y) continue;
      const text = entity.attributes?.[0];
      if (!text) continue;
      out.push({
        id: `rel-${out.length + 1}`,
        description: `The ${entity.label} "${text}" appears above the button "${button.text}".`,
        subjectId: entity.id,
        objectId: button.id,
        source: "heuristic",
      });
    }
  }
  return out;
}

/**
 * Build the limitations list from what actually happened. Order is stable and
 * meaningful: what is missing first, then what may be wrong, then the
 * permanent caveat.
 */
export function buildLimitations(
  input: MergeInput,
  blocks: OCRBlock[],
  extra: string[] = [],
  /** The sanitised text that will actually be published, when known. */
  publishedText?: string,
): string[] {
  const out: string[] = [];

  if (!input.semanticStatus.available) out.push(input.semanticStatus.reason);

  if (input.ocr.status === "unavailable") {
    out.push(
      input.ocr.reason ??
        "Local text recognition could not run on this device, so no text was extracted.",
    );
  } else if (input.ocr.status === "failed") {
    out.push(
      input.ocr.reason ??
        "Local text recognition failed, so no text was extracted from this image.",
    );
  } else if (input.ocr.status === "ok" && blocks.length === 0) {
    out.push("No readable text was found in this image.");
  }

  const uncertain = uncertainLines(blocks, {
    uncertainBelow: LOW_CONFIDENCE_THRESHOLD,
  });
  if (blocks.length > 0 && uncertain.length / blocks.length > LOW_CONFIDENCE_SHARE) {
    out.push(
      `${uncertain.length} of ${blocks.length} recognised lines had low confidence. Their exact wording may be wrong; they were kept as recognised rather than corrected.`,
    );
  }

  if (input.downscaled && input.analysisMaxEdgePx) {
    out.push(
      `The image was analysed at ${input.analysisMaxEdgePx}px on its longest edge, so very small text may be missing. The original file was not modified.`,
    );
  }

  if (input.pixel?.hasTransparency) {
    out.push(
      "The image contains transparent areas, which were treated as background during analysis.",
    );
  }

  if (input.pixel && input.pixel.contrast < 0.12) {
    out.push(
      "The image has low contrast, which reduces text recognition accuracy.",
    );
  }

  const finalText = publishedText ?? sanitizeText(input.ocr.fullText);
  if (finalText.endsWith(TRUNCATION_MARKER)) {
    out.push(
      "The recognised text was longer than this tool keeps and has been truncated at the end.",
    );
  }

  for (const item of extra) out.push(item);

  for (const warning of input.warnings ?? []) out.push(warning);

  out.push(BASE_LIMITATION);

  // De-duplicate while preserving order, then cap.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of out) {
    const text = sanitizeLine(item);
    if (text.length === 0 || seen.has(text)) continue;
    seen.add(text);
    unique.push(text);
  }
  return unique.slice(0, MAX_LIMITATIONS);
}

/**
 * Merge every analyzer's output into the internal representation.
 *
 * Classification happens here rather than earlier because text density is one
 * of its strongest signals and that is only known once OCR has run.
 */
export function buildAnalysisDocument(input: MergeInput): AnalysisDocument {
  const blocks = prepareBlocks(input.ocr.blocks);

  const signals = buildClassificationSignals(
    input.pixel,
    blocks,
    input.source.width,
    input.source.height,
  );
  const classification = classifyImage(signals);

  const textEntities = entitiesFromText(blocks);
  const semanticEntities = input.semantic?.entities ?? [];
  const allEntities = [...textEntities, ...semanticEntities];
  const entities = dedupeEntities(allEntities);
  const suppressed = countSuppressedLabels(allEntities, entities);

  const kind = classification.kind;
  const textCentric =
    kind === "screenshot" ||
    kind === "document" ||
    kind === "mixed" ||
    (kind === "unknown" && blocks.length > 0);

  const elements =
    textCentric && kind !== "document" ? inferUiElements(blocks) : [];

  const documentStructure =
    kind === "document" || kind === "mixed"
      ? inferDocumentStructure(blocks)
      : undefined;

  const diagram =
    kind === "diagram" ? inferDiagramNotes(blocks, signals) : undefined;

  const relationships = [
    ...(input.semantic?.relationships ?? []),
    ...spatialRelationships(entities, elements),
  ];

  const extraLimitations: string[] = [];
  if (diagram) extraLimitations.push(...diagram.limitations);
  if (elements.some((e) => e.kind !== "text")) {
    extraLimitations.push(
      "Interface elements were guessed from text and layout. The tool cannot see element types, states or anything not drawn in the image.",
    );
  }
  for (const { label, dropped } of suppressed) {
    extraLimitations.push(
      `${dropped} additional "${label}" detections were merged or dropped as duplicates.`,
    );
  }
  for (const warning of input.semantic?.warnings ?? []) {
    extraLimitations.push(sanitizeLine(warning));
  }

  const ocrConfidence = input.ocr.meanConfidence ?? meanConfidence(blocks);
  const fullText =
    input.ocr.fullText.length > 0
      ? sanitizeText(input.ocr.fullText)
      : sanitizeText(readingOrderText(blocks));

  const document: AnalysisDocument = {
    schemaVersion: SCHEMA_VERSION,
    source: input.source,
    classification,
    scene: {
      shortDescription: input.semantic?.shortCaption
        ? sanitizeLine(input.semantic.shortCaption)
        : undefined,
      detailedDescription: input.semantic?.detailedCaption
        ? sanitizeLine(input.semantic.detailedCaption)
        : undefined,
    },
    text: { fullText: fullText.length > 0 ? fullText : undefined, blocks },
    entities,
    relationships,
    quality: {
      ocrConfidence,
      // No semantic engine ran, so there is no semantic confidence to report.
      // An invented number here would be exactly the false precision the
      // specification forbids.
      level: confidenceLevel(ocrConfidence),
    },
    limitations: buildLimitations(input, blocks, extraLimitations, fullText),
    processing: {
      runtime: input.runtime,
      durationMs: input.durationMs,
      modelIds: input.modelIds && input.modelIds.length > 0 ? input.modelIds : undefined,
      mode: input.mode,
      downscaled: input.downscaled,
      analysisMaxEdgePx: input.analysisMaxEdgePx,
    },
  };

  if (elements.length > 0) document.ui = { elements };
  if (documentStructure && Object.keys(documentStructure).length > 0) {
    document.document = documentStructure;
  }
  return document;
}
