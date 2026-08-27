import { describe, expect, it } from "vitest";

import {
  CLAUDE_HIGH_RESOLUTION_LIMITS,
  CLAUDE_PATCH_PX,
  CLAUDE_STANDARD_LIMITS,
  claudeResizedSize,
  countClaudeVisualTokens,
  estimateClaudeImage,
  roundTiesToEven,
} from "./claude";
import {
  DEFAULT_PROFILE_ID,
  VISION_PROVIDER_PROFILES,
  documentedProfiles,
  getProfile,
} from "./index";
import { isProfileStale, profileAgeDays } from "./types";

/**
 * The expected values below are taken from Anthropic's published tables, not
 * from running our own implementation. If a future doc change moves them, these
 * tests are the thing that should fail.
 *
 * Sources (verified 2026-08-27):
 *   platform.claude.com/docs/en/build-with-claude/vision
 *   platform.claude.com/docs/en/build-with-claude/vision-coordinates
 */

describe("visual token formula", () => {
  it("charges one token per 28x28 patch", () => {
    expect(CLAUDE_PATCH_PX).toBe(28);
    // 1092 is exactly 39 patches square.
    expect(countClaudeVisualTokens(1092, 1092)).toBe(39 * 39);
  });

  it("rounds partial patches up on both axes", () => {
    expect(countClaudeVisualTokens(28, 28)).toBe(1);
    expect(countClaudeVisualTokens(29, 28)).toBe(2);
    expect(countClaudeVisualTokens(28, 29)).toBe(2);
    expect(countClaudeVisualTokens(29, 29)).toBe(4);
  });

  it("matches the documented per-size token costs", () => {
    expect(countClaudeVisualTokens(200, 200)).toBe(64);
    expect(countClaudeVisualTokens(1000, 1000)).toBe(1296);
    expect(countClaudeVisualTokens(1092, 1092)).toBe(1521);
    expect(countClaudeVisualTokens(1920, 1080)).toBe(2691);
    expect(countClaudeVisualTokens(2000, 1500)).toBe(3888);
    // The A4-at-130-DPI worked example.
    expect(countClaudeVisualTokens(1075, 1520)).toBe(2145);
  });

  it("never returns less than one token", () => {
    expect(countClaudeVisualTokens(1, 1)).toBe(1);
    expect(countClaudeVisualTokens(0, 0)).toBe(1);
  });
});

