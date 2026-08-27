import { describe, expect, it } from "vitest";

import {
  CLAUDE_HIGH_RESOLUTION_LIMITS,
  CLAUDE_HIGH_RESOLUTION_PROFILE,
  CLAUDE_MAX_SOURCE_EDGE_PX,
  CLAUDE_STANDARD_LIMITS,
  CLAUDE_STANDARD_PROFILE,
  GEMINI_PROFILE,
  OPENAI_PROFILE,
  VISION_PROVIDER_PROFILES,
  estimateClaudeImage,
} from "@/config/imageProviders";

import {
  CONTENT_PRESETS,
  CONTENT_PRESET_IDS,
  DEFAULT_CONTENT_PRESET,
  DEFAULT_RESIZE_PRESET,
  RESIZE_PRESETS,
  RESIZE_PRESET_IDS,
  compareForProvider,
  describeFormat,
  describeMegapixels,
  exceedsProviderSourceLimit,
  formatDimensions,
  formatReductionPercent,
  formatTokens,
  getContentPreset,
  getResizePreset,
  megapixels,
  planOptimisation,
  providerEffectiveSize,
  providerSourceEdgeCap,
  referenceProfileFor,
  suggestContentPreset,
  type ResizePresetId,
} from "./optimize";

const HIGH = CLAUDE_HIGH_RESOLUTION_PROFILE;
const STANDARD = CLAUDE_STANDARD_PROFILE;

/** The representative shapes every preset has to cope with. */
const SHAPES: [name: string, width: number, height: number][] = [
  ["square", 4000, 4000],
  ["landscape 4K", 3840, 2160],
  ["portrait 4K", 2160, 3840],
  ["panoramic", 5000, 800],
  ["tall panoramic", 800, 5000],
  ["already small", 320, 240],
  ["huge smartphone photo", 4032, 3024],
  ["tiny", 16, 16],
];

const SIZING_PRESETS = RESIZE_PRESET_IDS.filter(
  (id): id is Exclude<ResizePresetId, "custom"> => id !== "custom",
);

function plan(
  width: number,
  height: number,
  preset: ResizePresetId,
  extra: Partial<Parameters<typeof planOptimisation>[0]> = {},
) {
  return planOptimisation({
    sourceWidth: width,
    sourceHeight: height,
    profile: HIGH,
    resizePreset: preset,
    ...extra,
  });
}

/* ------------------------------------------------------------------ */
/* Preset registry                                                     */
/* ------------------------------------------------------------------ */

describe("preset registries", () => {
  it("exposes every documented resize preset id exactly once", () => {
    expect(RESIZE_PRESETS.map((p) => p.id)).toEqual([...RESIZE_PRESET_IDS]);
    expect(new Set(RESIZE_PRESET_IDS).size).toBe(RESIZE_PRESET_IDS.length);
  });

  it("exposes every content preset id exactly once", () => {
    expect(CONTENT_PRESETS.map((p) => p.id)).toEqual([...CONTENT_PRESET_IDS]);
    expect(new Set(CONTENT_PRESET_IDS).size).toBe(CONTENT_PRESET_IDS.length);
  });

  it("gives every preset a label and a one-line description", () => {
    for (const preset of [...RESIZE_PRESETS, ...CONTENT_PRESETS]) {
      expect(preset.label.length, preset.id).toBeGreaterThan(2);
      expect(preset.description.length, preset.id).toBeGreaterThan(20);
    }
  });

  it("resolves defaults and falls back for unknown ids", () => {
    expect(getResizePreset(DEFAULT_RESIZE_PRESET).id).toBe("recommended");
    expect(getContentPreset(DEFAULT_CONTENT_PRESET).id).toBe("auto");
    expect(getResizePreset("nope" as ResizePresetId).id).toBe(
      RESIZE_PRESETS[0].id,
    );
  });

  it("uses lossless PNG only where quality is meaningless", () => {
    for (const preset of CONTENT_PRESETS) {
      if (preset.format === "image/png") expect(preset.quality).toBe(1);
      else expect(preset.quality).toBeGreaterThan(0.5);
      expect(preset.quality).toBeLessThanOrEqual(1);
    }
  });

  it("favours legibility for text-bearing content and compression for photos", () => {
    const photo = getContentPreset("photo");
    for (const id of ["screenshot", "document", "diagram"] as const) {
      const preset = getContentPreset(id);
      expect(preset.preferSharpDownscale, id).toBe(true);
      // PNG is lossless, so it trivially beats any lossy quality.
      const effective = preset.format === "image/png" ? 1 : preset.quality;
      expect(effective, id).toBeGreaterThan(photo.quality);
    }
    expect(photo.preferSharpDownscale).toBe(false);
  });

  it("suggests a content preset from the source type only", () => {
    expect(suggestContentPreset("image/png")).toBe("screenshot");
    expect(suggestContentPreset("image/jpeg")).toBe("photo");
    expect(suggestContentPreset("image/JPEG")).toBe("photo");
    expect(suggestContentPreset("image/webp")).toBe("auto");
    expect(suggestContentPreset("")).toBe("auto");
  });
});

