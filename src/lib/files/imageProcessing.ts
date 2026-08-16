/**
 * Image processing helpers for the Image Compressor / Resizer tool.
 *
 * The first half of this module is PURE maths/formatting that runs anywhere
 * (this is what the unit tests import). The second half — clearly marked —
 * is browser-only (canvas / createImageBitmap / File) and must only be
 * called from client components.
 */

export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

/** Largest file we will attempt to decode (80 MB). */
export const MAX_FILE_BYTES = 80 * 1024 * 1024;

/** Longest image side we will decode or output, in pixels. */
export const MAX_DIMENSION_PX = 12000;

export interface TargetDimensionOptions {
  /** Explicit target width in px (user-entered). Explicit values may upscale. */
  width?: number;
  /** Explicit target height in px (user-entered). Explicit values may upscale. */
  height?: number;
  /** Keep the original aspect ratio. */
  lockAspect: boolean;
  /** Hard cap for the longest side — only ever scales DOWN, never up. */
  maxDimension?: number;
}

function positiveOrUndefined(n: number | undefined): number | undefined {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Work out the output dimensions for a resize.
 *
 * - With `lockAspect`, a single explicit dimension derives the other from the
 *   original aspect ratio; two explicit dimensions are treated as a bounding
 *   box (the image is fitted inside it).
 * - Explicit values are honoured even if larger than the original (the user
 *   asked for an upscale); nothing else ever upscales.
 * - `maxDimension` clamps the longest side down, preserving aspect ratio.
 * - Results are rounded to whole pixels, minimum 1×1.
 */
export function computeTargetDimensions(
  origW: number,
  origH: number,
  opts: TargetDimensionOptions,
): { width: number; height: number } {
  const ow = positiveOrUndefined(origW);
  const oh = positiveOrUndefined(origH);
  if (ow === undefined || oh === undefined) return { width: 1, height: 1 };

  const reqW = positiveOrUndefined(opts.width);
  const reqH = positiveOrUndefined(opts.height);

  let w: number;
  let h: number;

  if (opts.lockAspect) {
    if (reqW !== undefined && reqH !== undefined) {
      // Fit inside the requested box, preserving aspect ratio.
      const scale = Math.min(reqW / ow, reqH / oh);
      w = ow * scale;
      h = oh * scale;
    } else if (reqW !== undefined) {
      w = reqW;
      h = (reqW / ow) * oh;
    } else if (reqH !== undefined) {
      h = reqH;
      w = (reqH / oh) * ow;
    } else {
      w = ow;
      h = oh;
    }
  } else {
    w = reqW ?? ow;
    h = reqH ?? oh;
  }

  const maxDim = positiveOrUndefined(opts.maxDimension);
  if (maxDim !== undefined) {
    const longest = Math.max(w, h);
    if (longest > maxDim) {
      const scale = maxDim / longest;
      w *= scale;
      h *= scale;
    }
  }

  return {
    width: Math.max(1, Math.round(w)),
    height: Math.max(1, Math.round(h)),
  };
}

const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Build a sensible download filename from the original name, the output
 * format and an optional suffix, e.g. ("photo.png", "image/webp", "-800x600")
 * → "photo-800x600.webp". Only the final extension is replaced.
 */
export function buildOutputFilename(
  original: string,
  format: OutputFormat,
  suffix = "",
): string {
  const name = original.replace(/[/\\]+/g, " ").trim();
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).trim();
  const safeBase = base || "image";
  return `${safeBase}${suffix}.${FORMAT_EXTENSIONS[format]}`;
}

/** Human-readable file size, e.g. 1536 → "1.5 KB". Uses 1024-byte units. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;

  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded =
    value >= 100
      ? Math.round(value).toString()
      : (Math.round(value * 10) / 10).toString();
  return `${rounded} ${units[unit]}`;
}

/**
 * Whole-number percentage saved going from `originalBytes` to `newBytes`.
 * Returns a negative number if the file grew, and 0 for invalid input.
 */
export function percentSaved(originalBytes: number, newBytes: number): number {
  if (
    !Number.isFinite(originalBytes) ||
    originalBytes <= 0 ||
    !Number.isFinite(newBytes) ||
    newBytes < 0
  ) {
    return 0;
  }
  return Math.round(((originalBytes - newBytes) / originalBytes) * 100);
}

/* ------------------------------------------------------------------------ *
 * BROWSER-ONLY from here down.                                             *
 * These functions touch File / canvas / createImageBitmap and must only be *
 * called from client components. Unit tests import only the pure helpers   *
 * above this line.                                                         *
 * ------------------------------------------------------------------------ */

export const UNSUPPORTED_TYPE_MESSAGE =
  "This file type isn't supported by your browser — try JPG, PNG or WebP.";

export interface LoadedImage {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
}

function dimensionsOf(source: ImageBitmap | HTMLImageElement): {
  width: number;
  height: number;
} {
  if (
    typeof HTMLImageElement !== "undefined" &&
    source instanceof HTMLImageElement
  ) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

async function decodeViaImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(UNSUPPORTED_TYPE_MESSAGE);
  } finally {
    // Safe once decode() has resolved — the pixels are already in memory.
    URL.revokeObjectURL(url);
  }
}

