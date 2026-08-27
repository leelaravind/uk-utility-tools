/**
 * De-duplication and confidence filtering.
 *
 * Two different jobs live here and they have different rules:
 *
 *  - OCR blocks: the same string appearing twice in *different places* is real
 *    evidence (a screenshot can genuinely have two "Retry" buttons), so blocks
 *    are only merged when they also overlap. Only the flat line list used by
 *    the compact output collapses repeats globally.
 *  - Entities: a detector emitting eight overlapping boxes for one dog is
 *    noise, so overlapping same-label entities are suppressed and repeated
 *    labels are capped.
 *
 * Nothing here rewrites text. A block is either kept exactly as recognised or
 * dropped as a duplicate of an identical block.
 */

import { boxIou } from "./geometry";
import { isLikelyOcrNoise, normalizeWhitespace } from "./sanitize";
import type { NormalizedBBox, OCRBlock, VisualEntity } from "./types";

/** Overlap above which two same-text blocks are considered the same block. */
const DEFAULT_TEXT_IOU = 0.5;

/** Overlap above which two same-label entities are considered the same thing. */
const DEFAULT_ENTITY_IOU = 0.55;

/** Entities below this confidence are dropped from the default output. */
export const DEFAULT_MIN_ENTITY_CONFIDENCE = 0.35;

/** OCR blocks below this confidence are dropped as unreadable. */
export const DEFAULT_MIN_OCR_CONFIDENCE = 0.3;

/** Maximum instances of one label kept before the rest are summarised away. */
export const DEFAULT_MAX_PER_LABEL = 5;

/**
 * Comparison key for text. Case and surrounding punctuation vary between OCR
 * passes of the same glyphs; the underlying string is still stored untouched.
 */
