import { describe, expect, it } from "vitest";

import { block, box } from "./fixtures";
import {
  deriveLineTolerance,
  groupIntoLines,
  readingOrderText,
  sortReadingOrder,
} from "./readingOrder";

describe("sortReadingOrder", () => {
  it("orders blocks top to bottom", () => {
    const blocks = [
      block("c", "third", box(0.1, 0.7, 0.2, 0.03)),
      block("a", "first", box(0.1, 0.1, 0.2, 0.03)),
      block("b", "second", box(0.1, 0.4, 0.2, 0.03)),
    ];
    expect(sortReadingOrder(blocks).map((b) => b.text)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("orders blocks left to right within a line", () => {
    const blocks = [
      block("right", "world", box(0.5, 0.1, 0.2, 0.03)),
      block("left", "hello", box(0.1, 0.1, 0.2, 0.03)),
    ];
    expect(sortReadingOrder(blocks).map((b) => b.text)).toEqual([
      "hello",
      "world",
    ]);
  });

  it("groups slightly misaligned blocks onto the same line", () => {
    // A real OCR pass rarely returns identical y values for one row.
    const blocks = [
      block("a", "Name", box(0.1, 0.2, 0.1, 0.03)),
      block("b", "Ada Lovelace", box(0.4, 0.204, 0.2, 0.03)),
      block("c", "Role", box(0.1, 0.3, 0.1, 0.03)),
    ];
    const sorted = sortReadingOrder(blocks);
    expect(sorted[0].line).toBe(0);
    expect(sorted[1].line).toBe(0);
    expect(sorted[2].line).toBe(1);
  });

  it("stamps sequential order indices", () => {
    const sorted = sortReadingOrder([
      block("b", "two", box(0.1, 0.4, 0.2, 0.03)),
      block("a", "one", box(0.1, 0.1, 0.2, 0.03)),
    ]);
    expect(sorted.map((b) => b.order)).toEqual([0, 1]);
  });

  it("keeps blocks without geometry instead of dropping them", () => {
    const blocks = [
      block("positioned", "visible", box(0.1, 0.1, 0.2, 0.03)),
      block("floating", "no box"),
    ];
    const sorted = sortReadingOrder(blocks);
    expect(sorted).toHaveLength(2);
    expect(sorted[1].text).toBe("no box");
    expect(sorted[1].line).toBeUndefined();
  });

  it("does not mutate the input array", () => {
    const blocks = [
      block("b", "two", box(0.1, 0.4, 0.2, 0.03)),
      block("a", "one", box(0.1, 0.1, 0.2, 0.03)),
    ];
    const snapshot = blocks.map((b) => b.id);
    sortReadingOrder(blocks);
    expect(blocks.map((b) => b.id)).toEqual(snapshot);
    expect(blocks[0].order).toBeUndefined();
  });

  it("is deterministic for boxes that share a centre", () => {
    const blocks = [
      block("b", "beta", box(0.5, 0.2, 0.1, 0.03)),
      block("a", "alpha", box(0.2, 0.2, 0.1, 0.03)),
    ];
    const first = sortReadingOrder(blocks).map((b) => b.id);
    const second = sortReadingOrder([...blocks].reverse()).map((b) => b.id);
    expect(first).toEqual(second);
  });

  it("handles an empty input", () => {
    expect(sortReadingOrder([])).toEqual([]);
  });
});

describe("groupIntoLines", () => {
  it("splits rows that are clearly separate", () => {
    const lines = groupIntoLines([
      block("a", "top", box(0.1, 0.1, 0.2, 0.02)),
      block("b", "bottom", box(0.1, 0.8, 0.2, 0.02)),
    ]);
    expect(lines).toHaveLength(2);
  });

  it("joins boxes that overlap vertically even when centres differ", () => {
    // A tall heading beside a short label still reads as one row.
    const lines = groupIntoLines([
      block("tall", "Heading", box(0.1, 0.1, 0.2, 0.1)),
      block("short", "note", box(0.5, 0.14, 0.1, 0.02)),
    ]);
    expect(lines).toHaveLength(1);
  });
});

describe("deriveLineTolerance", () => {
  it("scales with the text size", () => {
    const small = deriveLineTolerance([
      block("a", "x", box(0, 0, 0.1, 0.01)),
      block("b", "y", box(0, 0.1, 0.1, 0.01)),
    ]);
    const large = deriveLineTolerance([
      block("a", "x", box(0, 0, 0.1, 0.1)),
      block("b", "y", box(0, 0.3, 0.1, 0.1)),
    ]);
    expect(large).toBeGreaterThan(small);
  });

  it("falls back when nothing has geometry", () => {
    expect(deriveLineTolerance([block("a", "x")])).toBeGreaterThan(0);
  });
});

describe("readingOrderText", () => {
  it("joins each visual line into one line of text", () => {
    const text = readingOrderText([
      block("b", "Lovelace", box(0.4, 0.2, 0.2, 0.03)),
      block("a", "Ada", box(0.1, 0.2, 0.1, 0.03)),
      block("c", "Engineer", box(0.1, 0.4, 0.2, 0.03)),
    ]);
    expect(text).toBe("Ada Lovelace\nEngineer");
  });

  it("appends unpositioned text at the end", () => {
    const text = readingOrderText([
      block("a", "Ada", box(0.1, 0.2, 0.1, 0.03)),
      block("z", "stray"),
    ]);
    expect(text).toBe("Ada\nstray");
  });
});
