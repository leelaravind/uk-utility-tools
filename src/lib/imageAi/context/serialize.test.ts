import { describe, expect, it } from "vitest";

import {
  COMPACT_BUDGET,
  selectLines,
  toBalanced,
  toCompact,
  toDetailed,
} from "./compress";
import { block, box, sampleDocument } from "./fixtures";
import {
  DOWNLOAD_FILENAME,
  TAGGED_CLOSE,
  TAGGED_OPEN,
  contextForCopy,
  serializeBalancedJson,
  serializeCompactJson,
  serializeDetailedJson,
  serializeFormat,
  serializeRawOcr,
  serializeTaggedText,
} from "./serialize";
import { SCHEMA_ID, type AnalysisDocument } from "./types";

const doc = sampleDocument();

describe("selectLines", () => {
  it("keeps everything when the budget allows", () => {
    const blocks = [block("a", "one"), block("b", "two")];
    expect(selectLines(blocks, 10)).toEqual({ blocks, dropped: 0 });
  });

  it("keeps error lines first when the budget is exceeded", () => {
    const filler = Array.from({ length: 20 }, (_, i) =>
      block(`f${i}`, `filler line ${i}`, box(0.1, i * 0.04, 0.3, 0.02)),
    );
    const blocks = [...filler, block("err", "Payment failed", box(0.1, 0.9, 0.3, 0.02))];
    const result = selectLines(blocks, 5);
    expect(result.blocks.map((b) => b.text)).toContain("Payment failed");
    expect(result.dropped).toBe(16);
  });

  it("returns survivors in reading order, not importance order", () => {
    const blocks = [
      block("a", "intro line", box(0.1, 0.1, 0.3, 0.02)),
      block("b", "Payment failed", box(0.1, 0.2, 0.3, 0.02)),
      block("c", "outro line", box(0.1, 0.3, 0.3, 0.02)),
    ];
    const result = selectLines(blocks, 2);
    expect(result.blocks[0].id).toBe("a");
    expect(result.blocks[1].id).toBe("b");
  });
});

