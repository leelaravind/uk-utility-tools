/**
 * Reading-order sorting for OCR blocks.
 *
 * OCR engines emit blocks in whatever order their layout analyser produced.
 * For an AI to make sense of a screenshot or an invoice, the text has to be in
 * the order a person would read it: down the page, and left to right within a
 * visual line.
 *
 * Blocks without geometry cannot be placed, so they are kept in their original
 * relative order and appended at the end rather than being dropped — losing a
 * line of an error message to tidy the ordering would be the wrong trade.
 */

import { boxCenterY, verticalOverlapRatio } from "./geometry";
import type { NormalizedBBox, OCRBlock } from "./types";

export interface ReadingOrderOptions {
  /**
   * How far apart two blocks' vertical centres may be, as a fraction of image
   * height, while still counting as the same visual line. When omitted it is
   * derived from the median block height, which adapts to the text size.
   */
  lineTolerance?: number;
  /**
   * Minimum vertical overlap (as a fraction of the shorter box) for two boxes
   * to join the same line regardless of their centres.
   */
  overlapTolerance?: number;
}

const DEFAULT_OVERLAP_TOLERANCE = 0.4;
const FALLBACK_LINE_TOLERANCE = 0.02;

function medianHeight(boxes: NormalizedBBox[]): number {
  if (boxes.length === 0) return 0;
  const heights = boxes.map((b) => b.height).sort((a, b) => a - b);
  const mid = Math.floor(heights.length / 2);
  return heights.length % 2 === 1
    ? heights[mid]
    : (heights[mid - 1] + heights[mid]) / 2;
}

/**
 * Derive a line-grouping tolerance from the text itself. Small tolerance for
 * dense small text, larger for a poster with three huge words.
 */
export function deriveLineTolerance(blocks: OCRBlock[]): number {
  const boxes = blocks
    .map((b) => b.bbox)
    .filter((b): b is NormalizedBBox => b !== undefined);
  const median = medianHeight(boxes);
  return median > 0 ? median * 0.6 : FALLBACK_LINE_TOLERANCE;
}

/**
 * Group blocks into visual lines. Blocks join the current line when their
 * vertical centre is within tolerance of it, or when they overlap it
 * vertically by enough that a reader would see them as side by side.
 */
export function groupIntoLines(
  blocks: OCRBlock[],
  options: ReadingOrderOptions = {},
): OCRBlock[][] {
  const positioned = blocks.filter((b) => b.bbox !== undefined);
  if (positioned.length === 0) return [];

  const tolerance = options.lineTolerance ?? deriveLineTolerance(positioned);
  const overlapTolerance =
    options.overlapTolerance ?? DEFAULT_OVERLAP_TOLERANCE;

  // Stable sort by vertical centre, then by left edge, so equal centres keep a
  // deterministic order regardless of the engine's emission order.
  const sorted = [...positioned].sort((a, b) => {
    const ay = boxCenterY(a.bbox as NormalizedBBox);
    const by = boxCenterY(b.bbox as NormalizedBBox);
    if (ay !== by) return ay - by;
    return (a.bbox as NormalizedBBox).x - (b.bbox as NormalizedBBox).x;
  });

  const lines: OCRBlock[][] = [];
  let current: OCRBlock[] = [];
  let currentCentre = 0;

  for (const block of sorted) {
    const box = block.bbox as NormalizedBBox;
    const centre = boxCenterY(box);
    if (current.length === 0) {
      current = [block];
      currentCentre = centre;
      continue;
    }
    const overlaps = current.some(
      (other) =>
        verticalOverlapRatio(box, other.bbox as NormalizedBBox) >=
        overlapTolerance,
    );
    if (Math.abs(centre - currentCentre) <= tolerance || overlaps) {
      current.push(block);
      // Track the running mean centre so a line does not drift on one tall box.
      currentCentre =
        current.reduce(
          (sum, b) => sum + boxCenterY(b.bbox as NormalizedBBox),
          0,
        ) / current.length;
    } else {
      lines.push(current);
      current = [block];
      currentCentre = centre;
    }
  }
  if (current.length > 0) lines.push(current);

  // Left-to-right within each line.
  for (const line of lines) {
    line.sort(
      (a, b) => (a.bbox as NormalizedBBox).x - (b.bbox as NormalizedBBox).x,
    );
  }
  return lines;
}

/**
 * Sort blocks into human reading order and stamp `line` and `order` on copies.
 * The input array is never mutated.
 */
export function sortReadingOrder(
  blocks: OCRBlock[],
  options: ReadingOrderOptions = {},
): OCRBlock[] {
  const lines = groupIntoLines(blocks, options);
  const result: OCRBlock[] = [];
  let order = 0;

  lines.forEach((line, lineIndex) => {
    for (const block of line) {
      result.push({ ...block, line: lineIndex, order });
      order += 1;
    }
  });

  // Blocks with no geometry keep their original relative order at the end and
  // are marked with no line number rather than a made-up one.
  for (const block of blocks) {
    if (block.bbox === undefined) {
      result.push({ ...block, line: undefined, order });
      order += 1;
    }
  }

  return result;
}

/** Join blocks that share a line into one string per line. */
export function linesToStrings(lines: OCRBlock[][]): string[] {
  return lines.map((line) =>
    line
      .map((b) => b.text.trim())
      .filter((t) => t.length > 0)
      .join(" "),
  );
}

/**
 * Reading-order text for the whole image: one line per visual line, then any
 * unpositioned blocks. This is what the "Raw OCR" tab shows.
 */
export function readingOrderText(
  blocks: OCRBlock[],
  options: ReadingOrderOptions = {},
): string {
  const lines = linesToStrings(groupIntoLines(blocks, options));
  const unpositioned = blocks
    .filter((b) => b.bbox === undefined)
    .map((b) => b.text.trim())
    .filter((t) => t.length > 0);
  return [...lines, ...unpositioned].filter((l) => l.length > 0).join("\n");
}
