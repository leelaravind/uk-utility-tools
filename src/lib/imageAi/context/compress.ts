/**
 * Semantic compression — turning the internal document into the public shapes.
 *
 * The compression rules are the specification's §29 list, implemented so they
 * can be read off the code:
 *
 *   1  remove empty fields          -> `omitEmpty` on every builder
 *   2  normalise whitespace         -> done upstream in sanitize.ts
 *   3  deduplicate OCR lines        -> `uniqueLines`
 *   4  collapse repeated objects    -> `dedupeEntities` upstream
 *   5  remove low-confidence noise  -> upstream filters
 *   6  confidence to 2 decimals     -> `roundConfidence`
 *   7  coordinates to 3 decimals    -> `boxToArray`
 *   8  preserve exact text/numbers  -> nothing here rewrites a string
 *   9  limit repeated backgrounds   -> per-label caps upstream
 *  10  one good scene sentence      -> compact carries the short caption only
 *  11  boxes as arrays in compact   -> `boxToArray`
 *  12  no model ids or timings      -> compact omits `processing` entirely
 *  13  never drop an error message  -> `selectLines` protects them first
 *  14  never rewrite OCR text       -> enforced by construction and by tests
 *
 * Rule 13 is the one with teeth: when the line budget is exceeded, protected
 * lines (errors, warnings, codes, URLs, money, dates) are taken first and the
 * output states how many lines were left out, so the visitor is never told a
 * truncated list is the whole story.
 */

import { uniqueLines } from "./dedupe";
import { boxToArray, roundConfidence } from "./geometry";
import { classifyLine, isProtected } from "./important";
import type {
  AnalysisDocument,
  ImageKind,
  NormalizedBBox,
  OCRBlock,
} from "./types";
import { SCHEMA_ID } from "./types";

/** Per-format budgets. Compact is for pasting; detailed is for inspection. */
export interface CompressionBudget {
  maxTextLines: number;
  maxObjects: number;
  maxUiElements: number;
  maxRelations: number;
  maxLimitations: number;
  maxKeyValues: number;
  maxSections: number;
}

export const COMPACT_BUDGET: CompressionBudget = {
  maxTextLines: 40,
  maxObjects: 12,
  maxUiElements: 12,
  maxRelations: 6,
  maxLimitations: 6,
  maxKeyValues: 12,
  maxSections: 6,
};

export const BALANCED_BUDGET: CompressionBudget = {
  maxTextLines: 120,
  maxObjects: 30,
  maxUiElements: 40,
  maxRelations: 12,
  maxLimitations: 10,
  maxKeyValues: 40,
  maxSections: 20,
};

export const DETAILED_BUDGET: CompressionBudget = {
  maxTextLines: 400,
  maxObjects: 80,
  maxUiElements: 120,
  maxRelations: 40,
  maxLimitations: 12,
  maxKeyValues: 120,
  maxSections: 60,
};

export interface SelectedLines {
  blocks: OCRBlock[];
  /** How many blocks the budget left out. Zero when everything fits. */
  dropped: number;
}

/**
 * Choose which blocks survive a line budget.
 *
 * Protected lines are taken first regardless of position, then the remaining
 * budget is filled in reading order, then the survivors are put back into
 * reading order so the result still reads like the image.
 */
export function selectLines(blocks: OCRBlock[], max: number): SelectedLines {
  if (blocks.length <= max) return { blocks, dropped: 0 };

  const protectedBlocks: OCRBlock[] = [];
  const ordinary: OCRBlock[] = [];
  for (const block of blocks) {
    if (isProtected(classifyLine(block.text))) protectedBlocks.push(block);
    else ordinary.push(block);
  }

  const kept = new Set<OCRBlock>();
  for (const block of protectedBlocks) {
    if (kept.size >= max) break;
    kept.add(block);
  }
  for (const block of ordinary) {
    if (kept.size >= max) break;
    kept.add(block);
  }

  const selected = blocks.filter((b) => kept.has(b));
  return { blocks: selected, dropped: blocks.length - selected.length };
}

/** Text lines for output: de-duplicated, budgeted, exact strings preserved. */
export function textLines(
  doc: AnalysisDocument,
  budget: CompressionBudget,
): { lines: string[]; dropped: number } {
  const { blocks, dropped } = selectLines(doc.text.blocks, budget.maxTextLines);
  return { lines: uniqueLines(blocks.map((b) => b.text)), dropped };
}