describe("toCompact", () => {
  it("uses short keys and array boxes", () => {
    const compact = toCompact(doc);
    expect(compact.v).toBe(1);
    expect(compact.kind).toBe("screenshot");
    expect(compact.size).toEqual([1920, 1080]);
    expect(compact.objects?.[0][2]).toEqual([0.12, 0.18, 0.31, 0.04]);
  });

  it("omits fields with no evidence rather than emitting null", () => {
    const compact = toCompact(doc);
    expect("scene" in compact).toBe(false);
    const json = serializeCompactJson(doc);
    expect(json).not.toContain("null,");
    expect(json).not.toContain('"scene"');
  });

  it("carries no processing metadata or model ids", () => {
    const json = serializeCompactJson(doc);
    expect(json).not.toContain("runtime");
    expect(json).not.toContain("durationMs");
    expect(json).not.toContain("modelIds");
  });

  it("rounds confidence to 2 decimals and coordinates to 3", () => {
    const noisy = sampleDocument({
      classification: { ...doc.classification, confidence: 0.123456 },
    });
    const compact = toCompact(noisy);
    expect(compact.conf).toBe(0.12);
    for (const object of compact.objects ?? []) {
      for (const value of object[2] ?? []) {
        expect(String(value).replace(/^0\./, "").length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("de-duplicates repeated text lines", () => {
    const repeated = sampleDocument({
      text: {
        blocks: [
          block("a", "Retry", box(0.1, 0.1, 0.1, 0.03)),
          block("b", "Retry", box(0.8, 0.8, 0.1, 0.03)),
        ],
      },
    });
    expect(toCompact(repeated).text).toEqual(["Retry"]);
  });

  it("never drops an error message to save tokens", () => {
    const many = Array.from({ length: COMPACT_BUDGET.maxTextLines + 20 }, (_, i) =>
      block(`f${i}`, `filler ${i}`, box(0.1, i * 0.01, 0.3, 0.005)),
    );
    const withError = sampleDocument({
      text: {
        blocks: [
          ...many,
          block("err", "Connection failed", box(0.1, 0.99, 0.3, 0.005)),
        ],
      },
    });
    const compact = toCompact(withError);
    expect(compact.text).toContain("Connection failed");
    expect(compact.limits?.[0]).toContain("further recognised lines");
  });
});

describe("toBalanced", () => {
  it("emits the documented public schema", () => {
    const balanced = toBalanced(doc);
    expect(balanced.schema).toBe(SCHEMA_ID);
    expect(balanced.type).toBe("screenshot");
    expect(balanced.image).toEqual({ width: 1920, height: 1080 });
    expect(balanced.text?.[0]).toEqual({
      text: "Settings",
      box: [0.06, 0.05, 0.16, 0.05],
    });
  });

  it("hides per-item confidence at this level", () => {
    expect(serializeBalancedJson(doc)).not.toContain('"confidence": 0.94');
  });

  it("exposes no model-specific or internal field names", () => {
    const json = serializeBalancedJson(doc);
    for (const forbidden of ["tensor", "embedding", "logits", "modelIds", "schemaVersion"]) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe("toDetailed", () => {
  it("adds confidence, classification evidence and processing metadata", () => {
    const detailed = toDetailed(doc);
    expect(detailed.text?.[0].confidence).toBe(0.96);
    expect(detailed.classification?.signals.text_density).toBe(0.35);
    expect(detailed.processing?.runtime).toBe("wasm");
    expect(detailed.quality?.ocr_confidence).toBe(0.89);
  });
});

describe("determinism", () => {
  const formats = ["compact", "balanced", "detailed", "tagged", "raw-ocr"] as const;

  it("produces byte-identical output for the same document", () => {
    for (const format of formats) {
      expect(serializeFormat(doc, format)).toBe(serializeFormat(doc, format));
    }
  });

  it("produces byte-identical output for an equal document built separately", () => {
    const other = sampleDocument();
    for (const format of formats) {
      expect(serializeFormat(other, format)).toBe(serializeFormat(doc, format));
    }
  });

  it("is unaffected by a deep clone round-trip", () => {
    const cloned = JSON.parse(JSON.stringify(doc)) as AnalysisDocument;
    expect(serializeCompactJson(cloned)).toBe(serializeCompactJson(doc));
    expect(serializeTaggedText(cloned)).toBe(serializeTaggedText(doc));
  });

  it("is unaffected by explicitly undefined optional fields", () => {
    const withUndefined = sampleDocument({
      scene: { shortDescription: undefined, detailedDescription: undefined },
    });
    expect(serializeBalancedJson(withUndefined)).toBe(serializeBalancedJson(doc));
  });
});

describe("serializeTaggedText", () => {
  it("wraps the context in the documented fence", () => {
    const text = serializeTaggedText(doc);
    expect(text.startsWith(TAGGED_OPEN)).toBe(true);
    expect(text.endsWith(TAGGED_CLOSE)).toBe(true);
  });

  it("reports type, size and the recognised text", () => {
    const text = serializeTaggedText(doc);
    expect(text).toContain("TYPE: screenshot (59% confidence)");
    expect(text).toContain("SIZE: 1920x1080");
    expect(text).toContain('- "Connection failed"');
  });

  it("lists interface elements with a coarse position", () => {
    expect(serializeTaggedText(doc)).toContain('button "Retry" at center-right');
  });

  it("surfaces errors in their own section", () => {
    const text = serializeTaggedText(doc);
    const important = text.slice(text.indexOf("IMPORTANT:"));
    expect(important).toContain('"Connection failed"');
  });

  it("always includes the limitations section", () => {
    expect(serializeTaggedText(doc)).toContain("LIMITATIONS:");
  });

  it("omits sections it has no evidence for", () => {
    const bare = sampleDocument({
      ui: undefined,
      entities: [],
      relationships: [],
      text: { blocks: [] },
    });
    const text = serializeTaggedText(bare);
    expect(text).not.toContain("UI:");
    expect(text).not.toContain("OBJECTS:");
    expect(text).not.toContain("TEXT:");
  });
});

describe("serializeRawOcr", () => {
  it("returns the recognised text unchanged", () => {
    expect(serializeRawOcr(doc)).toContain("Connection failed");
  });

  it("returns an empty string when there was no text", () => {
    expect(serializeRawOcr(sampleDocument({ text: { blocks: [] } }))).toBe("");
  });
});

describe("contextForCopy", () => {
  it("uses the tagged-text representation", () => {
    expect(contextForCopy(doc)).toBe(serializeTaggedText(doc));
  });
});

describe("serializeFormat", () => {
  it("routes each format to its serializer", () => {
    expect(serializeFormat(doc, "compact")).toBe(serializeCompactJson(doc));
    expect(serializeFormat(doc, "balanced")).toBe(serializeBalancedJson(doc));
    expect(serializeFormat(doc, "detailed")).toBe(serializeDetailedJson(doc));
    expect(serializeFormat(doc, "tagged")).toBe(serializeTaggedText(doc));
    expect(serializeFormat(doc, "raw-ocr")).toBe(serializeRawOcr(doc));
  });
});

describe("DOWNLOAD_FILENAME", () => {
  it("does not carry the visitor's own filename", () => {
    expect(DOWNLOAD_FILENAME).toBe("image-context.json");
  });
});
