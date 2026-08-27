/**
 * File validation for Image → AI Context.
 *
 * The file extension and the browser-reported MIME type are both attacker
 * controlled, so neither decides anything here. The first bytes of the file
 * do. A `.png` that is really a JPEG is accepted as a JPEG with a recorded
 * warning; a `.png` that is really a ZIP is rejected.
 *
 * Nothing in this module reads pixels or touches the network — it is byte
 * inspection and arithmetic, which is why it is fully unit tested.
 */

import { fitWithin } from "./geometry";
import type { AnalysisMode } from "./types";

/** Largest file we will accept (specification §2.3). */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Largest decoded edge we will accept, matching the site's image tools. */
export const MAX_DECODED_DIMENSION_PX = 12_000;

/**
 * Total decoded pixel cap. 12,000 x 12,000 would be 144 megapixels — 576 MB as
 * RGBA — which is a memory-exhaustion vector on a phone regardless of how
 * small the compressed file was. 50 MP (~200 MB RGBA) is the hard limit.
 */
export const MAX_DECODED_PIXELS = 50_000_000;

/** Above this we warn the visitor before starting work. */
export const LARGE_IMAGE_PIXELS = 12_000_000;

/** Longest edge of the bitmap actually analysed, per mode. */
export const INFERENCE_MAX_EDGE_PX: Record<AnalysisMode, number> = {
  fast: 1_024,
  balanced: 1_600,
  detailed: 2_048,
};

/** Longest edge of the tiny copy used for layout/entropy statistics. */
export const SIGNAL_MAX_EDGE_PX = 256;

/** Image types this tool accepts. */
export type SupportedMime = "image/png" | "image/jpeg" | "image/webp";

export const SUPPORTED_MIMES: readonly SupportedMime[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

/** Human labels for the accepted formats, used in UI copy and errors. */
export const SUPPORTED_FORMATS_LABEL = "PNG, JPEG or WebP";

/** Types we can recognise well enough to explain why they are not supported. */
export type DetectedFormat =
  | SupportedMime
  | "image/gif"
  | "image/bmp"
  | "image/tiff"
  | "image/avif"
  | "image/heic"
  | "image/svg+xml"
  | "application/pdf"
  | "unknown";

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[offset + i]);
  return out;
}

/**
 * Identify a file from its magic bytes. Returns "unknown" rather than
 * guessing — an unknown format is refused, never optimistically decoded.
 */
export function sniffFormat(bytes: Uint8Array): DetectedFormat {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (asciiAt(bytes, 0, 6) === "GIF87a" || asciiAt(bytes, 0, 6) === "GIF89a") {
    return "image/gif";
  }
  if (asciiAt(bytes, 0, 2) === "BM") return "image/bmp";
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return "image/tiff";
  }
  if (asciiAt(bytes, 4, 4) === "ftyp") {
    const brand = asciiAt(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand.startsWith("hei") || brand.startsWith("mif") || brand === "heic") {
      return "image/heic";
    }
  }
  if (asciiAt(bytes, 0, 5) === "%PDF-") return "application/pdf";
  // SVG is XML: look for an <svg root within the first bytes. It is refused,
  // but recognising it produces a far better error message than "unknown".
  const head = asciiAt(bytes, 0, Math.min(bytes.length, 300)).toLowerCase();
  if (head.includes("<svg")) return "image/svg+xml";
  return "unknown";
}

/** True when the sniffed format is one this tool can analyse. */
export function isSupportedFormat(
  format: DetectedFormat,
): format is SupportedMime {
  return (SUPPORTED_MIMES as readonly string[]).includes(format);
}

export type ValidationErrorCode =
  | "empty"
  | "too-large"
  | "unsupported-type"
  | "too-many-pixels"
  | "too-many-dimensions"
  | "undecodable";

export interface ValidationSuccess {
  ok: true;
  /** The format determined from the file's bytes, not its name or type. */
  mime: SupportedMime;
  sizeBytes: number;
  /** True when the browser-declared type disagreed with the bytes. */
  typeMismatch: boolean;
  /** Non-fatal notes for the visitor, in stable order. */
  warnings: string[];
}