function boxOrNull(
  box: NormalizedBBox | undefined,
): [number, number, number, number] | null {
  return box ? boxToArray(box) : null;
}

/** Drop keys whose value is undefined, null, an empty array or empty string. */
function omitEmpty<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.length === 0) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}

/** Compact object triple: `[label, confidence|null, box|null]`. */
export type CompactObject = [
  string,
  number | null,
  [number, number, number, number] | null,
];

/** Compact interface pair: `[kind, text]`. */
export type CompactUiElement = [string, string];

export interface CompactContext {
  v: 1;
  kind: ImageKind;
  conf?: number;
  size: [number, number];
  scene?: string;
  text?: string[];
  objects?: CompactObject[];
  ui?: CompactUiElement[];
  relations?: string[];
  limits?: string[];
}

/**
 * Smallest useful representation. Carries meaning and exact visible text; no
 * provenance, no timings, no model ids, no per-block geometry.
 */
export function toCompact(doc: AnalysisDocument): CompactContext {
  const budget = COMPACT_BUDGET;
  const { lines, dropped } = textLines(doc, budget);

  const objects: CompactObject[] = doc.entities
    .slice(0, budget.maxObjects)
    .map((entity) => {
      const label = entity.attributes?.[0]
        ? `${entity.label}: ${entity.attributes[0]}`
        : entity.label;
      return [
        label,
        entity.confidence === undefined ? null : roundConfidence(entity.confidence),
        boxOrNull(entity.bbox),
      ];
    });

  const ui: CompactUiElement[] = (doc.ui?.elements ?? [])
    .filter((element) => element.kind !== "text" && element.text)
    .slice(0, budget.maxUiElements)
    .map((element) => [element.kind, element.text as string]);

  const limits = [...doc.limitations];
  if (dropped > 0) {
    limits.unshift(
      `${dropped} further recognised lines were left out of this compact output. Use the Detailed or Raw OCR view for the full text.`,
    );
  }

  const compact: CompactContext = {
    v: 1,
    kind: doc.classification.kind,
    conf: roundConfidence(doc.classification.confidence),
    size: [doc.source.width, doc.source.height],
    scene: doc.scene.shortDescription,
    text: lines,
    objects,
    ui,
    relations: doc.relationships
      .slice(0, budget.maxRelations)
      .map((r) => r.description),
    limits: limits.slice(0, budget.maxLimitations),
  };

  // `v`, `kind` and `size` are always present; everything else is dropped when
  // there is no evidence for it rather than emitted as null.
  return {
    v: compact.v,
    kind: compact.kind,
    size: compact.size,
    ...omitEmpty({
      conf: compact.conf,
      scene: compact.scene,
      text: compact.text,
      objects: compact.objects,
      ui: compact.ui,
      relations: compact.relations,
      limits: compact.limits,
    }),
  } as CompactContext;
}

export interface PublicTextItem {
  text: string;
  box?: [number, number, number, number];
  confidence?: number;
}

export interface PublicObject {
  label: string;
  text?: string;
  box?: [number, number, number, number];
  confidence?: number;
}

export interface PublicUiElement {
  type: string;
  text?: string;
  box?: [number, number, number, number];
}

export interface BalancedContext {
  schema: typeof SCHEMA_ID;
  type: ImageKind;
  confidence?: number;
  image: { width: number; height: number };
  scene?: string;
  text?: PublicTextItem[];
  objects?: PublicObject[];
  ui?: PublicUiElement[];
  document?: {
    title?: string;
    sections?: Array<{ heading?: string; text: string }>;
    key_values?: Array<[string, string]>;
  };
  relations?: string[];
  limitations?: string[];
}

function publicText(
  doc: AnalysisDocument,
  budget: CompressionBudget,
  withConfidence: boolean,
): { items: PublicTextItem[]; dropped: number } {
  const { blocks, dropped } = selectLines(doc.text.blocks, budget.maxTextLines);
  const items = blocks.map((block) => {
    const item: PublicTextItem = { text: block.text };
    if (block.bbox) item.box = boxToArray(block.bbox);
    if (withConfidence && block.confidence !== undefined) {
      item.confidence = roundConfidence(block.confidence);
    }
    return item;
  });
  return { items, dropped };
}

