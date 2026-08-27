/**
 * Screenshot / interface heuristics.
 *
 * This turns OCR blocks and their geometry into a list of probable interface
 * elements. It is explicitly NOT a DOM reconstruction: nothing here can see
 * markup, roles, states or anything that is not drawn as pixels, and the
 * output says so.
 *
 * Honesty rules followed here:
 *  - element text is the exact OCR string, never tidied or re-cased;
 *  - no numeric confidence is attached, because these are hand-written rules
 *    with no calibration behind them (specification §30) — the limitations
 *    list carries that caveat instead;
 *  - element kinds that genuinely cannot be seen in a flat image (checkbox
 *    state, radio selection, menu vs dialog) are never guessed.
 */

import { describePosition } from "./geometry";
import { looksLikeAction } from "./important";
import type { NormalizedBBox, OCRBlock, UIElement } from "./types";

export interface UiHeuristicOptions {
  /** Cap on returned elements, newest evidence dropped last. */
  maxElements?: number;
}

const DEFAULT_MAX_ELEMENTS = 60;

/** A heading is this much taller than the median line. */
const HEADING_HEIGHT_RATIO = 1.35;

/** Column left edges within this fraction of image width count as aligned. */
const COLUMN_ALIGNMENT_TOLERANCE = 0.02;

const URL_PATTERN =
  /^(?:https?:\/\/|www\.)\S+$|^[a-z0-9-]+\.(?:com|net|org|io|dev|app|co\.uk|uk)(?:\/\S*)?$/i;

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/** Blocks grouped by their assigned line number, ignoring unpositioned ones. */
function byLine(blocks: OCRBlock[]): Map<number, OCRBlock[]> {
  const lines = new Map<number, OCRBlock[]>();
  for (const block of blocks) {
    if (block.line === undefined || !block.bbox) continue;
    const list = lines.get(block.line) ?? [];
    list.push(block);
    lines.set(block.line, list);
  }
  for (const list of lines.values()) {
    list.sort((a, b) => (a.bbox as NormalizedBBox).x - (b.bbox as NormalizedBBox).x);
  }
  return lines;
}

/**
 * Find table-like structures: three or more lines whose blocks start at the
 * same left edges. Returns the ids of participating blocks.
 */
export function findTableBlockIds(blocks: OCRBlock[]): Set<string> {
  const lines = byLine(blocks);
  const multiColumn = [...lines.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => a[0] - b[0]);

  const ids = new Set<string>();
  for (let i = 0; i < multiColumn.length; i += 1) {
    const run: OCRBlock[][] = [multiColumn[i][1]];
    const reference = multiColumn[i][1].map((b) => (b.bbox as NormalizedBBox).x);
    for (let j = i + 1; j < multiColumn.length; j += 1) {
      const candidate = multiColumn[j][1];
      const xs = candidate.map((b) => (b.bbox as NormalizedBBox).x);
      const aligned =
        xs.length >= 2 &&
        reference.length >= 2 &&
        xs
          .slice(0, Math.min(xs.length, reference.length))
          .every((x, k) => Math.abs(x - reference[k]) <= COLUMN_ALIGNMENT_TOLERANCE);
      if (!aligned) break;
      run.push(candidate);
    }
    if (run.length >= 3) {
      for (const line of run) for (const block of line) ids.add(block.id);
      i += run.length - 1;
    }
  }
  return ids;
}

/** Bounding box that contains all of the supplied boxes. */
export function unionBox(boxes: NormalizedBBox[]): NormalizedBBox | undefined {
  if (boxes.length === 0) return undefined;
  let left = 1;
  let top = 1;
  let right = 0;
  let bottom = 0;
  for (const box of boxes) {
    left = Math.min(left, box.x);
    top = Math.min(top, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Infer interface elements from recognised text.
 *
 * Expects blocks already sorted into reading order (so `line` is populated).
 */
export function inferUiElements(
  blocks: OCRBlock[],
  options: UiHeuristicOptions = {},
): UIElement[] {
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
  const positioned = blocks.filter((b) => b.bbox !== undefined);
  const median = medianOf(positioned.map((b) => (b.bbox as NormalizedBBox).height));
  const lines = byLine(blocks);
  const tableIds = findTableBlockIds(blocks);

  const elements: UIElement[] = [];

  if (tableIds.size > 0) {
    const boxes = blocks
      .filter((b) => tableIds.has(b.id) && b.bbox)
      .map((b) => b.bbox as NormalizedBBox);
    const box = unionBox(boxes);
    elements.push({ id: "ui-table-1", kind: "table", bbox: box });
  }

  for (const block of blocks) {
    if (elements.length >= maxElements) break;
    const text = block.text.trim();
    if (text.length === 0) continue;
    if (tableIds.has(block.id)) continue;

    const box = block.bbox;
    const id = `ui-${block.id}`;

    if (URL_PATTERN.test(text)) {
      elements.push({ id, kind: "link", text, bbox: box });
      continue;
    }

    if (looksLikeAction(text)) {
      elements.push({ id, kind: "button", text, bbox: box });
      continue;
    }

    // A trailing colon with nothing to its right on the same line reads as a
    // field label. The input itself is invisible to OCR, so the element is
    // recorded as an input with the label text and no claim about its value.
    if (/[:：]$/.test(text) && wordCount(text) <= 5) {
      const siblings = block.line !== undefined ? lines.get(block.line) ?? [] : [];
      const hasRightNeighbour = siblings.some(
        (other) =>
          other.id !== block.id &&
          other.bbox !== undefined &&
          box !== undefined &&
          other.bbox.x > box.x + box.width / 2,
      );
      if (!hasRightNeighbour) {
        elements.push({ id, kind: "input", text, bbox: box });
        continue;
      }
    }

    if (
      box !== undefined &&
      median > 0 &&
      box.height >= median * HEADING_HEIGHT_RATIO &&
      text.length <= 80 &&
      wordCount(text) <= 12
    ) {
      elements.push({ id, kind: "heading", text, bbox: box });
      continue;
    }

    elements.push({ id, kind: "text", text, bbox: box });
  }

  return elements;
}

/** One-line description used by the tagged-text format. */
export function describeUiElement(element: UIElement): string {
  const quotedText = element.text ? ` "${element.text}"` : "";
  const where = element.bbox ? ` at ${describePosition(element.bbox)}` : "";
  return `${element.kind}${quotedText}${where}`;
}

/**
 * Elements worth listing in compact output: everything except plain text,
 * which is already carried by the TEXT section.
 */
export function significantUiElements(elements: UIElement[]): UIElement[] {
  return elements.filter((e) => e.kind !== "text");
}