/* ------------------------------------------------------------------ */
/* Presets across every shape                                          */
/* ------------------------------------------------------------------ */

describe("resize presets across image shapes", () => {
  it.each(SHAPES)(
    "never enlarges %s (%ix%i) under any preset",
    (_name, width, height) => {
      for (const preset of SIZING_PRESETS) {
        const result = plan(width, height, preset);
        expect(result.width, preset).toBeLessThanOrEqual(width);
        expect(result.height, preset).toBeLessThanOrEqual(height);
        expect(result.upscaled, preset).toBe(false);
        expect(result.width, preset).toBeGreaterThanOrEqual(1);
        expect(result.height, preset).toBeGreaterThanOrEqual(1);
      }
    },
  );

  it.each(SHAPES)(
    "preserves the aspect ratio of %s (%ix%i) under any preset",
    (_name, width, height) => {
      for (const preset of SIZING_PRESETS) {
        const result = plan(width, height, preset);
        expect(result.aspectPreserved, `${preset} ${result.width}x${result.height}`).toBe(
          true,
        );
      }
    },
  );

  it.each(SHAPES)(
    "orders the ladder low-token <= balanced <= recommended for %s",
    (_name, width, height) => {
      const low = plan(width, height, "low-token");
      const balanced = plan(width, height, "balanced");
      const recommended = plan(width, height, "recommended");
      expect(low.width).toBeLessThanOrEqual(balanced.width);
      expect(balanced.width).toBeLessThanOrEqual(recommended.width);
      expect(low.height).toBeLessThanOrEqual(balanced.height);
      expect(balanced.height).toBeLessThanOrEqual(recommended.height);
    },
  );

  it("targets exactly the provider's own effective size for 'recommended'", () => {
    for (const [name, width, height] of SHAPES) {
      const effective = estimateClaudeImage(
        width,
        height,
        CLAUDE_HIGH_RESOLUTION_LIMITS,
      );
      const result = plan(width, height, "recommended");
      expect(Math.max(result.width, result.height), name).toBe(
        Math.max(effective.width, effective.height),
      );
    }
  });

  it("makes 'low token' materially smaller than the provider's own size", () => {
    // 4K landscape is big enough that the halving is unambiguous.
    const recommended = plan(3840, 2160, "recommended");
    const low = plan(3840, 2160, "low-token");
    expect(low.width).toBeLessThan(recommended.width * 0.6);
    const lowTokens = estimateClaudeImage(
      low.width,
      low.height,
      CLAUDE_HIGH_RESOLUTION_LIMITS,
    ).visualTokens;
    const recTokens = estimateClaudeImage(
      recommended.width,
      recommended.height,
      CLAUDE_HIGH_RESOLUTION_LIMITS,
    ).visualTokens;
    expect(lowTokens).toBeLessThan(recTokens / 2);
  });

  it("keeps 'high detail' at or below the provider's documented edge cap", () => {
    for (const [name, width, height] of SHAPES) {
      const result = plan(width, height, "high-detail");
      expect(
        Math.max(result.width, result.height),
        name,
      ).toBeLessThanOrEqual(CLAUDE_HIGH_RESOLUTION_LIMITS.maxEdgePx);
    }
  });

  it("keeps 'high detail' at least as large as 'recommended'", () => {
    for (const [name, width, height] of SHAPES) {
      const high = plan(width, height, "high-detail");
      const recommended = plan(width, height, "recommended");
      expect(high.width, name).toBeGreaterThanOrEqual(recommended.width);
    }
  });

  it("leaves an already-small image untouched on 'recommended'", () => {
    const result = plan(320, 240, "recommended");
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.noOp).toBe(true);
    expect(result.notes.join(" ")).toContain("keep the original pixel dimensions");
  });

  it("halves an already-small image on 'low token'", () => {
    const result = plan(320, 240, "low-token");
    expect(result).toMatchObject({ width: 160, height: 120, noOp: false });
  });

  it("uses the tier that is actually selected", () => {
    const high = plan(3840, 2160, "recommended", { profile: HIGH });
    const standard = plan(3840, 2160, "recommended", { profile: STANDARD });
    expect(high.width).toBe(2576);
    expect(standard.width).toBe(1456);
  });
});

