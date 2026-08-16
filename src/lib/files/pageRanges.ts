/**
 * Pure page-range parsing for the PDF tools.
 *
 * Accepts input like "1-3, 5, 9-12" and turns it into a validated,
 * de-duplicated list of 1-based page numbers.
 */

export type PageRangeResult =
  | { ok: true; pages: number[] }
  | { ok: false; message: string };

const EXAMPLE = 'e.g. "1-3, 5, 9-12"';

/**
 * Parse a human-typed page range string against a known page count.
 *
 * Rules:
 * - Comma-separated parts; each part is a single page ("5") or a range ("2-6").
 * - Whitespace anywhere is tolerated.
 * - Pages are 1-based. Out-of-bounds or zero pages produce a friendly error
 *   that states the valid range.
 * - Reversed ranges ("9-3") produce a friendly error suggesting the fix.
 * - Duplicates are removed while preserving first-seen order.
 */
export function parsePageRanges(
  input: string,
  pageCount: number,
): PageRangeResult {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return {
      ok: false,
      message: "This PDF has no pages to select.",
    };
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    return {
      ok: false,
      message: `Enter at least one page or range, ${EXAMPLE}.`,
    };
  }

  const parts = trimmed.split(",").map((p) => p.trim());
  const seen = new Set<number>();
  const pages: number[] = [];

  const boundsMessage = (page: number): string =>
    pageCount === 1
      ? `Page ${page} doesn't exist — this PDF only has 1 page.`
      : `Page ${page} doesn't exist — this PDF has ${pageCount} pages (valid pages are 1–${pageCount}).`;

  for (const part of parts) {
    if (part === "") {
      return {
        ok: false,
        message: `There's an empty entry between commas — check your list, ${EXAMPLE}.`,
      };
    }

    const single = /^(\d+)$/.exec(part);
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);

    if (!single && !range) {
      return {
        ok: false,
        message: `"${part}" isn't a page number or range — use numbers and dashes, ${EXAMPLE}.`,
      };
    }

    let start: number;
    let end: number;
    if (single) {
      start = Number.parseInt(single[1], 10);
      end = start;
    } else {
      start = Number.parseInt(range![1], 10);
      end = Number.parseInt(range![2], 10);
      if (start > end) {
        return {
          ok: false,
          message: `The range "${part}" is back to front — did you mean "${end}-${start}"?`,
        };
      }
    }

    if (start < 1) {
      return {
        ok: false,
        message: `Pages are numbered from 1, so "${part}" isn't valid.`,
      };
    }
    if (end > pageCount) {
      return { ok: false, message: boundsMessage(end) };
    }

    for (let p = start; p <= end; p += 1) {
      if (!seen.has(p)) {
        seen.add(p);
        pages.push(p);
      }
    }
  }

  return { ok: true, pages };
}

/** Format a list of 1-based pages back into compact range text, e.g. "1-3, 5". */
export function formatPageList(pages: number[]): string {
  if (pages.length === 0) return "";
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = current;
    prev = current;
  }
  return parts.join(", ");
}
