import { describe, expect, it } from "vitest";

import { inferDiagramNotes, DIAGRAM_BASE_LIMITATIONS } from "./diagram";
import {
  inferDocumentStructure,
  looksLikeHeading,
  splitKeyValue,
  uncertainLines,
} from "./document";
import { INVOICE_BLOCKS, SCREENSHOT_BLOCKS, block, box } from "./fixtures";
import {
  classifyLine,
  findImportantLines,
  isProtected,
  looksLikeAction,
  protectedBlockIds,
} from "./important";
import { sortReadingOrder } from "./readingOrder";
import { describeUiElement, inferUiElements, significantUiElements } from "./ui";

const orderedScreenshot = sortReadingOrder(SCREENSHOT_BLOCKS);
const orderedInvoice = sortReadingOrder(INVOICE_BLOCKS);

describe("classifyLine", () => {
  it("recognises error text", () => {
    expect(classifyLine("Connection failed")).toBe("error");
    expect(classifyLine("Payment declined")).toBe("error");
    expect(classifyLine("We couldn't save your changes")).toBe("error");
  });

  it("recognises warnings", () => {
    expect(classifyLine("Warning: unsaved changes")).toBe("warning");
    expect(classifyLine("Are you sure?")).toBe("warning");
  });

  it("recognises URLs, money and dates", () => {
    expect(classifyLine("https://status.example.com")).toBe("url");
    expect(classifyLine("£240.00")).toBe("money");
    expect(classifyLine("04/03/2026")).toBe("date");
  });

  it("recognises identifier-shaped codes but not ordinary numbers", () => {
    expect(classifyLine("ERR-4021")).toBe("code");
    expect(classifyLine("HTTP 503")).toBe("code");
    expect(classifyLine("PAYMENT_REQUIRED")).toBe("code");
    expect(classifyLine("500 items in stock")).toBe("normal");
  });

  it("recognises button labels", () => {
    expect(classifyLine("Retry")).toBe("action");
    expect(classifyLine("Save changes")).toBe("action");
  });

  it("leaves prose alone", () => {
    expect(classifyLine("The quick brown fox jumps over the lazy dog")).toBe(
      "normal",
    );
  });
});

describe("looksLikeAction", () => {
  it("accepts short control labels and rejects sentences", () => {
    expect(looksLikeAction("Cancel")).toBe(true);
    expect(looksLikeAction("Try again")).toBe(true);
    expect(looksLikeAction("Cancel your subscription at any time")).toBe(false);
    expect(looksLikeAction("")).toBe(false);
  });
});

describe("isProtected", () => {
  it("protects evidence categories from token-saving compaction", () => {
    expect(isProtected("error")).toBe(true);
    expect(isProtected("warning")).toBe(true);
    expect(isProtected("code")).toBe(true);
    expect(isProtected("url")).toBe(true);
    expect(isProtected("money")).toBe(true);
    expect(isProtected("date")).toBe(true);
    expect(isProtected("normal")).toBe(false);
    expect(isProtected("action")).toBe(false);
  });
});

describe("findImportantLines", () => {
  it("surfaces only error and warning lines", () => {
    const lines = findImportantLines(orderedScreenshot);
    expect(lines.map((l) => l.text)).toEqual(["Connection failed"]);
    expect(lines[0].importance).toBe("error");
  });

  it("de-duplicates repeated errors", () => {
    const lines = findImportantLines([
      block("a", "Connection failed", box(0.1, 0.1, 0.2, 0.03)),
      block("b", "Connection failed", box(0.1, 0.5, 0.2, 0.03)),
    ]);
    expect(lines).toHaveLength(1);
  });
});

describe("protectedBlockIds", () => {
  it("collects every block that may not be dropped", () => {
    const ids = protectedBlockIds(orderedScreenshot);
    expect(ids.has("b2")).toBe(true); // "Connection failed"
    expect(ids.has("b6")).toBe(true); // the URL
    expect(ids.has("b1")).toBe(false); // "Settings"
  });
});

