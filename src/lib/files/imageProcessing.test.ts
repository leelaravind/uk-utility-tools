import { describe, expect, it } from "vitest";

import {
  buildOutputFilename,
  computeTargetDimensions,
  formatBytes,
  percentSaved,
} from "./imageProcessing";

describe("computeTargetDimensions", () => {
  it("returns the original size when nothing is requested", () => {
    expect(
      computeTargetDimensions(800, 600, { lockAspect: true }),
    ).toEqual({ width: 800, height: 600 });
    expect(
      computeTargetDimensions(800, 600, { lockAspect: false }),
    ).toEqual({ width: 800, height: 600 });
  });

  it("derives height from an explicit width when aspect is locked", () => {
    expect(
      computeTargetDimensions(800, 600, { width: 400, lockAspect: true }),
    ).toEqual({ width: 400, height: 300 });
  });

  it("derives width from an explicit height when aspect is locked", () => {
    expect(
      computeTargetDimensions(800, 600, { height: 300, lockAspect: true }),
    ).toEqual({ width: 400, height: 300 });
  });

  it("fits inside a bounding box when both dimensions are given with lock", () => {
    // Scale = min(400/800, 400/600) = 0.5 → 400×300.
    expect(
      computeTargetDimensions(800, 600, {
        width: 400,
        height: 400,
        lockAspect: true,
      }),
    ).toEqual({ width: 400, height: 300 });
  });

  it("uses dimensions exactly as given when aspect is unlocked", () => {
    expect(
      computeTargetDimensions(800, 600, {
        width: 400,
        height: 500,
        lockAspect: false,
      }),
    ).toEqual({ width: 400, height: 500 });
    // A single unlocked dimension leaves the other at the original.
    expect(
      computeTargetDimensions(800, 600, { width: 400, lockAspect: false }),
    ).toEqual({ width: 400, height: 600 });
  });

  it("rounds derived dimensions to whole pixels", () => {
    // 333 / 1000 * 600 = 199.8 → 200.
    expect(
      computeTargetDimensions(1000, 600, { width: 333, lockAspect: true }),
    ).toEqual({ width: 333, height: 200 });
  });

  it("never returns less than 1px", () => {
    // 1 / 10000 * 10 = 0.001 → rounds to 0 → clamped to 1.
    expect(
      computeTargetDimensions(10000, 10, { width: 1, lockAspect: true }),
    ).toEqual({ width: 1, height: 1 });
  });

  it("allows an explicit upscale", () => {
    expect(
      computeTargetDimensions(800, 600, { width: 1600, lockAspect: true }),
    ).toEqual({ width: 1600, height: 1200 });
  });

  it("clamps the longest side to maxDimension, preserving aspect", () => {
    expect(
      computeTargetDimensions(4000, 3000, {
        lockAspect: true,
        maxDimension: 1000,
      }),
    ).toEqual({ width: 1000, height: 750 });
  });

  it("applies maxDimension after explicit dimensions", () => {
    // Explicit 5000 wide → 5000×3750, clamp to 4000 → 4000×3000.
    expect(
      computeTargetDimensions(800, 600, {
        width: 5000,
        lockAspect: true,
        maxDimension: 4000,
      }),
    ).toEqual({ width: 4000, height: 3000 });
  });

  it("does not upscale small images to reach maxDimension", () => {
    expect(
      computeTargetDimensions(800, 600, {
        lockAspect: true,
        maxDimension: 2000,
      }),
    ).toEqual({ width: 800, height: 600 });
  });

  it("treats zero, negative and NaN requested dimensions as unset", () => {
    expect(
      computeTargetDimensions(800, 600, { width: 0, lockAspect: true }),
    ).toEqual({ width: 800, height: 600 });
    expect(
      computeTargetDimensions(800, 600, { width: -50, lockAspect: true }),
    ).toEqual({ width: 800, height: 600 });
    expect(
      computeTargetDimensions(800, 600, {
        width: Number.NaN,
        lockAspect: true,
      }),
    ).toEqual({ width: 800, height: 600 });
  });

  it("returns 1×1 for invalid original dimensions", () => {
    expect(
      computeTargetDimensions(0, 600, { lockAspect: true }),
    ).toEqual({ width: 1, height: 1 });
    expect(
      computeTargetDimensions(Number.NaN, 600, { lockAspect: true }),
    ).toEqual({ width: 1, height: 1 });
  });
});

describe("buildOutputFilename", () => {
  it("replaces the extension for the chosen format", () => {
    expect(buildOutputFilename("photo.png", "image/webp")).toBe("photo.webp");
    expect(buildOutputFilename("photo.jpeg", "image/jpeg")).toBe("photo.jpg");
    expect(buildOutputFilename("scan.webp", "image/png")).toBe("scan.png");
  });

  it("inserts the suffix before the extension", () => {
    expect(buildOutputFilename("photo.png", "image/jpeg", "-800x600")).toBe(
      "photo-800x600.jpg",
    );
  });

  it("only strips the final extension", () => {
    expect(buildOutputFilename("archive.tar.gz", "image/jpeg")).toBe(
      "archive.tar.jpg",
    );
  });

  it("handles names without an extension", () => {
    expect(buildOutputFilename("photo", "image/png")).toBe("photo.png");
  });

  it("falls back to 'image' for empty names", () => {
    expect(buildOutputFilename("", "image/jpeg")).toBe("image.jpg");
    expect(buildOutputFilename("   ", "image/jpeg")).toBe("image.jpg");
  });
});

describe("formatBytes", () => {
  it("formats bytes below 1 KB as whole bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats KB and MB with one decimal place", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(2621440)).toBe("2.5 MB");
  });

  it("drops the decimal for values of 100 or more", () => {
    // 150000 / 1024 = 146.484… → "146 KB".
    expect(formatBytes(150000)).toBe("146 KB");
    expect(formatBytes(80 * 1024 * 1024)).toBe("80 MB");
  });

  it("formats GB", () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2 GB");
  });

  it("returns 0 B for invalid input", () => {
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  });
});

describe("percentSaved", () => {
  it("computes whole-number savings", () => {
    expect(percentSaved(1000, 250)).toBe(75);
    expect(percentSaved(2048, 1024)).toBe(50);
  });

  it("rounds to the nearest whole percent", () => {
    expect(percentSaved(1000, 999)).toBe(0); // 0.1% → 0
    expect(percentSaved(1000, 994)).toBe(1); // 0.6% → 1
  });

  it("returns a negative value when the file grew", () => {
    expect(percentSaved(1000, 1100)).toBe(-10);
  });

  it("returns 0 for invalid input", () => {
    expect(percentSaved(0, 100)).toBe(0);
    expect(percentSaved(-10, 100)).toBe(0);
    expect(percentSaved(1000, Number.NaN)).toBe(0);
    expect(percentSaved(1000, -1)).toBe(0);
  });
});
