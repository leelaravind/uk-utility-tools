import { describe, expect, it } from "vitest";

import {
  countSuppressedLabels,
  dedupeEntities,
  dedupeOcrBlocks,
  filterByConfidence,
  textKey,
  uniqueLines,
} from "./dedupe";
import { block, box } from "./fixtures";
import type { VisualEntity } from "./types";

function entity(
  id: string,
  label: string,
  confidence?: number,
  bbox?: VisualEntity["bbox"],
): VisualEntity {
  return { id, label, confidence, bbox, source: "detector" };
}

describe("textKey", () => {
  it("ignores case, surrounding whitespace and edge punctuation", () => {
    expect(textKey("  Retry.  ")).toBe(textKey("retry"));
    expect(textKey('"Connection failed"')).toBe(textKey("connection failed"));
  });

  it("does not merge genuinely different strings", () => {
    expect(textKey("Retry")).not.toBe(textKey("Retry now"));
  });
});

describe("dedupeOcrBlocks", () => {
  it("removes an identical block at the same position", () => {
    const result = dedupeOcrBlocks([
      block("a", "Retry", box(0.7, 0.4, 0.08, 0.04)),
      block("b", "Retry", box(0.701, 0.401, 0.08, 0.04)),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("keeps the same text when it genuinely appears twice", () => {
    // Two Retry buttons in different dialogs are two pieces of evidence.
    const result = dedupeOcrBlocks([
      block("a", "Retry", box(0.1, 0.2, 0.08, 0.04)),
      block("b", "Retry", box(0.8, 0.7, 0.08, 0.04)),
    ]);
    expect(result).toHaveLength(2);
  });

  it("merges identical text when neither block has geometry", () => {
    const result = dedupeOcrBlocks([block("a", "Retry"), block("b", "Retry")]);
    expect(result).toHaveLength(1);
  });

  it("drops empty and punctuation-only noise", () => {
    const result = dedupeOcrBlocks([
      block("a", "   "),
      block("b", "|"),
      block("c", "~~~~"),
      block("d", "Real text", box(0.1, 0.1, 0.2, 0.03)),
    ]);
    expect(result.map((b) => b.text)).toEqual(["Real text"]);
  });

  it("keeps short but meaningful strings", () => {
    const result = dedupeOcrBlocks([
      block("a", "OK", box(0.1, 0.1, 0.05, 0.03)),
      block("b", "1 + 2 = 3", box(0.1, 0.2, 0.1, 0.03)),
      block("c", "£12", box(0.1, 0.3, 0.05, 0.03)),
    ]);
    expect(result).toHaveLength(3);
  });

  it("applies a confidence floor when asked", () => {
    const result = dedupeOcrBlocks(
      [
        block("a", "clear", box(0.1, 0.1, 0.2, 0.03), 0.9),
        block("b", "unreadable", box(0.1, 0.2, 0.2, 0.03), 0.12),
      ],
      { minConfidence: 0.3 },
    );
    expect(result.map((b) => b.id)).toEqual(["a"]);
  });

  it("preserves input order", () => {
    const result = dedupeOcrBlocks([
      block("a", "one", box(0.1, 0.1, 0.2, 0.03)),
      block("b", "two", box(0.1, 0.2, 0.2, 0.03)),
      block("c", "three", box(0.1, 0.3, 0.2, 0.03)),
    ]);
    expect(result.map((b) => b.id)).toEqual(["a", "b", "c"]);
  });
});

describe("filterByConfidence", () => {
  it("keeps blocks with no reported confidence", () => {
    const result = filterByConfidence([
      block("a", "no score"),
      block("b", "low", undefined, 0.1),
    ]);
    expect(result.map((b) => b.id)).toEqual(["a"]);
  });
});

describe("uniqueLines", () => {
  it("collapses repeated lines and drops blanks", () => {
    expect(uniqueLines(["Retry", "  ", "retry", "Cancel"])).toEqual([
      "Retry",
      "Cancel",
    ]);
  });
});

describe("dedupeEntities", () => {
  it("suppresses overlapping detections of the same label", () => {
    const result = dedupeEntities([
      entity("a", "dog", 0.97, box(0.24, 0.18, 0.47, 0.71)),
      entity("b", "dog", 0.81, box(0.25, 0.19, 0.46, 0.7)),
    ]);
    expect(result.map((e) => e.id)).toEqual(["a"]);
  });

  it("keeps two separate instances of the same label", () => {
    const result = dedupeEntities([
      entity("a", "dog", 0.97, box(0.05, 0.1, 0.2, 0.3)),
      entity("b", "dog", 0.9, box(0.7, 0.1, 0.2, 0.3)),
    ]);
    expect(result).toHaveLength(2);
  });

  it("drops detections below the confidence floor", () => {
    const result = dedupeEntities([
      entity("a", "dog", 0.9, box(0, 0, 0.2, 0.2)),
      entity("b", "smudge", 0.05, box(0.5, 0.5, 0.1, 0.1)),
    ]);
    expect(result.map((e) => e.id)).toEqual(["a"]);
  });

  it("caps repeated instances of one label", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      entity(`e${i}`, "tree", 0.8, box(i * 0.1, 0.1, 0.05, 0.05)),
    );
    expect(dedupeEntities(many, { maxPerLabel: 3 })).toHaveLength(3);
  });

  it("keeps the caller's ordering for survivors", () => {
    const result = dedupeEntities([
      entity("a", "sky", 0.6, box(0, 0, 1, 0.3)),
      entity("b", "dog", 0.99, box(0.2, 0.4, 0.2, 0.3)),
    ]);
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("is deterministic when confidences tie", () => {
    const input = [
      entity("b", "dog", 0.8, box(0, 0, 0.2, 0.2)),
      entity("a", "dog", 0.8, box(0.01, 0.01, 0.2, 0.2)),
    ];
    expect(dedupeEntities(input)).toEqual(dedupeEntities(input));
  });
});

describe("countSuppressedLabels", () => {
  it("reports what was dropped so the output can say so", () => {
    const before = Array.from({ length: 6 }, (_, i) =>
      entity(`e${i}`, "tree", 0.8, box(i * 0.15, 0.1, 0.05, 0.05)),
    );
    const after = dedupeEntities(before, { maxPerLabel: 2 });
    expect(countSuppressedLabels(before, after)).toEqual([
      { label: "tree", dropped: 4 },
    ]);
  });

  it("reports nothing when nothing was dropped", () => {
    const entities = [entity("a", "dog", 0.9, box(0, 0, 0.2, 0.2))];
    expect(countSuppressedLabels(entities, entities)).toEqual([]);
  });
});
