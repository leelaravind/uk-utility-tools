import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import {
  extractPages,
  formatFileSize,
  loadPdfMeta,
  mergePdfs,
  removePages,
  reorderPages,
} from "./pdfUtils";

/**
 * Build a real PDF whose pages have distinct widths so we can identify
 * pages by width after each operation (page heights are all 400).
 */
async function makePdf(widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const width of widths) {
    doc.addPage([width, 400]);
  }
  return doc.save();
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}

describe("loadPdfMeta", () => {
  it("reads the page count of a valid PDF", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const meta = await loadPdfMeta(pdf);
    expect(meta).toEqual({
      ok: true,
      value: { pageCount: 3, encrypted: false },
    });
  });

  it("rejects bytes that are not a PDF with a friendly message", async () => {
    const result = await loadPdfMeta(new TextEncoder().encode("not a pdf at all"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("couldn't be read");
    }
  });

  it("rejects an empty file", async () => {
    const result = await loadPdfMeta(new Uint8Array(0));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("empty");
    }
  });
});

describe("mergePdfs", () => {
  it("merges files preserving order (round-trip)", async () => {
    const a = await makePdf([100, 200]);
    const b = await makePdf([300]);
    const result = await mergePdfs([a, b]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(await pageWidths(result.value)).toEqual([100, 200, 300]);
    }
  });

  it("respects the order the files are given in", async () => {
    const a = await makePdf([100]);
    const b = await makePdf([300]);
    const result = await mergePdfs([b, a]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(await pageWidths(result.value)).toEqual([300, 100]);
    }
  });

  it("rejects an empty file list", async () => {
    const result = await mergePdfs([]);
    expect(result.ok).toBe(false);
  });

  it("surfaces a friendly error when one input is corrupt", async () => {
    const a = await makePdf([100]);
    const result = await mergePdfs([a, new TextEncoder().encode("junk")]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("couldn't be read");
    }
  });
});

describe("extractPages", () => {
  it("extracts pages in the requested order", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const result = await extractPages(pdf, [3, 1]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(await pageWidths(result.value)).toEqual([300, 100]);
    }
  });

  it("rejects out-of-range pages", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const result = await extractPages(pdf, [4]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Page 4");
    }
  });

  it("rejects an empty page selection", async () => {
    const pdf = await makePdf([100]);
    const result = await extractPages(pdf, []);
    expect(result.ok).toBe(false);
  });
});

describe("removePages", () => {
  it("removes the given pages and keeps document order", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const result = await removePages(pdf, [2]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(await pageWidths(result.value)).toEqual([100, 300]);
    }
  });

  it("refuses to remove every page", async () => {
    const pdf = await makePdf([100, 200]);
    const result = await removePages(pdf, [1, 2]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("at least one page");
    }
  });

  it("rejects out-of-range pages", async () => {
    const pdf = await makePdf([100, 200]);
    const result = await removePages(pdf, [5]);
    expect(result.ok).toBe(false);
  });
});

describe("reorderPages", () => {
  it("reorders pages (round-trip)", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const result = await reorderPages(pdf, [3, 1, 2]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(await pageWidths(result.value)).toEqual([300, 100, 200]);
    }
  });

  it("rejects an order that misses a page", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const result = await reorderPages(pdf, [1, 2]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("every page exactly once");
    }
  });

  it("rejects an order with duplicates", async () => {
    const pdf = await makePdf([100, 200, 300]);
    const result = await reorderPages(pdf, [1, 1, 2]);
    expect(result.ok).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes with one decimal under 10", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats whole kilobytes at 10 and above", () => {
    expect(formatFileSize(150 * 1024)).toBe("150 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });

  it("handles invalid input", () => {
    expect(formatFileSize(-5)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
  });
});