/* ------------------------------------------------------------------ */
/* Custom sizes and upscaling                                          */
/* ------------------------------------------------------------------ */

describe("custom sizing", () => {
  it("derives the missing dimension from the aspect ratio", () => {
    const result = plan(3840, 2160, "custom", { customWidth: 1920 });
    expect(result).toMatchObject({ width: 1920, height: 1080 });
    expect(result.aspectPreserved).toBe(true);
  });

  it("fits inside a bounding box when both dimensions are given", () => {
    const result = plan(3840, 2160, "custom", {
      customWidth: 1000,
      customHeight: 1000,
    });
    expect(result).toMatchObject({ width: 1000, height: 563 });
  });

  it("allows a stretched size only when the aspect lock is off", () => {
    const result = plan(3840, 2160, "custom", {
      customWidth: 1000,
      customHeight: 1000,
      lockAspect: false,
    });
    expect(result).toMatchObject({ width: 1000, height: 1000 });
    expect(result.aspectPreserved).toBe(false);
  });

  it("refuses an accidental upscale and says why", () => {
    const result = plan(800, 600, "custom", { customWidth: 4000 });
    expect(result.upscaleRequested).toBe(true);
    expect(result.upscaled).toBe(false);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.notes.join(" ")).toContain("larger than the original");
  });

  it("refuses a per-axis upscale with the aspect lock off", () => {
    const result = plan(800, 600, "custom", {
      customWidth: 4000,
      customHeight: 100,
      lockAspect: false,
    });
    expect(result.width).toBe(800);
    expect(result.height).toBe(100);
    expect(result.upscaled).toBe(false);
  });

  it("upscales only when the caller explicitly opts in", () => {
    const result = plan(800, 600, "custom", {
      customWidth: 1600,
      allowUpscale: true,
    });
    expect(result).toMatchObject({ width: 1600, height: 1200, upscaled: true });
    expect(result.notes.join(" ")).toContain("will not add detail");
  });

  it("never exceeds the shared engine's maximum dimension", () => {
    const result = plan(800, 600, "custom", {
      customWidth: 99_000,
      allowUpscale: true,
    });
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(12_000);
  });

  it("ignores zero, negative and non-finite custom sizes", () => {
    for (const bad of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = plan(800, 600, "custom", { customWidth: bad });
      expect(result, String(bad)).toMatchObject({ width: 800, height: 600 });
    }
  });
});

/* ------------------------------------------------------------------ */
/* Format and quality                                                  */
/* ------------------------------------------------------------------ */