describe("inferUiElements", () => {
  it("identifies buttons, links and field labels in a screenshot", () => {
    const elements = inferUiElements(orderedScreenshot);
    const byText = new Map(elements.map((e) => [e.text, e.kind]));
    expect(byText.get("Retry")).toBe("button");
    expect(byText.get("Cancel")).toBe("button");
    expect(byText.get("https://status.example.com")).toBe("link");
    expect(byText.get("API endpoint:")).toBe("input");
  });

  it("attaches no fabricated confidence to hand-written heuristics", () => {
    for (const element of inferUiElements(orderedScreenshot)) {
      expect(element.confidence).toBeUndefined();
    }
  });

  it("preserves the exact recognised text", () => {
    const element = inferUiElements(orderedScreenshot).find(
      (e) => e.kind === "button",
    );
    expect(element?.text).toBe("Retry");
  });

  it("marks an oversized line as a heading", () => {
    const blocks = sortReadingOrder([
      block("h", "Dashboard", box(0.1, 0.05, 0.3, 0.09)),
      block("t1", "Some ordinary body copy here", box(0.1, 0.2, 0.5, 0.02)),
      block("t2", "More ordinary body copy", box(0.1, 0.25, 0.5, 0.02)),
    ]);
    const elements = inferUiElements(blocks);
    expect(elements.find((e) => e.text === "Dashboard")?.kind).toBe("heading");
  });

  it("detects a table from aligned columns", () => {
    const rows = [0.2, 0.25, 0.3, 0.35].flatMap((y, i) => [
      block(`l${i}`, `Row ${i}`, box(0.1, y, 0.15, 0.02)),
      block(`r${i}`, `${i * 10}`, box(0.6, y, 0.1, 0.02)),
    ]);
    const elements = inferUiElements(sortReadingOrder(rows));
    expect(elements.some((e) => e.kind === "table")).toBe(true);
  });

  it("respects the element cap", () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      block(`b${i}`, `line ${i}`, box(0.1, i * 0.004, 0.3, 0.003)),
    );
    expect(inferUiElements(sortReadingOrder(many), { maxElements: 10 }))
      .toHaveLength(10);
  });
});

describe("significantUiElements / describeUiElement", () => {
  it("drops plain text and describes the rest with a position", () => {
    const elements = significantUiElements(inferUiElements(orderedScreenshot));
    expect(elements.every((e) => e.kind !== "text")).toBe(true);
    const retry = elements.find((e) => e.text === "Retry");
    expect(retry && describeUiElement(retry)).toBe(
      'button "Retry" at center-right',
    );
  });
});

describe("splitKeyValue", () => {
  it("splits a labelled line", () => {
    expect(splitKeyValue("Invoice number: A1234")).toEqual([
      "Invoice number",
      "A1234",
    ]);
  });

  it("refuses a sentence that merely contains a colon", () => {
    expect(
      splitKeyValue(
        "Note that the following applies in every case: read carefully",
      ),
    ).toBeUndefined();
  });

  it("refuses a line with an empty half", () => {
    expect(splitKeyValue("Total:")).toBeUndefined();
  });
});

describe("looksLikeHeading", () => {
  it("accepts short all-caps lines and rejects prose", () => {
    expect(looksLikeHeading(block("a", "INVOICE"), 0)).toBe(true);
    expect(
      looksLikeHeading(
        block("b", "This is a long sentence of body copy that ends with a full stop."),
        0,
      ),
    ).toBe(false);
  });
});

describe("inferDocumentStructure", () => {
  it("recovers the title, sections and key/value pairs of an invoice", () => {
    const structure = inferDocumentStructure(orderedInvoice);
    expect(structure.title).toBe("INVOICE");
    expect(structure.keyValues).toEqual(
      expect.arrayContaining([
        ["Invoice number", "A1234"],
        ["Date", "04/03/2026"],
        ["Amount due", "£240.00"],
      ]),
    );
    expect(structure.sections?.some((s) => s.heading === "Billing details")).toBe(
      true,
    );
  });

  it("preserves exact values rather than reformatting them", () => {
    const structure = inferDocumentStructure(orderedInvoice);
    const amount = structure.keyValues?.find(([k]) => k === "Amount due");
    expect(amount?.[1]).toBe("£240.00");
  });

  it("invents nothing when there is no structure to find", () => {
    const structure = inferDocumentStructure([]);
    expect(structure.title).toBeUndefined();
    expect(structure.sections).toBeUndefined();
    expect(structure.keyValues).toBeUndefined();
  });
});

describe("uncertainLines", () => {
  it("reports low-confidence lines rather than correcting them", () => {
    const lines = uncertainLines([
      block("a", "clear", box(0, 0, 0.2, 0.02), 0.95),
      block("b", "smuddged", box(0, 0.1, 0.2, 0.02), 0.31),
    ]);
    expect(lines).toEqual(["smuddged"]);
  });
});

describe("inferDiagramNotes", () => {
  it("lists labels with coarse placements and states what is missing", () => {
    const notes = inferDiagramNotes(
      sortReadingOrder([
        block("a", "Start", box(0.05, 0.1, 0.1, 0.04)),
        block("b", "Finish", box(0.8, 0.8, 0.1, 0.04)),
      ]),
    );
    expect(notes.labels).toEqual(["Start", "Finish"]);
    expect(notes.placements[0]).toContain("top-left");
    for (const limitation of DIAGRAM_BASE_LIMITATIONS) {
      expect(notes.limitations).toContain(limitation);
    }
  });

  it("warns about tiny labels", () => {
    const notes = inferDiagramNotes([
      block("a", "tiny", box(0.05, 0.1, 0.05, 0.005)),
    ]);
    expect(notes.limitations.some((l) => l.includes("very small"))).toBe(true);
  });
});