describe("banker's rounding", () => {
  it("resolves exact .5 ties toward the even neighbour", () => {
    expect(roundTiesToEven(0.5)).toBe(0);
    expect(roundTiesToEven(1.5)).toBe(2);
    expect(roundTiesToEven(2.5)).toBe(2);
    expect(roundTiesToEven(3.5)).toBe(4);
  });

  it("rounds non-ties normally", () => {
    expect(roundTiesToEven(1.4)).toBe(1);
    expect(roundTiesToEven(1.6)).toBe(2);
    expect(roundTiesToEven(2.51)).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/* Automatic provider resize — the documented table                    */
/* ------------------------------------------------------------------ */

describe("standard tier resize (max edge 1568, max 1568 tokens)", () => {
  const cases: [number, number, number, number, number][] = [
    // [inputW, inputH, resizedW, resizedH, tokens]
    [200, 200, 200, 200, 64],
    [1000, 1000, 1000, 1000, 1296],
    [1092, 1092, 1092, 1092, 1521],
    [1920, 1080, 1456, 819, 1560],
    // 2000x1500 is handled separately — see the tie-breaking test below.
    [3840, 2160, 1456, 819, 1560],
  ];

  it.each(cases)(
    "%ix%i resizes to %ix%i costing %i tokens",
    (w, h, expectW, expectH, expectTokens) => {
      const result = estimateClaudeImage(w, h, CLAUDE_STANDARD_LIMITS);
      expect(result.width).toBe(expectW);
      expect(result.height).toBe(expectH);
      expect(result.visualTokens).toBe(expectTokens);
    },
  );

  it("follows the reference implementation on an exact rounding tie", () => {
    // 2000x1500 lands on the one case Anthropic's own docs disagree with
    // themselves about. At a candidate width of 1270 the short edge is exactly
    // 952.5px: the summary table on the Vision page shows 1269x952 (consistent
    // with rounding halves up), while the reference implementation rounds
    // halves to even — giving 1270x952 — and states that this is what the live
    // API does. We follow the reference implementation.
    //
    // The token cost, which is what the estimate actually reports, is 1564
    // either way, so the disagreement is one pixel of reported width.
    const result = estimateClaudeImage(2000, 1500, CLAUDE_STANDARD_LIMITS);
    expect(result.visualTokens).toBe(1564);
    expect(result.height).toBe(952);
    expect(result.width).toBe(1270);
    expect(roundTiesToEven(952.5)).toBe(952);
  });

  it("resizes the A4 scan worked example to 924x1307", () => {
    // Both sides are under 1568px, but 39 x 55 = 2145 tokens exceeds the cap,
    // so the token limit alone triggers the resize. This is the case most
    // naive implementations get wrong.
    const result = estimateClaudeImage(1075, 1520, CLAUDE_STANDARD_LIMITS);
    expect(result.width).toBe(924);
    expect(result.height).toBe(1307);
    expect(result.resized).toBe(true);
    expect(result.visualTokens).toBeLessThanOrEqual(1568);
  });
});

describe("high-resolution tier resize (max edge 2576, max 4784 tokens)", () => {
  const cases: [number, number, number, number, number][] = [
    [200, 200, 200, 200, 64],
    [1000, 1000, 1000, 1000, 1296],
    [1092, 1092, 1092, 1092, 1521],
    [1920, 1080, 1920, 1080, 2691],
    [2000, 1500, 2000, 1500, 3888],
    [3840, 2160, 2576, 1449, 4784],
  ];

  it.each(cases)(
    "%ix%i resizes to %ix%i costing %i tokens",
    (w, h, expectW, expectH, expectTokens) => {
      const result = estimateClaudeImage(w, h, CLAUDE_HIGH_RESOLUTION_LIMITS);
      expect(result.width).toBe(expectW);
      expect(result.height).toBe(expectH);
      expect(result.visualTokens).toBe(expectTokens);
    },
  );

  it("leaves the A4 scan untouched — it fits the larger budget", () => {
    const result = estimateClaudeImage(1075, 1520, CLAUDE_HIGH_RESOLUTION_LIMITS);
    expect(result.resized).toBe(false);
    expect(result.visualTokens).toBe(2145);
  });
});

/* ------------------------------------------------------------------ */
/* Shape invariants                                                    */
/* ------------------------------------------------------------------ */

describe("resize invariants", () => {
  const SHAPES: [string, number, number][] = [
    ["square", 4000, 4000],
    ["landscape", 3840, 2160],
    ["portrait", 2160, 3840],
    ["panoramic", 8000, 900],
    ["tall phone screenshot", 1170, 6000],
    ["already small", 320, 240],
    ["huge smartphone photo", 4032, 3024],
    ["one pixel", 1, 1],
  ];

  const TIERS: [string, typeof CLAUDE_STANDARD_LIMITS][] = [
    ["standard", CLAUDE_STANDARD_LIMITS],
    ["high-resolution", CLAUDE_HIGH_RESOLUTION_LIMITS],
  ];

  for (const [tierName, limits] of TIERS) {
    describe(tierName, () => {
      it.each(SHAPES)("never upscales %s", (_name, w, h) => {
        const result = estimateClaudeImage(w, h, limits);
        expect(result.width).toBeLessThanOrEqual(w);
        expect(result.height).toBeLessThanOrEqual(h);
      });

      it.each(SHAPES)("keeps %s within both limits", (_name, w, h) => {
        const result = estimateClaudeImage(w, h, limits);
        expect(result.width).toBeLessThanOrEqual(limits.maxEdgePx);
        expect(result.height).toBeLessThanOrEqual(limits.maxEdgePx);
        expect(result.visualTokens).toBeLessThanOrEqual(limits.maxVisualTokens);
      });

      it.each(SHAPES)("preserves the aspect ratio of %s", (_name, w, h) => {
        const result = estimateClaudeImage(w, h, limits);
        if (!result.resized) return;
        const before = w / h;
        const after = result.width / result.height;
        // One pixel of rounding on a short edge moves the ratio slightly.
        expect(Math.abs(after - before) / before).toBeLessThan(0.02);
      });

      it.each(SHAPES)("is idempotent for %s", (_name, w, h) => {
        const once = estimateClaudeImage(w, h, limits);
        const twice = estimateClaudeImage(once.width, once.height, limits);
        expect(twice.width).toBe(once.width);
        expect(twice.height).toBe(once.height);
        expect(twice.resized).toBe(false);
      });
    });
  }

  it("transposes consistently between portrait and landscape", () => {
    const landscape = claudeResizedSize(3840, 2160, CLAUDE_STANDARD_LIMITS);
    const portrait = claudeResizedSize(2160, 3840, CLAUDE_STANDARD_LIMITS);
    expect(portrait.width).toBe(landscape.height);
    expect(portrait.height).toBe(landscape.width);
  });

  it("lets the edge limit bind on very elongated images", () => {
    // A panorama is limited by its long edge, not by its token count.
    const result = estimateClaudeImage(8000, 900, CLAUDE_STANDARD_LIMITS);
    expect(result.width).toBeLessThanOrEqual(CLAUDE_STANDARD_LIMITS.maxEdgePx);
    expect(result.visualTokens).toBeLessThan(
      CLAUDE_STANDARD_LIMITS.maxVisualTokens,
    );
  });
});

/* ------------------------------------------------------------------ */
/* The savings-exaggeration trap                                       */
/* ------------------------------------------------------------------ */

describe("no false savings", () => {
  it("reports zero saving when the provider resizes both to the same size", () => {
    // A standard-tier model downscales BOTH a 4K screenshot and a 1080p one to
    // 1456x819. Comparing raw pixels would claim a large saving; comparing what
    // Claude actually processes correctly reports none.
    const original = estimateClaudeImage(3840, 2160, CLAUDE_STANDARD_LIMITS);
    const optimised = estimateClaudeImage(1920, 1080, CLAUDE_STANDARD_LIMITS);
    expect(original.visualTokens).toBe(optimised.visualTokens);
    expect(original.width).toBe(optimised.width);
  });

  it("reports a real saving when the optimised copy is genuinely smaller", () => {
    const original = estimateClaudeImage(3840, 2160, CLAUDE_HIGH_RESOLUTION_LIMITS);
    const optimised = estimateClaudeImage(1280, 720, CLAUDE_HIGH_RESOLUTION_LIMITS);
    expect(optimised.visualTokens).toBeLessThan(original.visualTokens);
  });

  it("never reports a saving for a re-encode at identical dimensions", () => {
    // Converting PNG to WebP changes bytes, not pixels — so not tokens.
    const before = estimateClaudeImage(1600, 1200, CLAUDE_HIGH_RESOLUTION_LIMITS);
    const after = estimateClaudeImage(1600, 1200, CLAUDE_HIGH_RESOLUTION_LIMITS);
    expect(after.visualTokens).toBe(before.visualTokens);
  });
});

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

describe("provider registry", () => {
  it("has a resolvable default profile", () => {
    expect(getProfile(DEFAULT_PROFILE_ID)).toBeDefined();
  });

  it("gives every profile a source and a verification date", () => {
    for (const profile of VISION_PROVIDER_PROFILES) {
      expect(profile.source, profile.id).toMatch(/^https:\/\//);
      expect(profile.lastVerified, profile.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(profile.calculationMethod.length, profile.id).toBeGreaterThan(20);
    }
  });

  it("uses unique profile ids", () => {
    const ids = VISION_PROVIDER_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only attaches an estimator to documented providers", () => {
    for (const profile of VISION_PROVIDER_PROFILES) {
      if (profile.support === "documented") {
        expect(profile.estimate, profile.id).toBeTypeOf("function");
        expect(profile.limits, profile.id).toBeDefined();
      } else {
        // Inventing a number here would be worse than showing none.
        expect(profile.estimate, profile.id).toBeUndefined();
        expect(profile.limits, profile.id).toBeUndefined();
        expect(profile.unsupportedNote, profile.id).toMatch(/varies/i);
      }
    }
  });

  it("treats Claude as the only documented provider for now", () => {
    const documented = documentedProfiles();
    expect(documented.length).toBeGreaterThan(0);
    expect(documented.every((p) => p.provider === "claude")).toBe(true);
  });

  it("flags a profile as stale once its numbers age out", () => {
    const profile = { lastVerified: "2026-08-27" };
    expect(isProfileStale(profile, new Date("2026-09-01T00:00:00Z"))).toBe(false);
    expect(profileAgeDays(profile, new Date("2026-09-01T00:00:00Z"))).toBe(5);
    expect(isProfileStale(profile, new Date("2027-06-01T00:00:00Z"))).toBe(true);
  });

  it("treats an unparseable date as stale rather than fresh", () => {
    expect(isProfileStale({ lastVerified: "not-a-date" }, new Date())).toBe(true);
  });
});
