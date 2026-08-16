/**
 * Local PDF operations built on pdf-lib.
 *
 * Everything runs on-device (browser or Node) — nothing is uploaded.
 * pdf-lib is pulled in with a dynamic import() so it never lands in the
 * initial page bundle; it only loads when a PDF operation actually runs.
 *
 * All operations return result objects with human-readable messages —
 * they never throw at the caller.
 */

import type { PDFDocument as PDFDocumentType } from "pdf-lib";

export type PdfSource = Blob | Uint8Array | ArrayBuffer;

export type PdfResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export interface PdfMeta {
  pageCount: number;
  /** True when the file declared encryption and was opened best-effort. */
  encrypted: boolean;
}

/** Total input size guard: 200 MB. */
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
/** Page-count guard per output document. */
export const MAX_PAGES = 2000;

const CORRUPT_MESSAGE =
  "This file couldn't be read as a PDF — it may be corrupt, or not actually a PDF.";
const LOCKED_MESSAGE =
  "This PDF is password-protected and couldn't be opened. Remove the password first, then try again.";
const PROCESS_MESSAGE =
  "Something went wrong while processing this PDF — it may use features this tool can't handle (for example password protection).";

/** Human-readable file size, e.g. "1.4 MB". Pure and deterministic. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function sourceByteLength(source: PdfSource): number {
  if (source instanceof Uint8Array) return source.byteLength;
  if (source instanceof ArrayBuffer) return source.byteLength;
  return source.size;
}

async function toBytes(source: PdfSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(await source.arrayBuffer());
}

async function getPdfLib() {
  const { PDFDocument } = await import("pdf-lib");
  return { PDFDocument };
}

interface LoadedDoc {
  doc: PDFDocumentType;
  encrypted: boolean;
}

async function loadDocument(source: PdfSource): Promise<PdfResult<LoadedDoc>> {
  let bytes: Uint8Array;
  try {
    bytes = await toBytes(source);
  } catch {
    return { ok: false, message: CORRUPT_MESSAGE };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, message: "This file is empty — choose a PDF file." };
  }

  const { PDFDocument } = await getPdfLib();
  try {
    const doc = await PDFDocument.load(bytes);
    return { ok: true, value: { doc, encrypted: false } };
  } catch {
    // Retry best-effort for encrypted files (pdf-lib refuses them by default).
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      return { ok: true, value: { doc, encrypted: true } };
    } catch {
      return { ok: false, message: CORRUPT_MESSAGE };
    }
  }
}

function checkTotalSize(sources: PdfSource[]): PdfResult<null> {
  const total = sources.reduce((sum, s) => sum + sourceByteLength(s), 0);
  if (total > MAX_TOTAL_BYTES) {
    return {
      ok: false,
      message: `The selected files add up to ${formatFileSize(total)} — the limit for local processing is ${formatFileSize(MAX_TOTAL_BYTES)}.`,
    };
  }
  return { ok: true, value: null };
}

function checkPageCount(pageCount: number): PdfResult<null> {
  if (pageCount > MAX_PAGES) {
    return {
      ok: false,
      message: `That would be ${pageCount.toLocaleString("en-GB")} pages — the limit for this tool is ${MAX_PAGES.toLocaleString("en-GB")} pages.`,
    };
  }
  return { ok: true, value: null };
}

function validatePages(pages: number[], pageCount: number): PdfResult<null> {
  if (pages.length === 0) {
    return { ok: false, message: "Select at least one page." };
  }
  for (const p of pages) {
    if (!Number.isInteger(p) || p < 1 || p > pageCount) {
      return {
        ok: false,
        message: `Page ${p} doesn't exist — this PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
      };
    }
  }
  return { ok: true, value: null };
}

/**
 * Read basic metadata (page count) from a PDF without modifying it.
 * Encrypted files are opened best-effort and flagged.
 */
export async function loadPdfMeta(source: PdfSource): Promise<PdfResult<PdfMeta>> {
  const sizeCheck = checkTotalSize([source]);
  if (!sizeCheck.ok) return sizeCheck;

  const loaded = await loadDocument(source);
  if (!loaded.ok) return loaded;

  let pageCount: number;
  try {
    pageCount = loaded.value.doc.getPageCount();
  } catch {
    return { ok: false, message: LOCKED_MESSAGE };
  }

  const pagesCheck = checkPageCount(pageCount);
  if (!pagesCheck.ok) return pagesCheck;

  return { ok: true, value: { pageCount, encrypted: loaded.value.encrypted } };
}

