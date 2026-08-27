/**
 * Document-image heuristics: title, sections and key/value pairs.
 *
 * The governing rule is that nothing is invented. Every string that comes out
 * of this module is a substring of what OCR actually recognised, split on
 * characters that were really there. If the heuristics cannot find a heading,
 * the document simply has no heading — a plausible-sounding invented one would
 * be far worse than an absent one, because the visitor cannot tell the
 * difference once it has been pasted into an AI.
 */

import { sanitizeLine } from "./sanitize";
import type {
  DocumentSection,
  DocumentStructure,
  NormalizedBBox,
  OCRBlock,
} from "./types";

export interface DocumentHeuristicOptions {
  /** Blocks below this confidence are treated as uncertain, never corrected. */
  uncertainBelow?: number;
  maxSections?: number;
  maxKeyValues?: number;
}

const DEFAULT_UNCERTAIN_BELOW = 0.6;
const DEFAULT_MAX_SECTIONS = 40;
const DEFAULT_MAX_KEY_VALUES = 60;

/** A heading is this much taller than the median line. */
const HEADING_HEIGHT_RATIO = 1.2;

/** Key/value split characters, in priority order. */
const KEY_VALUE_SEPARATOR = /^([^:：]{1,48})[:：]\s*(.+)$/;

function medianHeight(blocks: OCRBlock[]): number {
  const heights = blocks
    .map((b) => b.bbox?.height)
    .filter((h): h is number => typeof h === "number")
    .sort((a, b) => a - b);
  if (heights.length === 0) return 0;
  const mid = Math.floor(heights.length / 2);
  return heights.length % 2 === 1
    ? heights[mid]
    : (heights[mid - 1] + heights[mid]) / 2;
}

function isAllCapsHeading(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3 || letters.length > 60) return false;
  return letters === letters.toUpperCase() && text.trim().split(/\s+/).length <= 8;
}

/** True when a line reads like a heading rather than body prose. */
export function looksLikeHeading(block: OCRBlock, median: number): boolean {
  const text = block.text.trim();
  if (text.length === 0 || text.length > 90) return false;
  if (/[.;,]$/.test(text)) return false;
  const words = text.split(/\s+/).length;
  if (words > 12) return false;
  const height = block.bbox?.height;
  if (median > 0 && height !== undefined && height >= median * HEADING_HEIGHT_RATIO) {
    return true;
  }
  return isAllCapsHeading(text);
}

/**
 * Split one line into a key and a value, e.g. "Invoice number: A1234".
 * Returns undefined unless both halves are non-empty and the key is short
 * enough to plausibly be a label rather than a sentence containing a colon.
 */
export function splitKeyValue(text: string): [string, string] | undefined {
  const match = KEY_VALUE_SEPARATOR.exec(text.trim());
  if (!match) return undefined;
  const key = match[1].trim();
  const value = match[2].trim();
  if (key.length === 0 || value.length === 0) return undefined;
  // A key that is itself a sentence is not a label.
  if (key.split(/\s+/).length > 6) return undefined;
  return [key, value];
}

/**
 * Two blocks on the same visual line, separated horizontally, also form a
 * key/value pair on invoices and settings pages ("Total" ... "£240.00").
 */
function keyValueFromLine(line: OCRBlock[]): [string, string] | undefined {
  if (line.length !== 2) return undefined;
  const [left, right] = line;
  const key = left.text.trim().replace(/[:：]$/, "");
  const value = right.text.trim();
  if (key.length === 0 || value.length === 0) return undefined;
  if (key.length > 48 || key.split(/\s+/).length > 6) return undefined;
  const leftBox = left.bbox as NormalizedBBox | undefined;
  const rightBox = right.bbox as NormalizedBBox | undefined;
  if (leftBox && rightBox) {
    // Require a visible gap so that two words of one sentence are not read as
    // a label and a value.
    const gap = rightBox.x - (leftBox.x + leftBox.width);
    if (gap < 0.04) return undefined;
  }
  return [key, value];
}

function groupByLine(blocks: OCRBlock[]): OCRBlock[][] {
  const lines = new Map<number, OCRBlock[]>();
  const orphans: OCRBlock[][] = [];
  for (const block of blocks) {
    if (block.line === undefined) {
      orphans.push([block]);
      continue;
    }
    const list = lines.get(block.line) ?? [];
    list.push(block);
    lines.set(block.line, list);
  }
  const ordered = [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => list);
  return [...ordered, ...orphans];
}

/**
 * Build a document structure from blocks that are already in reading order.
 * Every part is optional; absent means "no evidence", not "empty".
 */
export function inferDocumentStructure(
  blocks: OCRBlock[],
  options: DocumentHeuristicOptions = {},
): DocumentStructure {
  const maxSections = options.maxSections ?? DEFAULT_MAX_SECTIONS;
  const maxKeyValues = options.maxKeyValues ?? DEFAULT_MAX_KEY_VALUES;
  const median = medianHeight(blocks);
  const lines = groupByLine(blocks);

  interface SectionDraft {
    heading?: string;
    parts: string[];
  }

  const keyValues: Array<[string, string]> = [];
  const sections: DocumentSection[] = [];
  let current: SectionDraft | null = null;
  let title: string | undefined;

  const pushSection = () => {
    const draft: SectionDraft | null = current;
    current = null;
    if (!draft) return;
    const text = sanitizeLine(draft.parts.join(" "));
    if (draft.heading !== undefined || text.length > 0) {
      sections.push({ heading: draft.heading, text });
    }
  };

  lines.forEach((line, index) => {
    const joined = sanitizeLine(line.map((b) => b.text).join(" "));
    if (joined.length === 0) return;

    const pair = keyValueFromLine(line) ?? splitKeyValue(joined);
    if (pair && keyValues.length < maxKeyValues) {
      keyValues.push([sanitizeLine(pair[0]), sanitizeLine(pair[1])]);
      // A key/value line is still body text of the current section.
    }

    const first = line[0];
    const heading =
      line.length === 1 && looksLikeHeading(first, median) && !pair;

    if (heading) {
      pushSection();
      if (title === undefined && index <= 2) {
        title = joined;
      }
      if (sections.length < maxSections) {
        current = { heading: joined, parts: [] };
      }
      return;
    }

    if (title === undefined && index === 0 && joined.length <= 90 && !pair) {
      title = joined;
    }

    const draft: SectionDraft = current ?? { parts: [] };
    draft.parts.push(joined);
    current = draft;
  });
  pushSection();

  const structure: DocumentStructure = {};
  if (title !== undefined) structure.title = title;
  if (sections.length > 0) structure.sections = sections.slice(0, maxSections);
  if (keyValues.length > 0) structure.keyValues = keyValues;
  return structure;
}

/**
 * Lines the OCR engine was unsure about. Surfaced as a limitation so the
 * receiving model knows which strings to treat sceptically, instead of the
 * tool quietly "fixing" them.
 */
export function uncertainLines(
  blocks: OCRBlock[],
  options: DocumentHeuristicOptions = {},
): string[] {
  const threshold = options.uncertainBelow ?? DEFAULT_UNCERTAIN_BELOW;
  return blocks
    .filter(
      (b) =>
        b.confidence !== undefined &&
        b.confidence < threshold &&
        b.text.trim().length > 0,
    )
    .map((b) => b.text.trim());
}