export interface ValidationFailure {
  ok: false;
  code: ValidationErrorCode;
  /** A message safe to show verbatim. Never contains file content. */
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/** Just enough of a `File` to validate it, so tests need no DOM. */
export interface FileFacts {
  /** Browser-declared MIME type. Untrusted. */
  type?: string;
  size: number;
  /** The first bytes of the file. 32 bytes is enough for every signature. */
  header: Uint8Array;
}

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

const UNSUPPORTED_MESSAGES: Partial<Record<DetectedFormat, string>> = {
  "image/gif": `Animated GIFs are not supported yet — save a frame as ${SUPPORTED_FORMATS_LABEL} and try again.`,
  "image/bmp": `BMP is not supported — convert it to ${SUPPORTED_FORMATS_LABEL} and try again.`,
  "image/tiff": `TIFF is not supported — convert it to ${SUPPORTED_FORMATS_LABEL} and try again.`,
  "image/avif": `AVIF is not supported yet — convert it to ${SUPPORTED_FORMATS_LABEL} and try again.`,
  "image/heic": `iPhone HEIC images are not supported — export as JPEG and try again.`,
  "image/svg+xml": `SVG files are not supported — export the drawing as ${SUPPORTED_FORMATS_LABEL} and try again.`,
  "application/pdf": `PDFs are not supported by this tool — try the PDF tools instead, or export a page as ${SUPPORTED_FORMATS_LABEL}.`,
};

/**
 * Validate a chosen file from its size and leading bytes.
 *
 * The declared MIME type is recorded and compared, but the bytes always win:
 * a mismatch is a warning, never the basis for acceptance.
 */
export function validateImageFile(file: FileFacts): ValidationResult {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return {
      ok: false,
      code: "empty",
      message: "That file is empty — choose an image and try again.",
    };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      code: "too-large",
      message: `That file is ${formatMegabytes(file.size)} — the maximum supported size is ${formatMegabytes(MAX_INPUT_BYTES)}.`,
    };
  }

  const format = sniffFormat(file.header);
  if (!isSupportedFormat(format)) {
    return {
      ok: false,
      code: "unsupported-type",
      message:
        UNSUPPORTED_MESSAGES[format] ??
        `That file does not look like an image this tool can read. Supported formats are ${SUPPORTED_FORMATS_LABEL}.`,
    };
  }

  const declared = (file.type ?? "").toLowerCase().trim();
  // "image/jpg" is a common but incorrect spelling; treat it as image/jpeg.
  const normalizedDeclared = declared === "image/jpg" ? "image/jpeg" : declared;
  const typeMismatch = normalizedDeclared !== "" && normalizedDeclared !== format;

  const warnings: string[] = [];
  if (typeMismatch) {
    warnings.push(
      `The file says it is ${normalizedDeclared} but its contents are ${format}. It has been read as ${format}.`,
    );
  }

  return { ok: true, mime: format, sizeBytes: file.size, typeMismatch, warnings };
}

export interface DimensionCheck {
  ok: boolean;
  code?: ValidationErrorCode;
  message?: string;
  warnings: string[];
}

/**
 * Check decoded dimensions before any pixel work happens. Both the per-edge
 * limit and the total-pixel limit matter: 12,000 x 200 is fine, 8,000 x 8,000
 * is not.
 */
export function validateDimensions(
  width: number,
  height: number,
): DimensionCheck {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      ok: false,
      code: "undecodable",
      message: "That image could not be decoded — it may be damaged.",
      warnings: [],
    };
  }
  if (width > MAX_DECODED_DIMENSION_PX || height > MAX_DECODED_DIMENSION_PX) {
    return {
      ok: false,
      code: "too-many-dimensions",
      message: `That image is ${width}x${height}px — the largest supported side is ${MAX_DECODED_DIMENSION_PX.toLocaleString("en-GB")}px.`,
      warnings: [],
    };
  }
  const pixels = width * height;
  if (pixels > MAX_DECODED_PIXELS) {
    return {
      ok: false,
      code: "too-many-pixels",
      message: `That image is ${Math.round(pixels / 1_000_000)} megapixels — the maximum is ${Math.round(MAX_DECODED_PIXELS / 1_000_000)} megapixels.`,
      warnings: [],
    };
  }

  const warnings: string[] = [];
  if (pixels > LARGE_IMAGE_PIXELS) {
    warnings.push(
      `This is a large image (${Math.round(pixels / 1_000_000)} megapixels). Analysis may take longer and will run on a downscaled copy.`,
    );
  }
  return { ok: true, warnings };
}

/**
 * Work out the size of the downscaled copy used for analysis. The visitor's
 * original file is never modified and never re-encoded.
 */
export function inferenceDimensions(
  width: number,
  height: number,
  mode: AnalysisMode,
): { width: number; height: number; scale: number; downscaled: boolean } {
  const fitted = fitWithin(width, height, INFERENCE_MAX_EDGE_PX[mode]);
  return { ...fitted, downscaled: fitted.scale < 1 };
}
