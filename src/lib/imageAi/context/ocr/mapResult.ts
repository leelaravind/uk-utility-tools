/**
 * Tesseract result mapping.
 *
 * Kept separate from the client so it can be unit tested against fixture
 * objects without a browser, and so that a change in the library's result
 * shape is a change to one small pure function.
 *
 * The mapping is defensive on purpose: tesseract.js only populates `blocks`
 * when the caller asks for that output, and the nesting has changed between
 * major versions. Rather than assuming a shape, this walks whatever is present
 * and falls back to splitting the plain text, so a library upgrade degrades to
 * "text without boxes" instead of "no OCR at all".
 */

import { normalizeBox } from "../geometry";
import { sanitizeLine, sanitizeText } from "../sanitize";
import type { OCRBlock } from "../types";
import type { OcrResult } from "./types";

/** The subset of the tesseract.js page shape this mapper reads. */
export interface TesseractBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TesseractLineLike {
  text?: string;
  confidence?: number;
  bbox?: TesseractBbox;
}

export interface TesseractParagraphLike {
  lines?: TesseractLineLike[];
  text?: string;
  confidence?: number;
  bbox?: TesseractBbox;
}

export interface TesseractBlockLike {
  paragraphs?: TesseractParagraphLike[];
  text?: string;
  confidence?: number;
  bbox?: TesseractBbox;
}

export interface TesseractPageLike {
  text?: string;
  confidence?: number;
  blocks?: TesseractBlockLike[] | null;
  /** Older/alternate shapes some versions expose directly on the page. */
  lines?: TesseractLineLike[] | null;
  paragraphs?: TesseractParagraphLike[] | null;
}

/** Tesseract reports 0–100; the rest of the pipeline works in 0–1. */
function toUnitConfidence(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const unit = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, Math.round(unit * 100) / 100));
}

/** Collect line-level records from whichever nesting the page provides. */
function collectLines(page: TesseractPageLike): TesseractLineLike[] {
  const lines: TesseractLineLike[] = [];

  for (const block of page.blocks ?? []) {
    if (block.paragraphs && block.paragraphs.length > 0) {
      for (const paragraph of block.paragraphs) {
        if (paragraph.lines && paragraph.lines.length > 0) {
          lines.push(...paragraph.lines);
        } else if (paragraph.text) {
          lines.push(paragraph);
        }
      }
    } else if (block.text) {
      lines.push(block);
    }
  }

  if (lines.length === 0) {
    for (const paragraph of page.paragraphs ?? []) {
      if (paragraph.lines && paragraph.lines.length > 0) lines.push(...paragraph.lines);
      else if (paragraph.text) lines.push(paragraph);
    }
  }
  if (lines.length === 0 && page.lines) lines.push(...page.lines);

  return lines;
}

/**
 * Convert a tesseract page into `OCRBlock`s with normalised boxes.
 *
 * `width`/`height` are the dimensions of the bitmap that was recognised, which
 * is the downscaled analysis copy — normalising against it keeps boxes
 * meaningful against the original image too, since both share an aspect ratio.
 */
export function mapTesseractPage(
  page: TesseractPageLike,
  width: number,
  height: number,
): OcrResult {
  const lines = collectLines(page);
  const blocks: OCRBlock[] = [];

  lines.forEach((line, index) => {
    const text = sanitizeLine(line.text ?? "");
    if (text.length === 0) return;
    blocks.push({
      id: `ocr-${index + 1}`,
      text,
      confidence: toUnitConfidence(line.confidence),
      bbox: line.bbox ? normalizeBox(line.bbox, width, height) : undefined,
    });
  });

  // No geometry at all: keep the text so the visitor still gets the evidence.
  if (blocks.length === 0 && page.text) {
    sanitizeText(page.text)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .forEach((line, index) => {
        blocks.push({ id: `ocr-text-${index + 1}`, text: line });
      });
  }

  const confidences = blocks
    .map((b) => b.confidence)
    .filter((c): c is number => typeof c === "number");

  return {
    blocks,
    fullText: sanitizeText(page.text ?? blocks.map((b) => b.text).join("\n")),
    meanConfidence:
      toUnitConfidence(page.confidence) ??
      (confidences.length > 0
        ? Math.round(
            (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100,
          ) / 100
        : undefined),
  };
}
