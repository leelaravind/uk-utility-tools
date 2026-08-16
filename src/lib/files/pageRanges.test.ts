import { describe, expect, it } from "vitest";

import { formatPageList, parsePageRanges } from "./pageRanges";

describe("parsePageRanges", () => {
  it("parses a single page", () => {
    expect(parsePageRanges("3", 10)).toEqual({ ok: true, pages: [3] });
  });

  it("parses a simple range", () => {
    expect(parsePageRanges("2-5", 10)).toEqual({ ok: true, pages: [2, 3, 4, 5] });
  });

  it("parses mixed pages and ranges in order", () => {
    expect(parsePageRanges("1-3,5,9-12", 12)).toEqual({
      ok: true,
      pages: [1, 2, 3, 5, 9, 10, 11, 12],
    });
  });

  it("tolerates whitespace everywhere", () => {
    expect(parsePageRanges("  1 - 3 ,  5 , 9 - 10 ", 10)).toEqual({
      ok: true,
      pages: [1, 2, 3, 5, 9, 10],
    });
  });

  it("dedupes while preserving first-seen order", () => {
    expect(parsePageRanges("5, 1-6, 5", 10)).toEqual({
      ok: true,
      pages: [5, 1, 2, 3, 4, 6],
    });
  });

  it("accepts the full document as a range", () => {
    expect(parsePageRanges("1-4", 4)).toEqual({ ok: true, pages: [1, 2, 3, 4] });
  });

  it("rejects empty input with a friendly message", () => {
    const result = parsePageRanges("", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Enter at least one page");
    }
  });

  it("rejects whitespace-only input", () => {
    expect(parsePageRanges("   ", 10).ok).toBe(false);
  });

  it("rejects reversed ranges with a suggestion", () => {
    const result = parsePageRanges("9-3", 12);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('"9-3"');
      expect(result.message).toContain('"3-9"');
    }
  });

  it("rejects out-of-bounds pages and states the valid range", () => {
    const result = parsePageRanges("15", 12);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Page 15");
      expect(result.message).toContain("12 pages");
      expect(result.message).toContain("1–12");
    }
  });

  it("rejects a range that runs past the end of the document", () => {
    const result = parsePageRanges("10-14", 12);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Page 14");
    }
  });

  it("rejects page zero", () => {
    const result = parsePageRanges("0", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("numbered from 1");
    }
  });

  it("rejects a zero-starting range", () => {
    expect(parsePageRanges("0-3", 10).ok).toBe(false);
  });

  it("rejects non-numeric garbage naming the bad part", () => {
    const result = parsePageRanges("1-3, abc", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('"abc"');
    }
  });

  it("rejects dangling commas", () => {
    expect(parsePageRanges("1,2,", 10).ok).toBe(false);
    expect(parsePageRanges(",1", 10).ok).toBe(false);
  });

  it("rejects negative numbers (parsed as malformed part)", () => {
    expect(parsePageRanges("-2", 10).ok).toBe(false);
  });

  it("rejects when the document has no pages", () => {
    const result = parsePageRanges("1", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("no pages");
    }
  });

  it("uses singular wording for a one-page document", () => {
    const result = parsePageRanges("2", 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("only has 1 page");
    }
  });
});

describe("formatPageList", () => {
  it("returns empty string for no pages", () => {
    expect(formatPageList([])).toBe("");
  });

  it("collapses consecutive runs into ranges", () => {
    expect(formatPageList([1, 2, 3, 5, 9, 10, 11, 12])).toBe("1-3, 5, 9-12");
  });

  it("sorts and dedupes before formatting", () => {
    expect(formatPageList([5, 3, 4, 5, 1])).toBe("1, 3-5");
  });

  it("formats a single page", () => {
    expect(formatPageList([7])).toBe("7");
  });
});