describe("format and quality planning", () => {
  it("takes format and quality from the content preset by default", () => {
    const photo = plan(1000, 1000, "recommended", { contentPreset: "photo" });
    expect(photo.format).toBe(getContentPreset("photo").format);
    expect(photo.quality).toBe(getContentPreset("photo").quality);
    expect(photo.preferSharpDownscale).toBe(false);
  });

  it("lets explicit format and quality override the preset", () => {
    const result = plan(1000, 1000, "recommended", {
      contentPreset: "photo",
      format: "image/jpeg",
      quality: 0.6,
    });
    expect(result).toMatchObject({ format: "image/jpeg", quality: 0.6 });
  });

  it("forces quality to 1 for lossless PNG", () => {
    const result = plan(1000, 1000, "recommended", {
      format: "image/png",
      quality: 0.3,
    });
    expect(result.quality).toBe(1);
  });

  it("clamps out-of-range quality", () => {
    expect(plan(100, 100, "recommended", { quality: 5 }).quality).toBe(1);
    expect(plan(100, 100, "recommended", { quality: 0 }).quality).toBe(0.01);
    expect(
      plan(100, 100, "recommended", { quality: Number.NaN }).quality,
    ).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* THE ACCURACY REQUIREMENT: no fabricated savings                     */
/* ------------------------------------------------------------------ */

describe("compareForProvider — no false savings", () => {
  it("reports zero saving when the provider downscales both to the same size", () => {
    // The trap: raw pixels suggest a 75% cut, but Claude's standard tier
    // resizes BOTH 3840x2160 and 1920x1080 to 1456x819 (1560 tokens).
    const result = compareForProvider(3840, 2160, 1920, 1080, STANDARD);
    expect(result.original?.visualTokens).toBe(1560);
    expect(result.optimised?.visualTokens).toBe(1560);
    expect(result.tokenReduction).toBe(0);
    expect(result.tokenReductionPercent).toBe(0);
    expect(result.providerResizedOriginal).toBe(true);
    expect(result.note).toContain("unchanged");
  });

  it("matches the frozen provider maths rather than re-deriving it", () => {
    const result = compareForProvider(3840, 2160, 1920, 1080, STANDARD);
    expect(result.original).toEqual(
      estimateClaudeImage(3840, 2160, CLAUDE_STANDARD_LIMITS),
    );
    expect(result.optimised).toEqual(
      estimateClaudeImage(1920, 1080, CLAUDE_STANDARD_LIMITS),
    );
  });

  it("reports zero token change for a re-encode at identical dimensions", () => {
    // PNG -> WebP at 1600x1200 changes bytes, not pixels, so not tokens.
    const result = compareForProvider(1600, 1200, 1600, 1200, HIGH);
    expect(result.tokenReduction).toBe(0);
    expect(result.tokenReductionPercent).toBe(0);
    expect(result.original?.visualTokens).toBe(result.optimised?.visualTokens);
    expect(result.note).toContain("file size only");
  });

  it("reports a real saving when the provider genuinely sees fewer pixels", () => {
    const result = compareForProvider(3840, 2160, 1280, 720, HIGH);
    expect(result.original?.visualTokens).toBe(4784);
    expect(result.optimised?.visualTokens).toBe(1196);
    expect(result.tokenReduction).toBe(3588);
    expect(result.tokenReductionPercent).toBe(75);
  });

  it("computes the percentage from effective tokens, not from pixels", () => {
    // Raw pixel area falls by ~89%; effective tokens fall by 67.4%.
    const result = compareForProvider(3840, 2160, 1280, 720, STANDARD);
    expect(result.original?.visualTokens).toBe(1560);
    expect(result.optimised?.visualTokens).toBe(1196);
    expect(result.tokenReduction).toBe(364);
    expect(result.tokenReductionPercent).toBe(23.3);
  });

  it("reports an increase as an increase, never clamped to zero", () => {
    const result = compareForProvider(1000, 1000, 2000, 2000, HIGH);
    expect(result.tokenReduction).not.toBeNull();
    expect(result.tokenReduction as number).toBeLessThan(0);
    expect(result.tokenReductionPercent as number).toBeLessThan(0);
    expect(result.note).toContain("more visual tokens");
  });

  it("flags when the provider will still downscale the optimised copy", () => {
    // A square 4000x4000 hits the token cap; cropping it to a 4:1 strip hits
    // the edge cap instead, so the copy is smaller AND still downscaled.
    const result = compareForProvider(4000, 4000, 4000, 1000, HIGH);
    expect(result.optimised?.resized).toBe(true);
    expect(result.tokenReduction as number).toBeGreaterThan(0);
    expect(result.note).toContain("still downscale");
  });

  it("reports zero change when both sizes collapse to the same effective size", () => {
    // Same aspect ratio, both over the cap: the provider ends up at an
    // identical size, so there is nothing to claim.
    const result = compareForProvider(6000, 4000, 4000, 2667, HIGH);
    expect(result.optimised?.resized).toBe(true);
    expect(result.tokenReduction).toBe(0);
    expect(result.note).toContain("unchanged");
  });

  it("says nothing about a downscale the provider did not perform", () => {
    const result = compareForProvider(1200, 900, 600, 450, HIGH);
    expect(result.providerResizedOriginal).toBe(false);
    expect(result.optimised?.resized).toBe(false);
    expect(result.note).toBeUndefined();
  });

  it.each([
    ["landscape 4K", 3840, 2160],
    ["portrait 4K", 2160, 3840],
    ["square", 4000, 4000],
    ["panoramic", 5000, 800],
    ["huge smartphone photo", 4032, 3024],
  ] as [string, number, number][])(
    "never claims a saving for 'recommended' on %s, which only trims wasted pixels",
    (_name, width, height) => {
      const target = plan(width, height, "recommended");
      const result = compareForProvider(
        width,
        height,
        target.width,
        target.height,
        HIGH,
      );
      // "Recommended" matches the provider's own resize, so the honest answer
      // is zero token change plus a smaller upload.
      expect(result.tokenReduction).toBe(0);
      expect(result.tokenReductionPercent).toBe(0);
    },
  );
});

/* ------------------------------------------------------------------ */
/* Providers with no published rule                                    */
/* ------------------------------------------------------------------ */

describe("providers without a documented rule", () => {
  it.each([OPENAI_PROFILE, GEMINI_PROFILE])(
    "returns null (not zero, not a guess) for $providerLabel",
    (profile) => {
      const result = compareForProvider(3840, 2160, 1280, 720, profile);
      expect(result.tokenReduction).toBeNull();
      expect(result.tokenReductionPercent).toBeNull();
      expect(result.original).toBeNull();
      expect(result.optimised).toBeNull();
      expect(result.providerResizedOriginal).toBe(false);
      expect(result.note).toBe(profile.unsupportedNote);
    },
  );

  it("returns no effective size for a provider with no estimator", () => {
    expect(providerEffectiveSize(OPENAI_PROFILE, 100, 100)).toBeNull();
    expect(providerEffectiveSize(HIGH, 100, 100)).not.toBeNull();
  });

  it("still plans a size, using a disclosed reference profile", () => {
    const result = plan(3840, 2160, "recommended", { profile: OPENAI_PROFILE });
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(referenceProfileFor(OPENAI_PROFILE).support).toBe("documented");
    expect(result.notes.join(" ")).toContain(
      "does not publish an image-token rule",
    );
  });

  it("resolves a documented reference for every profile in the registry", () => {
    for (const profile of VISION_PROVIDER_PROFILES) {
      const reference = referenceProfileFor(profile);
      expect(reference.support, profile.id).toBe("documented");
      expect(reference.limits, profile.id).toBeDefined();
    }
  });

  it("keeps a documented profile as its own reference", () => {
    expect(referenceProfileFor(HIGH).id).toBe(HIGH.id);
    expect(referenceProfileFor(STANDARD).id).toBe(STANDARD.id);
  });
});

/* ------------------------------------------------------------------ */
/* Plan notes                                                          */
/* ------------------------------------------------------------------ */

describe("plan notes", () => {
  it("explains that pre-resizing to the provider's size saves bytes, not tokens", () => {
    const result = plan(3840, 2160, "recommended", { profile: STANDARD });
    expect(result.notes.join(" ")).toContain(
      "without changing visual-token usage",
    );
  });

  it("warns when the source is past the provider's accepted size", () => {
    const result = plan(9000, 6000, "recommended");
    expect(result.notes.join(" ")).toContain("maximum");
    expect(exceedsProviderSourceLimit(9000, 6000, HIGH)).toBe(true);
    expect(exceedsProviderSourceLimit(7999, 7999, HIGH)).toBe(false);
    expect(providerSourceEdgeCap(HIGH)).toBe(CLAUDE_MAX_SOURCE_EDGE_PX);
    expect(providerSourceEdgeCap(OPENAI_PROFILE)).toBeNull();
    expect(exceedsProviderSourceLimit(9000, 6000, OPENAI_PROFILE)).toBe(false);
  });

  it("adds no resize note when nothing surprising happened", () => {
    const result = plan(1200, 900, "low-token");
    expect(result.notes).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

describe("formatting helpers", () => {
  it("describes megapixels at a sensible precision", () => {
    expect(describeMegapixels(3840, 2160)).toBe("8.3 MP");
    expect(describeMegapixels(1920, 1080)).toBe("2.1 MP");
    expect(describeMegapixels(4032, 3024)).toBe("12.2 MP");
    expect(describeMegapixels(640, 480)).toBe("0.31 MP");
    expect(describeMegapixels(16, 16)).toBe("<0.01 MP");
    expect(describeMegapixels(0, 0)).toBe("0 MP");
    expect(describeMegapixels(Number.NaN, 100)).toBe("0 MP");
  });

  it("returns raw megapixels for arithmetic", () => {
    expect(megapixels(1000, 1000)).toBe(1);
    expect(megapixels(2000, 500)).toBe(1);
  });

  it("formats dimensions and token counts", () => {
    expect(formatDimensions(800, 600)).toBe("800 × 600 px");
    expect(formatDimensions(1456, 819)).toBe("1,456 × 819 px");
    expect(formatTokens(4784)).toBe("4,784");
  });

  it("never dresses an increase up as a saving", () => {
    expect(formatReductionPercent(67.4)).toBe("67.4% less");
    expect(formatReductionPercent(0)).toBe("No change");
    expect(formatReductionPercent(-12.5)).toBe("12.5% more");
    expect(formatReductionPercent(null)).toBe("Not available");
  });

  it("labels formats", () => {
    expect(describeFormat("image/webp")).toBe("WebP");
    expect(describeFormat("image/jpeg")).toBe("JPG");
    expect(describeFormat("image/png")).toBe("PNG");
    expect(describeFormat("image/avif")).toBe("AVIF");
    expect(describeFormat("")).toBe("Unknown");
  });
});
