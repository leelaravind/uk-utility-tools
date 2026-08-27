import { describe, expect, it } from "vitest";

import { HEADERS } from "./fixtures";
import {
  INFERENCE_MAX_EDGE_PX,
  MAX_DECODED_DIMENSION_PX,
  MAX_INPUT_BYTES,
  inferenceDimensions,
  isSupportedFormat,
  sniffFormat,
  validateDimensions,
  validateImageFile,
} from "./validate";

describe("sniffFormat", () => {
  it("recognises the supported formats from their magic bytes", () => {
    expect(sniffFormat(HEADERS.png)).toBe("image/png");
    expect(sniffFormat(HEADERS.jpeg)).toBe("image/jpeg");
    expect(sniffFormat(HEADERS.webp)).toBe("image/webp");
  });

  it("recognises unsupported formats so the error can explain itself", () => {
    expect(sniffFormat(HEADERS.gif)).toBe("image/gif");
    expect(sniffFormat(HEADERS.pdf)).toBe("application/pdf");
  });

  it("recognises SVG from its markup", () => {
    const svg = new TextEncoder().encode(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
    );
    expect(sniffFormat(svg)).toBe("image/svg+xml");
  });

  it("returns unknown rather than guessing", () => {
    expect(sniffFormat(HEADERS.zip)).toBe("unknown");
    expect(sniffFormat(HEADERS.empty)).toBe("unknown");
  });

  it("does not mistake a truncated header for a match", () => {
    expect(sniffFormat(new Uint8Array([0x89, 0x50]))).toBe("unknown");
    // "RIFF" without the "WEBP" chunk is a WAV or AVI, not an image.
    expect(
      sniffFormat(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0])),
    ).toBe("unknown");
  });
});

describe("isSupportedFormat", () => {
  it("accepts only PNG, JPEG and WebP", () => {
    expect(isSupportedFormat("image/png")).toBe(true);
    expect(isSupportedFormat("image/jpeg")).toBe(true);
    expect(isSupportedFormat("image/webp")).toBe(true);
    expect(isSupportedFormat("image/gif")).toBe(false);
    expect(isSupportedFormat("application/pdf")).toBe(false);
  });
});

describe("validateImageFile", () => {
  it("accepts a well-formed PNG", () => {
    const result = validateImageFile({
      type: "image/png",
      size: 1024,
      header: HEADERS.png,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mime).toBe("image/png");
    expect(result.typeMismatch).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("trusts the bytes, not the declared type, when they disagree", () => {
    // A JPEG that claims to be a PNG: accepted as a JPEG, with a warning.
    const result = validateImageFile({
      type: "image/png",
      size: 2048,
      header: HEADERS.jpeg,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mime).toBe("image/jpeg");
    expect(result.typeMismatch).toBe(true);
    expect(result.warnings[0]).toContain("image/jpeg");
  });

  it("rejects a spoofed file whose bytes are not an image at all", () => {
    // The classic attack: a ZIP or executable renamed to .png.
    const result = validateImageFile({
      type: "image/png",
      size: 4096,
      header: HEADERS.zip,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unsupported-type");
  });

  it("treats image/jpg as image/jpeg rather than a mismatch", () => {
    const result = validateImageFile({
      type: "image/jpg",
      size: 100,
      header: HEADERS.jpeg,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.typeMismatch).toBe(false);
  });

  it("accepts a file with no declared type when its bytes are valid", () => {
    const result = validateImageFile({ size: 100, header: HEADERS.webp });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mime).toBe("image/webp");
    expect(result.typeMismatch).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateImageFile({
      type: "image/png",
      size: 0,
      header: HEADERS.empty,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("empty");
  });

  it("rejects a file over the size limit before decoding anything", () => {
    const result = validateImageFile({
      type: "image/png",
      size: MAX_INPUT_BYTES + 1,
      header: HEADERS.png,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("too-large");
    expect(result.message).toContain("20 MB");
  });

  it("explains PDFs specifically instead of saying 'unknown file'", () => {
    const result = validateImageFile({
      type: "application/pdf",
      size: 5000,
      header: HEADERS.pdf,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("PDF");
  });
});

describe("validateDimensions", () => {
  it("accepts ordinary dimensions with no warnings", () => {
    const result = validateDimensions(1920, 1080);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("rejects a side longer than the limit", () => {
    const result = validateDimensions(MAX_DECODED_DIMENSION_PX + 1, 100);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("too-many-dimensions");
  });

  it("rejects a decompression-bomb pixel count inside the per-side limit", () => {
    // 10,000 x 10,000 is under the 12,000px side limit but is 100 megapixels.
    const result = validateDimensions(10_000, 10_000);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("too-many-pixels");
  });

  it("rejects undecodable dimensions", () => {
    expect(validateDimensions(0, 100).ok).toBe(false);
    expect(validateDimensions(Number.NaN, 100).code).toBe("undecodable");
  });

  it("warns rather than fails for a merely large image", () => {
    const result = validateDimensions(5000, 4000);
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("megapixels");
  });
});

describe("inferenceDimensions", () => {
  it("downscales to the mode's longest edge, preserving aspect ratio", () => {
    const result = inferenceDimensions(3200, 1600, "balanced");
    expect(result.width).toBe(INFERENCE_MAX_EDGE_PX.balanced);
    expect(result.height).toBe(INFERENCE_MAX_EDGE_PX.balanced / 2);
    expect(result.downscaled).toBe(true);
  });

  it("never upscales a small image", () => {
    const result = inferenceDimensions(320, 240, "detailed");
    expect(result).toMatchObject({ width: 320, height: 240, downscaled: false });
  });

  it("uses a smaller working copy in fast mode than in detailed mode", () => {
    expect(INFERENCE_MAX_EDGE_PX.fast).toBeLessThan(
      INFERENCE_MAX_EDGE_PX.detailed,
    );
  });
});
