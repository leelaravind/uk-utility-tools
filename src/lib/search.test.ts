import { describe, expect, it } from "vitest";

import { TOOLS } from "./registry";
import { searchTools } from "./search";

describe("searchTools", () => {
  it("returns [] for an empty query", () => {
    expect(searchTools("", TOOLS)).toEqual([]);
  });

  it("returns [] for a whitespace-only query", () => {
    expect(searchTools("   ", TOOLS)).toEqual([]);
  });

  it("finds shift-pay first for 'night shift pay'", () => {
    const results = searchTools("night shift pay", TOOLS);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe("shift-pay");
  });

  it("finds credit-card first for 'card interest'", () => {
    const results = searchTools("card interest", TOOLS);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe("credit-card");
  });

  it("finds salary for 'take home'", () => {
    const results = searchTools("take home", TOOLS);
    expect(results.map((t) => t.slug)).toContain("salary");
    expect(results[0].slug).toBe("salary");
  });

  it("is case-insensitive", () => {
    const lower = searchTools("qr code", TOOLS);
    const upper = searchTools("QR CODE", TOOLS);
    expect(lower.map((t) => t.slug)).toEqual(upper.map((t) => t.slug));
    expect(lower[0].slug).toBe("qr");
  });

  it("ranks title matches above keyword-only matches", () => {
    // 'pdf' is in the PDF tool's title but only in invoice's keywords.
    const results = searchTools("pdf", TOOLS);
    const slugs = results.map((t) => t.slug);
    expect(slugs.indexOf("pdf-tools")).toBeLessThan(slugs.indexOf("invoice"));
  });

  it("excludes tools that do not match every word", () => {
    const results = searchTools("night shift pay", TOOLS);
    // 'holiday-pay' matches "pay" but not "night"/"shift".
    expect(results.map((t) => t.slug)).not.toContain("holiday-pay");
  });
});
