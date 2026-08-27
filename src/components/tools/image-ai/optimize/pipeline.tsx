/**
 * Browser-only image work for the Optimize Image panel.
 *
 * Everything runs on the visitor's device: `createImageBitmap` decodes and
 * rescales (which browsers do off the main thread, so a 12 MP photo does not
 * freeze the page), then the shared `processImage` encoder from the Image
 * Compressor writes the blob. There is deliberately no second resize engine
 * here — this module only composes the existing one with a crop rectangle.
 *
 * No network calls of any kind. Nothing leaves the page.
 */

import {
  ImageToolError,
  processImage,
  type LoadedImage,
  type OutputFormat,
} from "@/lib/files/imageProcessing";
import {
  applyCrop,
  samplerFromRgba,
  type NormalisedRect,
  type PixelRect,
  type PixelSampler,
} from "@/lib/imageAi/crop";

export interface RenderRequest {
  loaded: LoadedImage;
  /** Crop applied before the resize. */
  crop: NormalisedRect;
  width: number;
  height: number;
  format: OutputFormat;
  /** 0-1. Ignored for PNG. */
  quality: number;
  /** Crisp edges matter more than smooth gradients (text, UI, diagrams). */
  preferSharpDownscale: boolean;
}

const ENCODE_FAILED =
  "Your browser couldn't save that format — try JPG or PNG instead.";

function isFullFrame(rect: PixelRect, width: number, height: number): boolean {
  return (
    rect.x === 0 &&
    rect.y === 0 &&
    rect.width === width &&
    rect.height === height
  );
}

function paint(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  source: CanvasImageSource,
  rect: PixelRect,
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
  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    width,
    height,
  );
}

function verifyFormat(blob: Blob, format: OutputFormat): Blob {
  // Some browsers quietly fall back to PNG for formats they cannot encode.
  if (blob.type && blob.type !== format) throw new ImageToolError(ENCODE_FAILED);
  return blob;
}

/** Crop and resize in one canvas pass — the fallback path. */
async function encodeViaCanvas(req: RenderRequest, rect: PixelRect): Promise<Blob> {
  const { width, height, format, quality } = req;
  const useQuality = format !== "image/png";
  const source = req.loaded.source as CanvasImageSource;

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      paint(ctx, source, rect, width, height, format);
      const blob = await canvas.convertToBlob(
        useQuality ? { type: format, quality } : { type: format },
      );
      return verifyFormat(blob, format);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageToolError(
      "Your browser couldn't create an image canvas — try a different browser.",
    );
  }
  paint(ctx, source, rect, width, height, format);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, format, useQuality ? quality : undefined),
  );
  if (!blob) throw new ImageToolError(ENCODE_FAILED);
  return verifyFormat(blob, format);
}

/**
 * Produce the optimised image: crop, resize, encode.
 *
 * Preferred path hands both the crop rectangle and the target size to
 * `createImageBitmap`, which does the expensive resampling outside the main
 * thread; the shared encoder then just writes the already-correct bitmap.
 */
export async function renderOptimised(req: RenderRequest): Promise<Blob> {
  const { loaded } = req;
  const rect = applyCrop(req.crop, loaded.width, loaded.height);
  const fullFrame = isFullFrame(rect, loaded.width, loaded.height);

  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(
        loaded.source,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        {
          resizeWidth: req.width,
          resizeHeight: req.height,
          resizeQuality: req.preferSharpDownscale ? "high" : "medium",
        },
      );
    } catch {
      bitmap = null;
    }
    if (bitmap) {
      try {
        return await processImage(bitmap, {
          width: req.width,
          height: req.height,
          format: req.format,
          quality: req.quality,
        });
      } finally {
        bitmap.close();
      }
    }
  }

  if (fullFrame) {
    return processImage(loaded.source, {
      width: req.width,
      height: req.height,
      format: req.format,
      quality: req.quality,
    });
  }
  return encodeViaCanvas(req, rect);
}

/* ------------------------------------------------------------------ *
 * Sampling for blank-margin detection                                 *
 * ------------------------------------------------------------------ */

/**
 * Margins are detected on a downscaled copy: it is far cheaper, and the
 * smoothing spreads thin content across neighbouring pixels, which makes a
 * hairline more likely to be noticed rather than less.
 */
export const MARGIN_SAMPLE_MAX_EDGE = 512;

export interface MarginSample {
  sampler: PixelSampler;
  width: number;
  height: number;
}

/** Read a small RGBA copy of the image for margin detection, or null. */
export async function sampleForMargins(
  loaded: LoadedImage,
): Promise<MarginSample | null> {
  const scale = Math.min(
    1,
    MARGIN_SAMPLE_MAX_EDGE / Math.max(loaded.width, loaded.height),
  );
  const width = Math.max(1, Math.round(loaded.width * scale));
  const height = Math.max(1, Math.round(loaded.height * scale));
  const source = loaded.source as CanvasImageSource;

  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(source, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);
        return { sampler: samplerFromRgba(data, width, height), width, height };
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    return { sampler: samplerFromRgba(data, width, height), width, height };
  } catch {
    // A tainted or oversized canvas simply means no suggestion is offered.
    return null;
  }
}
