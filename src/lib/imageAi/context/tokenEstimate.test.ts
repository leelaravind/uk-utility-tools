import { describe, expect, it } from "vitest";

import * as tokenEstimate from "./tokenEstimate";
import {
  TOKEN_ESTIMATE_NOTE,
  estimateSize,
  estimateTextTokens,
  formatCount,
  formatSizeSummary,
  utf8ByteLength,
} from "./tokenEstimate";

describe("utf8ByteLength", () => {
  it("counts ASCII, accented, CJK and astral characters correctly", () => {
    expect(utf8ByteLength("hello")).toBe(5);
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength("£")).toBe(2);
    expect(utf8ByteLength("漢")).toBe(3);
    expect(utf8ByteLength("😀")).toBe(4);
  });

  it("matches the platform encoder", () => {
    const sample = 'Connection failed — retry? £240.00 漢字 😀 "quoted"';
    expect(utf8ByteLength(sample)).toBe(
      new TextEncoder().encode(sample).length,
    );
  });
});

describe("estimateTextTokens", () => {
  it("returns zero for empty text", () => {
    expect(estimateTextTokens("")).toBe(0);
  });

  it("estimates roughly four ASCII characters per token", () => {
    expect(estimateTextTokens("a".repeat(400))).toBe(100);
  });

  it("charges non-ASCII text more per character", () => {
    expect(estimateTextTokens("漢".repeat(10))).toBeGreaterThan(
      estimateTextTokens("a".repeat(10)),
    );
  });

  it("never returns zero for non-empty text", () => {
    expect(estimateTextTokens("a")).toBeGreaterThan(0);
  });
});

describe("estimateSize", () => {
  it("reports characters, bytes and a labelled token estimate", () => {
    const estimate = estimateSize("Connection failed");
    expect(estimate.characters).toBe(17);
    expect(estimate.utf8Bytes).toBe(17);
    expect(estimate.estimatedTextTokens).toBeGreaterThan(0);
    expect(estimate.note).toBe(TOKEN_ESTIMATE_NOTE);
  });

  it("counts astral characters as one character, not two units", () => {
    expect(estimateSize("😀").characters).toBe(1);
    expect(estimateSize("😀").utf8Bytes).toBe(4);
  });
});

describe("TOKEN_ESTIMATE_NOTE", () => {
  it("uses the exact required wording", () => {
    expect(TOKEN_ESTIMATE_NOTE).toBe(
      "Estimated text tokens. Actual usage depends on the AI model and tokenizer.",
    );
  });
});

describe("formatSizeSummary", () => {
  it("labels the token figure as an estimate", () => {
    const summary = formatSizeSummary(estimateSize("hello world"));
    expect(summary).toContain("characters");
    expect(summary).toContain("UTF-8 bytes");
    expect(summary).toContain("estimated text tokens");
  });

  it("makes no savings claim of any kind", () => {
    const summary = formatSizeSummary(estimateSize("a".repeat(5000)));
    expect(summary).not.toContain("%");
    expect(summary.toLowerCase()).not.toContain("saved");
    expect(summary.toLowerCase()).not.toContain("saving");
    expect(summary.toLowerCase()).not.toContain("smaller");
  });
});

describe("module surface", () => {
  it("exposes no function that computes a token saving", () => {
    // A "% tokens saved" number cannot be computed honestly in the browser,
    // so no such export may exist for the UI to reach for.
    for (const name of Object.keys(tokenEstimate)) {
      expect(name.toLowerCase()).not.toContain("saving");
      expect(name.toLowerCase()).not.toContain("saved");
      expect(name.toLowerCase()).not.toContain("compressionratio");
    }
  });
});

describe("formatCount", () => {
  it("groups thousands without depending on locale data", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1000)).toBe("1,000");
    expect(formatCount(2940)).toBe("2,940");
    expect(formatCount(1234567)).toBe("1,234,567");
  });

  it("never renders a negative or fractional count", () => {
    expect(formatCount(-5)).toBe("0");
    expect(formatCount(12.6)).toBe("13");
  });
});
