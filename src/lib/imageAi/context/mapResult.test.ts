import { describe, expect, it } from "vitest";

import { mapTesseractPage, type TesseractPageLike } from "./ocr/mapResult";

const page: TesseractPageLike = {
  text: "Connection failed\nRetry\n",
  confidence: 91.4,
  blocks: [
    {
      text: "Connection failed Retry",
      confidence: 91,
      bbox: { x0: 0, y0: 0, x1: 800, y1: 200 },
      paragraphs: [
        {
          text: "Connection failed Retry",
          confidence: 91,
          bbox: { x0: 0, y0: 0, x1: 800, y1: 200 },
          lines: [
            {
              text: "Connection failed",
              confidence: 94.2,
              bbox: { x0: 96, y0: 40, x1: 344, y1: 76 },
            },
            {
              text: "Retry",
              confidence: 88,
              bbox: { x0: 576, y0: 120, x1: 640, y1: 156 },
            },
          ],
        },
      ],
    },
  ],
};

describe("mapTesseractPage", () => {
  it("maps lines to blocks with normalised boxes", () => {
    const result = mapTesseractPage(page, 800, 400);
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]).toMatchObject({
      id: "ocr-1",
      text: "Connection failed",
      confidence: 0.94,
      bbox: { x: 0.12, y: 0.1, width: 0.31, height: 0.09 },
    });
  });

  it("converts the engine's 0-100 confidence to 0-1", () => {
    const result = mapTesseractPage(page, 800, 400);
    expect(result.meanConfidence).toBe(0.91);
    expect(result.blocks[1].confidence).toBe(0.88);
  });

  it("returns the recognised text unchanged apart from trimming", () => {
    expect(mapTesseractPage(page, 800, 400).fullText).toBe(
      "Connection failed\nRetry",
    );
  });

  it("falls back to paragraph text when a block has no lines", () => {
    const result = mapTesseractPage(
      {
        text: "Heading",
        blocks: [
          {
            text: "Heading",
            confidence: 80,
            bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
            paragraphs: [
              {
                text: "Heading",
                confidence: 80,
                bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
              },
            ],
          },
        ],
      },
      200,
      100,
    );
    expect(result.blocks.map((b) => b.text)).toEqual(["Heading"]);
  });

  it("falls back to plain text when the engine returns no geometry", () => {
    // A library upgrade that stops populating `blocks` degrades to text
    // without boxes rather than to no OCR at all.
    const result = mapTesseractPage(
      { text: "line one\nline two", blocks: null },
      800,
      400,
    );
    expect(result.blocks.map((b) => b.text)).toEqual(["line one", "line two"]);
    expect(result.blocks[0].bbox).toBeUndefined();
  });

  it("reads a page that exposes lines directly", () => {
    const result = mapTesseractPage(
      {
        text: "Alpha",
        lines: [
          { text: "Alpha", confidence: 70, bbox: { x0: 0, y0: 0, x1: 80, y1: 40 } },
        ],
      },
      800,
      400,
    );
    expect(result.blocks[0].text).toBe("Alpha");
    expect(result.blocks[0].confidence).toBe(0.7);
  });

  it("drops empty lines but keeps everything readable", () => {
    const result = mapTesseractPage(
      {
        text: "Alpha",
        lines: [
          { text: "   ", confidence: 10 },
          { text: "Alpha", confidence: 90 },
        ],
      },
      800,
      400,
    );
    expect(result.blocks).toHaveLength(1);
  });

  it("survives an empty page", () => {
    const result = mapTesseractPage({}, 800, 400);
    expect(result.blocks).toEqual([]);
    expect(result.fullText).toBe("");
  });

  it("strips control characters from recognised text", () => {
    const result = mapTesseractPage(
      {
        text: "a\u0000b",
        lines: [{ text: "a\u0000b", confidence: 90 }],
      },
      800,
      400,
    );
    expect(result.blocks[0].text).toBe("ab");
  });

  it("does not invent a confidence the engine did not report", () => {
    const result = mapTesseractPage(
      { text: "Alpha", lines: [{ text: "Alpha" }] },
      800,
      400,
    );
    expect(result.blocks[0].confidence).toBeUndefined();
    expect(result.meanConfidence).toBeUndefined();
  });
});