/** Free the memory held by a decoded image (no-op for <img> sources). */
export function releaseImage(loaded: LoadedImage): void {
  if (typeof ImageBitmap !== "undefined" && loaded.source instanceof ImageBitmap) {
    loaded.source.close();
  }
}

/**
 * Decode an image file entirely on-device. Throws an Error with a friendly,
 * user-showable message if the file is too large, too big in pixels, or a
 * type the browser can't decode (e.g. HEIC in most non-Safari browsers).
 */
export async function loadImage(file: File): Promise<LoadedImage> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `That file is ${formatBytes(file.size)} — the maximum supported size is ${formatBytes(MAX_FILE_BYTES)}.`,
    );
  }

  let source: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === "function") {
    try {
      source = await createImageBitmap(file);
    } catch {
      source = await decodeViaImageElement(file);
    }
  } else {
    source = await decodeViaImageElement(file);
  }

  const { width, height } = dimensionsOf(source);
  if (!width || !height) {
    releaseImage({ source, width, height });
    throw new Error(UNSUPPORTED_TYPE_MESSAGE);
  }
  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    releaseImage({ source, width, height });
    throw new Error(
      `That image is ${width}×${height}px — the largest supported side is ${MAX_DIMENSION_PX.toLocaleString("en-GB")}px.`,
    );
  }
  return { source, width, height };
}

export interface ProcessOptions {
  width: number;
  height: number;
  format: OutputFormat;
  /** 0–1. Ignored for PNG (always lossless). */
  quality: number;
}

function drawTo(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  format: OutputFormat,
): void {
  if (format === "image/jpeg") {
    // JPEG has no alpha channel — flatten transparency onto white, not black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
}

function ensureFormat(blob: Blob, format: OutputFormat): Blob {
  // Some browsers silently fall back to PNG for formats they can't encode.
  if (blob.type && blob.type !== format) {
    throw new Error(
      "Your browser can't save that format — try JPG or PNG instead.",
    );
  }
  return blob;
}

/** Resize/re-encode a decoded image on a canvas. Browser only. */
export async function processImage(
  source: ImageBitmap | HTMLImageElement,
  opts: ProcessOptions,
): Promise<Blob> {
  const width = Math.max(1, Math.round(opts.width));
  const height = Math.max(1, Math.round(opts.height));
  const quality = Math.min(1, Math.max(0.01, opts.quality));
  const useQuality = opts.format !== "image/png";

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      drawTo(ctx, source, width, height, opts.format);
      const blob = await canvas.convertToBlob(
        useQuality ? { type: opts.format, quality } : { type: opts.format },
      );
      return ensureFormat(blob, opts.format);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Your browser couldn't create an image canvas — try a different browser.",
    );
  }
  drawTo(ctx, source, width, height, opts.format);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, opts.format, useQuality ? quality : undefined),
  );
  if (!blob) {
    throw new Error(
      "Your browser can't save that format — try JPG or PNG instead.",
    );
  }
  return ensureFormat(blob, opts.format);
}

export interface CompressToTargetResult {
  blob: Blob;
  /** The quality (0–1) that produced the returned blob. */
  quality: number;
  /** True when the returned blob met the requested byte budget. */
  withinTarget: boolean;
}

/**
 * Binary-search JPEG/WebP quality (8 iterations) for the largest output that
 * fits within `targetBytes`. If even the lowest quality is too big, returns
 * the smallest achievable with `withinTarget: false`. PNG is lossless, so a
 * single pass is made and the flag reports whether it happened to fit.
 */
export async function compressToTarget(
  source: ImageBitmap | HTMLImageElement,
  opts: Omit<ProcessOptions, "quality">,
  targetBytes: number,
): Promise<CompressToTargetResult> {
  if (opts.format === "image/png") {
    const blob = await processImage(source, { ...opts, quality: 1 });
    return { blob, quality: 1, withinTarget: blob.size <= targetBytes };
  }

  let lo = 0.05;
  let hi = 0.95;
  let bestUnder: { blob: Blob; quality: number } | null = null;
  let smallest: { blob: Blob; quality: number } | null = null;

  for (let i = 0; i < 8; i += 1) {
    const quality = (lo + hi) / 2;
    const blob = await processImage(source, { ...opts, quality });
    if (smallest === null || blob.size < smallest.blob.size) {
      smallest = { blob, quality };
    }
    if (blob.size <= targetBytes) {
      if (bestUnder === null || blob.size > bestUnder.blob.size) {
        bestUnder = { blob, quality };
      }
      lo = quality;
    } else {
      hi = quality;
    }
  }

  if (bestUnder !== null) {
    return { blob: bestUnder.blob, quality: bestUnder.quality, withinTarget: true };
  }
  // smallest is always set after 8 iterations.
  const fallback = smallest as { blob: Blob; quality: number };
  return { blob: fallback.blob, quality: fallback.quality, withinTarget: false };
}
