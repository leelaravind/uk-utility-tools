/**
 * Untrusted-text hygiene.
 *
 * OCR text, filenames and anything else derived from a user's image is
 * untrusted input. It is rendered as React text nodes (never HTML), but it
 * still passes through here first so that:
 *
 *  - control characters cannot corrupt the clipboard payload or a terminal
 *    that the visitor later pastes into,
 *  - bidirectional-override characters cannot visually reorder a copied line
 *    so that it reads differently from what it actually contains,
 *  - a single pathological image cannot produce an unbounded string.
 *
 * What this module deliberately does NOT do: change spelling, fix casing,
 * remove words, or delete text that looks like a prompt injection. That text
 * is the evidence the visitor wants their AI to analyse. It is quoted and
 * clearly marked as untrusted instead (see providerWrappers.ts).
 */

/** Hard cap on the joined OCR text we will keep for one image. */
export const MAX_OCR_CHARS = 120_000;

/** Hard cap on a single recognised line. */
export const MAX_LINE_CHARS = 2_000;

/** Marker appended when text had to be truncated. Never silent. */
export const TRUNCATION_MARKER = "… [truncated]";

/*
 * Removed characters (written as escapes so this file stays plain ASCII):
 *   \u0000-\u0008, \u000B, \u000C, \u000E-\u001F, \u007F   C0/DEL controls
 *                                                          (\t \n \r kept)
 *   \u0080-\u009F                                          C1 controls
 *   \u200B-\u200D, \u2060, \uFEFF                          zero-width / BOM
 *   \u202A-\u202E, \u2066-\u2069                           bidi overrides
 *   \u2028, \u2029                                         line/para separators
 */
const CONTROL_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g;

const LINE_SEPARATORS = /[\u2028\u2029]/g;

/**
 * Strip characters that carry no visible meaning but can corrupt or visually
 * spoof text. Tabs, newlines and carriage returns are preserved.
 */
export function stripControlCharacters(input: string): string {
  return input.replace(LINE_SEPARATORS, "\n").replace(CONTROL_CHARS, "");
}

/** Collapse runs of whitespace to single spaces and trim. Never removes words. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Normalise line endings to \n and drop trailing spaces on each line. */
export function normalizeLineEndings(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

/**
 * Cap a string to `maxChars`, appending a visible truncation marker when it
 * had to be cut. Returning silently-shortened text would be a lie about the
 * evidence, so the marker is not optional.
 */
export function clampText(input: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (input.length <= maxChars) return input;
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length);
  return input.slice(0, keep) + TRUNCATION_MARKER;
}

/** Full cleaning pass for a single recognised line of text. */
export function sanitizeLine(input: string): string {
  return clampText(
    normalizeWhitespace(stripControlCharacters(input)),
    MAX_LINE_CHARS,
  );
}

/** Full cleaning pass for a multi-line block of recognised text. */
export function sanitizeText(input: string): string {
  return clampText(
    normalizeLineEndings(stripControlCharacters(input)).trim(),
    MAX_OCR_CHARS,
  );
}

/**
 * True when a string is dominated by characters OCR engines emit when they
 * are guessing at noise. Used to drop garbage blocks, never to rewrite them.
 */
export function isLikelyOcrNoise(input: string): boolean {
  const text = normalizeWhitespace(input);
  if (text.length === 0) return true;
  // A single stray punctuation mark carries no evidence.
  if (text.length <= 1 && !/[\p{L}\p{N}]/u.test(text)) return true;
  // Spaces are excluded from the ratio so that short but real strings such as
  // "1 + 2 = 3" or "£ 12" are not mistaken for noise.
  const dense = text.replace(/\s+/g, "");
  if (dense.length === 0) return true;
  const meaningful = dense.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return meaningful / dense.length < 0.25;
}

/**
 * Escape a string for inclusion inside double quotes in the tagged-text
 * format. Only the quote and backslash characters are escaped, so the text a
 * receiving model reads is still character-for-character the OCR result.
 */
export function quoteForTaggedText(input: string): string {
  return `"${input.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
