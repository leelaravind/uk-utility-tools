/**
 * Deterministic serializers.
 *
 * "Deterministic" here means byte-identical: the same `AnalysisDocument`
 * serialised twice, in any order, on any engine, produces the same string. It
 * matters because the output is what a visitor pastes into an AI and what the
 * snapshot tests assert on, so drift would be invisible until it changed
 * someone's answer.
 *
 * What guarantees it:
 *  - every object is built with an explicit, fixed key order in compress.ts;
 *  - every number is pre-rounded through geometry.ts, so no float ever reaches
 *    `JSON.stringify` with engine-dependent digits;
 *  - nothing reads the clock, the locale, the platform or a random source.
 */

import { toBalanced, toCompact, toDetailed } from "./compress";
import { describePosition } from "./geometry";
import { findImportantLines } from "./important";
import { quoteForTaggedText } from "./sanitize";
import { describeUiElement, significantUiElements } from "./ui";
import type { AnalysisDocument, OutputFormat } from "./types";

/** Fence used by the tagged-text format. */
export const TAGGED_OPEN = "[IMAGE_CONTEXT v1]";
export const TAGGED_CLOSE = "[/IMAGE_CONTEXT]";

/** Compact JSON: no indentation, because every byte is a token. */
export function serializeCompactJson(doc: AnalysisDocument): string {
  return JSON.stringify(toCompact(doc));
}

/** Balanced JSON: the readable public schema, 2-space indented. */
export function serializeBalancedJson(doc: AnalysisDocument): string {
  return JSON.stringify(toBalanced(doc), null, 2);
}

/** Detailed JSON: everything the internal document can honestly expose. */
export function serializeDetailedJson(doc: AnalysisDocument): string {
  return JSON.stringify(toDetailed(doc), null, 2);
}

function section(title: string, lines: string[]): string[] {
  if (lines.length === 0) return [];
  return [`${title}:`, ...lines.map((line) => `- ${line}`)];
}

/**
 * Human-readable tagged text (specification §15). Often smaller than the
 * compact JSON for text-heavy images and easier for a person to check before
 * they paste it, which is why both are offered rather than one being chosen.
 */
export function serializeTaggedText(doc: AnalysisDocument): string {
  const out: string[] = [TAGGED_OPEN];

  const percent = Math.round(doc.classification.confidence * 100);
  out.push(`TYPE: ${doc.classification.kind} (${percent}% confidence)`);
  out.push(`SIZE: ${doc.source.width}x${doc.source.height}`);

  if (doc.scene.shortDescription) {
    out.push(`SCENE: ${doc.scene.shortDescription}`);
  }

  const compact = toCompact(doc);

  out.push(
    ...section(
      "TEXT",
      (compact.text ?? []).map((line) => quoteForTaggedText(line)),
    ),
  );

  out.push(
    ...section(
      "OBJECTS",
      doc.entities.map((entity) => {
        const text = entity.attributes?.[0]
          ? ` ${quoteForTaggedText(entity.attributes[0])}`
          : "";
        const where = entity.bbox ? ` at ${describePosition(entity.bbox)}` : "";
        return `${entity.label}${text}${where}`;
      }),
    ),
  );

  out.push(
    ...section(
      "UI",
      significantUiElements(doc.ui?.elements ?? []).map(describeUiElement),
    ),
  );

  if (doc.document) {
    const documentLines: string[] = [];
    if (doc.document.title) documentLines.push(`title: ${doc.document.title}`);
    for (const [key, value] of doc.document.keyValues ?? []) {
      documentLines.push(`${key}: ${value}`);
    }
    for (const s of doc.document.sections ?? []) {
      if (s.heading) documentLines.push(`section: ${s.heading}`);
    }
    out.push(...section("DOCUMENT", documentLines));
  }

  out.push(
    ...section(
      "IMPORTANT",
      findImportantLines(doc.text.blocks).map((line) =>
        quoteForTaggedText(line.text),
      ),
    ),
  );

  out.push(
    ...section(
      "RELATIONS",
      doc.relationships.map((r) => r.description),
    ),
  );

  out.push(...section("LIMITATIONS", doc.limitations));

  out.push(TAGGED_CLOSE);
  return out.join("\n");
}

/** Raw recognised text, exactly as read, one visual line per line. */
export function serializeRawOcr(doc: AnalysisDocument): string {
  return doc.text.fullText ?? "";
}

/** Serialise in the requested format. */
export function serializeFormat(
  doc: AnalysisDocument,
  format: OutputFormat,
): string {
  switch (format) {
    case "compact":
      return serializeCompactJson(doc);
    case "balanced":
      return serializeBalancedJson(doc);
    case "detailed":
      return serializeDetailedJson(doc);
    case "tagged":
      return serializeTaggedText(doc);
    case "raw-ocr":
      return serializeRawOcr(doc);
  }
}

/**
 * The context handed to the provider wrappers. Tagged text is the default
 * because it is compact, legible, and unambiguous about where the image
 * evidence starts and stops.
 */
export function contextForCopy(doc: AnalysisDocument): string {
  return serializeTaggedText(doc);
}

/**
 * Download filename. Deliberately generic: the visitor's original filename
 * can itself be sensitive and is never carried into the output.
 */
export const DOWNLOAD_FILENAME = "image-context.json";