function publicDocument(
  doc: AnalysisDocument,
  budget: CompressionBudget,
): BalancedContext["document"] | undefined {
  if (!doc.document) return undefined;
  const structure = omitEmpty({
    title: doc.document.title,
    sections: doc.document.sections?.slice(0, budget.maxSections),
    key_values: doc.document.keyValues?.slice(0, budget.maxKeyValues),
  });
  return Object.keys(structure).length > 0
    ? (structure as BalancedContext["document"])
    : undefined;
}

function buildPublic(
  doc: AnalysisDocument,
  budget: CompressionBudget,
  withConfidence: boolean,
): BalancedContext {
  const { items, dropped } = publicText(doc, budget, withConfidence);

  const objects: PublicObject[] = doc.entities
    .slice(0, budget.maxObjects)
    .map((entity) =>
      omitEmpty({
        label: entity.label,
        text: entity.attributes?.[0],
        box: entity.bbox ? boxToArray(entity.bbox) : undefined,
        confidence:
          withConfidence && entity.confidence !== undefined
            ? roundConfidence(entity.confidence)
            : undefined,
      }) as PublicObject,
    );

  const ui: PublicUiElement[] = (doc.ui?.elements ?? [])
    .slice(0, budget.maxUiElements)
    .map((element) =>
      omitEmpty({
        type: element.kind,
        text: element.text,
        box: element.bbox ? boxToArray(element.bbox) : undefined,
      }) as PublicUiElement,
    );

  const limitations = [...doc.limitations];
  if (dropped > 0) {
    limitations.unshift(
      `${dropped} further recognised lines were left out of this view. Use Raw OCR for the full text.`,
    );
  }

  return {
    schema: SCHEMA_ID,
    type: doc.classification.kind,
    ...omitEmpty({
      confidence: roundConfidence(doc.classification.confidence),
    }),
    image: { width: doc.source.width, height: doc.source.height },
    ...omitEmpty({
      scene: doc.scene.shortDescription,
      text: items,
      objects,
      ui,
      document: publicDocument(doc, budget),
      relations: doc.relationships
        .slice(0, budget.maxRelations)
        .map((r) => r.description),
      limitations: limitations.slice(0, budget.maxLimitations),
    }),
  } as BalancedContext;
}

/** Readable structured JSON: the documented public schema. */
export function toBalanced(doc: AnalysisDocument): BalancedContext {
  return buildPublic(doc, BALANCED_BUDGET, false);
}

export interface DetailedContext extends BalancedContext {
  scene_detailed?: string;
  quality?: {
    ocr_confidence?: number;
    level?: string;
  };
  classification?: {
    kind: ImageKind;
    confidence: number;
    signals: Record<string, number | undefined>;
    scores: Partial<Record<ImageKind, number>>;
  };
  processing?: {
    runtime: string;
    mode?: string;
    duration_ms?: number;
    analysis_max_edge_px?: number;
    downscaled?: boolean;
    model_ids?: string[];
  };
}

/**
 * Higher-information view. Adds confidence, classification evidence and
 * processing metadata. Explicitly not optimised for token count.
 */
export function toDetailed(doc: AnalysisDocument): DetailedContext {
  const base = buildPublic(doc, DETAILED_BUDGET, true);
  return {
    ...base,
    ...omitEmpty({
      scene_detailed: doc.scene.detailedDescription,
      quality: Object.keys(
        omitEmpty({
          ocr_confidence: doc.quality.ocrConfidence,
          level: doc.quality.level,
        }),
      ).length
        ? (omitEmpty({
            ocr_confidence: doc.quality.ocrConfidence,
            level: doc.quality.level,
          }) as DetailedContext["quality"])
        : undefined,
      classification: {
        kind: doc.classification.kind,
        confidence: roundConfidence(doc.classification.confidence),
        signals: {
          text_density: doc.classification.signals.textDensity,
          edge_density: doc.classification.signals.edgeDensity,
          rectangle_count: doc.classification.signals.rectangleCount,
          flat_region_ratio: doc.classification.signals.flatRegionRatio,
          entropy: doc.classification.signals.entropy,
          text_block_count: doc.classification.signals.textBlockCount,
        },
        scores: doc.classification.scores,
      },
      processing: omitEmpty({
        runtime: doc.processing.runtime,
        mode: doc.processing.mode,
        duration_ms: doc.processing.durationMs,
        analysis_max_edge_px: doc.processing.analysisMaxEdgePx,
        downscaled: doc.processing.downscaled,
        model_ids: doc.processing.modelIds,
      }) as DetailedContext["processing"],
    }),
  } as DetailedContext;
}
