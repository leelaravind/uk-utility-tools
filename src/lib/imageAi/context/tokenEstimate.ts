/**
 * Output size metrics.
 *
 * Characters and UTF-8 bytes are exact. The token count is not, and this
 * module is careful about the difference:
 *
 *  - it is always labelled as an estimate, with the specification's exact
 *    wording (§17);
 *  - it never claims a percentage saving. "82% fewer tokens" would require
 *    knowing the receiving model's image tokenizer, which the browser cannot,
 *    so no function here computes or exposes such a number.
 *
 * The heuristic itself is deliberately simple and explained inline, so nobody
 * mistakes it for a real tokenizer.
 */

/** Required wording wherever the token estimate is shown. */
export const TOKEN_ESTIMATE_NOTE =
  "Estimated text tokens. Actual usage depends on the AI model and tokenizer.";

export interface SizeEstimate {
  characters: number;
  utf8Bytes: number;
  estimatedTextTokens: number;
  /** Always `TOKEN_ESTIMATE_NOTE`; carried so a caller cannot forget it. */
  note: string;
}

/** Exact UTF-8 byte length, counted without allocating a buffer. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/**
 * Heuristic token estimate.
 *
 * English-like ASCII text averages roughly four characters per token across
 * common byte-pair tokenizers, while CJK, emoji and other non-ASCII text is
 * far denser — often around one token per character or worse. Splitting the
 * count on that boundary is crude but it fails in the right direction (it
 * over-estimates rather than under-estimates dense text) and it needs no
 * vocabulary download.
 *
 * This is an estimate. It is not tuned to any specific model and must never be
 * presented as an exact count.
 */
export function estimateTextTokens(text: string): number {
  if (text.length === 0) return 0;
  let ascii = 0;
  let wide = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) ascii += 1;
    // Astral characters (emoji, many symbols) commonly cost more than one.
    else if (code > 0xffff) wide += 2;
    else wide += 1;
  }
  return Math.max(1, Math.ceil(ascii / 4) + wide);
}

/** Character count, UTF-8 bytes and the labelled token estimate. */
export function estimateSize(text: string): SizeEstimate {
  return {
    characters: [...text].length,
    utf8Bytes: utf8ByteLength(text),
    estimatedTextTokens: estimateTextTokens(text),
    note: TOKEN_ESTIMATE_NOTE,
  };
}

/** Thousands separators without depending on the runtime's locale data. */
export function formatCount(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * One-line summary for the UI, e.g.
 * "2,940 characters - 3,012 UTF-8 bytes - ~750 estimated text tokens".
 *
 * Deliberately contains no comparison and no percentage.
 */
export function formatSizeSummary(estimate: SizeEstimate): string {
  return [
    `${formatCount(estimate.characters)} characters`,
    `${formatCount(estimate.utf8Bytes)} UTF-8 bytes`,
    `~${formatCount(estimate.estimatedTextTokens)} estimated text tokens`,
  ].join(" · ");
}