/** Merge PDFs in the order given. Returns the merged file's bytes. */
export async function mergePdfs(sources: PdfSource[]): Promise<PdfResult<Uint8Array>> {
  if (sources.length === 0) {
    return { ok: false, message: "Add at least one PDF to merge." };
  }
  const sizeCheck = checkTotalSize(sources);
  if (!sizeCheck.ok) return sizeCheck;

  const { PDFDocument } = await getPdfLib();
  try {
    const output = await PDFDocument.create();
    let totalPages = 0;
    for (const source of sources) {
      const loaded = await loadDocument(source);
      if (!loaded.ok) return loaded;
      const src = loaded.value.doc;
      totalPages += src.getPageCount();
      const pagesCheck = checkPageCount(totalPages);
      if (!pagesCheck.ok) return pagesCheck;
      const copied = await output.copyPages(src, src.getPageIndices());
      for (const page of copied) output.addPage(page);
    }
    return { ok: true, value: await output.save() };
  } catch {
    return { ok: false, message: PROCESS_MESSAGE };
  }
}

/** Extract the given 1-based pages (in the given order) into a new PDF. */
export async function extractPages(
  source: PdfSource,
  pages: number[],
): Promise<PdfResult<Uint8Array>> {
  const sizeCheck = checkTotalSize([source]);
  if (!sizeCheck.ok) return sizeCheck;

  const loaded = await loadDocument(source);
  if (!loaded.ok) return loaded;
  const src = loaded.value.doc;

  const pagesCheck = validatePages(pages, src.getPageCount());
  if (!pagesCheck.ok) return pagesCheck;
  const countCheck = checkPageCount(pages.length);
  if (!countCheck.ok) return countCheck;

  const { PDFDocument } = await getPdfLib();
  try {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(src, pages.map((p) => p - 1));
    for (const page of copied) output.addPage(page);
    return { ok: true, value: await output.save() };
  } catch {
    return { ok: false, message: PROCESS_MESSAGE };
  }
}

/** Remove the given 1-based pages, keeping everything else in order. */
export async function removePages(
  source: PdfSource,
  pages: number[],
): Promise<PdfResult<Uint8Array>> {
  const sizeCheck = checkTotalSize([source]);
  if (!sizeCheck.ok) return sizeCheck;

  const loaded = await loadDocument(source);
  if (!loaded.ok) return loaded;
  const src = loaded.value.doc;
  const pageCount = src.getPageCount();

  const pagesCheck = validatePages(pages, pageCount);
  if (!pagesCheck.ok) return pagesCheck;

  const toRemove = new Set(pages);
  const kept: number[] = [];
  for (let p = 1; p <= pageCount; p += 1) {
    if (!toRemove.has(p)) kept.push(p);
  }
  if (kept.length === 0) {
    return {
      ok: false,
      message:
        "That would remove every page — at least one page must be left in the PDF.",
    };
  }

  const { PDFDocument } = await getPdfLib();
  try {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(src, kept.map((p) => p - 1));
    for (const page of copied) output.addPage(page);
    return { ok: true, value: await output.save() };
  } catch {
    return { ok: false, message: PROCESS_MESSAGE };
  }
}

/**
 * Rebuild the PDF with pages in `newOrder` (1-based). `newOrder` must be a
 * permutation of every page exactly once.
 */
export async function reorderPages(
  source: PdfSource,
  newOrder: number[],
): Promise<PdfResult<Uint8Array>> {
  const sizeCheck = checkTotalSize([source]);
  if (!sizeCheck.ok) return sizeCheck;

  const loaded = await loadDocument(source);
  if (!loaded.ok) return loaded;
  const src = loaded.value.doc;
  const pageCount = src.getPageCount();

  const pagesCheck = validatePages(newOrder, pageCount);
  if (!pagesCheck.ok) return pagesCheck;
  if (newOrder.length !== pageCount || new Set(newOrder).size !== pageCount) {
    return {
      ok: false,
      message:
        "The new order must include every page exactly once — reload the file and try again.",
    };
  }

  const { PDFDocument } = await getPdfLib();
  try {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(src, newOrder.map((p) => p - 1));
    for (const page of copied) output.addPage(page);
    return { ok: true, value: await output.save() };
  } catch {
    return { ok: false, message: PROCESS_MESSAGE };
  }
}