export function textKey(text: string): string {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/^[\s"'`([{<]+|[\s"'`)\]}>.,;:!?]+$/g, "");
}

export interface DedupeOcrOptions {
  /** Overlap threshold for treating identical text as the same block. */
  iouThreshold?: number;
  /** Drop blocks whose confidence is below this. Undefined keeps everything. */
  minConfidence?: number;
  /** Drop blocks that are mostly punctuation noise. Default true. */
  dropNoise?: boolean;
}

/**
 * Remove duplicate OCR blocks. Order is preserved: the first occurrence of a
 * block wins, and a later duplicate only disappears if it overlaps the one
 * that is already kept.
 */
export function dedupeOcrBlocks(
  blocks: OCRBlock[],
  options: DedupeOcrOptions = {},
): OCRBlock[] {
  const iouThreshold = options.iouThreshold ?? DEFAULT_TEXT_IOU;
  const dropNoise = options.dropNoise ?? true;
  const kept: OCRBlock[] = [];
  const byKey = new Map<string, OCRBlock[]>();

  for (const block of blocks) {
    const text = normalizeWhitespace(block.text);
    if (text.length === 0) continue;
    if (dropNoise && isLikelyOcrNoise(text)) continue;
    if (
      options.minConfidence !== undefined &&
      block.confidence !== undefined &&
      block.confidence < options.minConfidence
    ) {
      continue;
    }

    const key = textKey(block.text);
    const siblings = byKey.get(key);
    if (siblings) {
      const duplicate = siblings.some((other) => {
        // Without geometry we cannot prove they are different places, so the
        // conservative reading of "same string, unknown position" is one item.
        if (!block.bbox || !other.bbox) return true;
        return boxIou(block.bbox, other.bbox) >= iouThreshold;
      });
      if (duplicate) continue;
      siblings.push(block);
    } else {
      byKey.set(key, [block]);
    }
    kept.push(block);
  }

  return kept;
}

/** Drop blocks the engine itself reported as barely legible. */
export function filterByConfidence(
  blocks: OCRBlock[],
  minConfidence = DEFAULT_MIN_OCR_CONFIDENCE,
): OCRBlock[] {
  return blocks.filter(
    (b) => b.confidence === undefined || b.confidence >= minConfidence,
  );
}

/**
 * Collapse a list of text lines to unique lines, preserving first-seen order.
 * Used by the compact output, where the same string twice adds tokens without
 * adding information.
 */
export function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const key = textKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export interface DedupeEntityOptions {
  iouThreshold?: number;
  minConfidence?: number;
  maxPerLabel?: number;
}

function labelKey(label: string): string {
  return normalizeWhitespace(label).toLowerCase();
}

function confidenceOf(entity: VisualEntity): number {
  // An entity with no reported confidence is not assumed to be perfect; it
  // sorts below anything that actually claims a score.
  return entity.confidence ?? 0.5;
}

function areaOf(box: NormalizedBBox | undefined): number {
  return box ? Math.max(0, box.width) * Math.max(0, box.height) : 0;
}

/**
 * Non-maximum suppression per label, then a cap on repeats.
 *
 * Suppression only ever removes an entity that overlaps a stronger entity with
 * the same label, so two separate dogs both survive while eight boxes around
 * one dog collapse to the best one.
 */
export function dedupeEntities(
  entities: VisualEntity[],
  options: DedupeEntityOptions = {},
): VisualEntity[] {
  const iouThreshold = options.iouThreshold ?? DEFAULT_ENTITY_IOU;
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_ENTITY_CONFIDENCE;
  const maxPerLabel = options.maxPerLabel ?? DEFAULT_MAX_PER_LABEL;

  const eligible = entities.filter(
    (e) => (e.confidence ?? 1) >= minConfidence && e.label.trim().length > 0,
  );

  // Strongest first, with a stable tie-break so output never depends on the
  // detector's emission order.
  const ordered = [...eligible].sort((a, b) => {
    const byConfidence = confidenceOf(b) - confidenceOf(a);
    if (byConfidence !== 0) return byConfidence;
    const byArea = areaOf(b.bbox) - areaOf(a.bbox);
    if (byArea !== 0) return byArea;
    return a.id.localeCompare(b.id);
  });

  const keptByLabel = new Map<string, VisualEntity[]>();
  const kept: VisualEntity[] = [];

  for (const entity of ordered) {
    const key = labelKey(entity.label);
    const siblings = keptByLabel.get(key) ?? [];
    if (siblings.length >= maxPerLabel) continue;
    const suppressed = siblings.some((other) => {
      if (!entity.bbox || !other.bbox) return true;
      return boxIou(entity.bbox, other.bbox) >= iouThreshold;
    });
    if (suppressed) continue;
    siblings.push(entity);
    keptByLabel.set(key, siblings);
    kept.push(entity);
  }

  // Restore the caller's original ordering for the survivors so downstream
  // output is stable and reads in the order evidence was produced.
  const survivors = new Set(kept.map((e) => e.id));
  return entities.filter((e) => survivors.has(e.id));
}

/**
 * How many instances of a label were dropped by the cap, so the limitations
 * list can say so instead of silently under-reporting the scene.
 */
export function countSuppressedLabels(
  before: VisualEntity[],
  after: VisualEntity[],
): Array<{ label: string; dropped: number }> {
  const counts = new Map<string, { label: string; before: number; after: number }>();
  for (const entity of before) {
    const key = labelKey(entity.label);
    const entry = counts.get(key) ?? { label: entity.label, before: 0, after: 0 };
    entry.before += 1;
    counts.set(key, entry);
  }
  for (const entity of after) {
    const key = labelKey(entity.label);
    const entry = counts.get(key);
    if (entry) entry.after += 1;
  }
  return [...counts.values()]
    .filter((entry) => entry.before > entry.after)
    .map((entry) => ({ label: entry.label, dropped: entry.before - entry.after }))
    .sort((a, b) => b.dropped - a.dropped || a.label.localeCompare(b.label));
}
