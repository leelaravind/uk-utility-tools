import { describe, expect, it } from "vitest";

import {
  computeInvoiceTotals,
  draftToInvoice,
  formatInvoiceDate,
  formatMoney,
  formatUnitPrice,
  isEmptyDraftItem,
  isValidIsoDate,
  parseDecimal,
  validateInvoice,
  type InvoiceDraft,
  type InvoiceItem,
} from "./invoice";

const ITEMS: InvoiceItem[] = [
  { description: "Design work", quantity: 2, unitPrice: 10 },
  { description: "Hosting", quantity: 1, unitPrice: 5.5 },
];

function validDraft(overrides: Partial<InvoiceDraft> = {}): InvoiceDraft {
  return {
    fromName: "Jane Smith Design",
    fromAddress: "1 High Street\nLeeds",
    toName: "Acme Ltd",
    toAddress: "2 Market Square\nYork",
    invoiceNumber: "INV-001",
    issueDate: "2026-08-01",
    dueDate: "2026-08-31",
    currency: "GBP",
    items: [{ description: "Design work", quantity: "2", unitPrice: "10" }],
    taxRate: "",
    notes: "",
    ...overrides,
  };
}

describe("computeInvoiceTotals", () => {
  it("computes line totals and subtotal in pence", () => {
    const totals = computeInvoiceTotals(ITEMS);
    expect(totals.lineTotals).toEqual([2000, 550]);
    expect(totals.subtotal).toBe(2550);
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(2550);
  });

  it("applies 20% VAT on the subtotal", () => {
    const totals = computeInvoiceTotals(ITEMS, 20);
    // 20% of £25.50 = £5.10
    expect(totals.taxAmount).toBe(510);
    expect(totals.total).toBe(3060);
  });

  it("treats a 0 rate and an undefined rate the same", () => {
    expect(computeInvoiceTotals(ITEMS, 0).taxAmount).toBe(0);
    expect(computeInvoiceTotals(ITEMS, undefined).taxAmount).toBe(0);
    expect(computeInvoiceTotals(ITEMS).total).toBe(
      computeInvoiceTotals(ITEMS, 0).total,
    );
  });

  it("rounds each line half-up: 3 × £0.333 → £1.00", () => {
    const totals = computeInvoiceTotals([
      { description: "Widgets", quantity: 3, unitPrice: 0.333 },
    ]);
    // 3 × 0.333 = 0.999 → 99.9p → rounds to 100p
    expect(totals.lineTotals).toEqual([100]);
    expect(totals.subtotal).toBe(100);
  });

  it("rounds an exact half penny up (1 × £0.005 → 1p)", () => {
    const totals = computeInvoiceTotals([
      { description: "Half penny", quantity: 1, unitPrice: 0.005 },
    ]);
    expect(totals.lineTotals).toEqual([1]);
  });

  it("is not fooled by binary float artefacts (1 × £1.005 → 101p)", () => {
    // 1.005 * 100 === 100.49999999999999 in raw IEEE-754
    const totals = computeInvoiceTotals([
      { description: "Edge", quantity: 1, unitPrice: 1.005 },
    ]);
    expect(totals.lineTotals).toEqual([101]);
  });

  it("supports fractional quantities (1.5 hrs × £40 → £60)", () => {
    const totals = computeInvoiceTotals([
      { description: "Consulting", quantity: 1.5, unitPrice: 40 },
    ]);
    expect(totals.lineTotals).toEqual([6000]);
  });

  it("rounds tax half-up on odd subtotals (17.5% of £9.99)", () => {
    const totals = computeInvoiceTotals(
      [{ description: "Thing", quantity: 1, unitPrice: 9.99 }],
      17.5,
    );
    // 999 × 0.175 = 174.825 → 175p
    expect(totals.taxAmount).toBe(175);
    expect(totals.total).toBe(1174);
  });

  it("recomputes when lines are added, edited and removed", () => {
    const base = [{ description: "A", quantity: 1, unitPrice: 100 }];
    expect(computeInvoiceTotals(base).subtotal).toBe(10000);

    const added = [...base, { description: "B", quantity: 2, unitPrice: 25 }];
    expect(computeInvoiceTotals(added).subtotal).toBe(15000);

    const edited = added.map((item, i) =>
      i === 1 ? { ...item, quantity: 4 } : item,
    );
    expect(computeInvoiceTotals(edited).subtotal).toBe(20000);

    const removed = edited.slice(0, 1);
    expect(computeInvoiceTotals(removed).subtotal).toBe(10000);
  });

  it("returns zeros for an empty item list", () => {
    const totals = computeInvoiceTotals([], 20);
    expect(totals).toEqual({
      lineTotals: [],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    });
  });
});

describe("formatMoney", () => {
  it("formats GBP", () => {
    expect(formatMoney(123456, "GBP")).toBe("£1,234.56");
  });

  it("formats EUR", () => {
    expect(formatMoney(123456, "EUR")).toBe("€1,234.56");
  });

  it("formats USD (en-GB uses the US$ prefix)", () => {
    expect(formatMoney(123456, "USD")).toBe("US$1,234.56");
  });

  it("formats zero and single-penny amounts", () => {
    expect(formatMoney(0, "GBP")).toBe("£0.00");
    expect(formatMoney(1, "GBP")).toBe("£0.01");
  });
});

describe("formatUnitPrice", () => {
  it("keeps sub-penny precision only when present", () => {
    expect(formatUnitPrice(0.333, "GBP")).toBe("£0.333");
    expect(formatUnitPrice(10.5, "GBP")).toBe("£10.50");
    expect(formatUnitPrice(1234, "EUR")).toBe("€1,234.00");
  });
});

describe("parseDecimal", () => {
  it("parses plain and comma-grouped numbers", () => {
    expect(parseDecimal("12")).toBe(12);
    expect(parseDecimal("1,234.5")).toBe(1234.5);
    expect(parseDecimal(" 0.5 ")).toBe(0.5);
    expect(parseDecimal("-3")).toBe(-3);
  });

  it("rejects non-numbers", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1.2.3")).toBeNull();
    expect(parseDecimal("£5")).toBeNull();
  });
});

describe("isValidIsoDate", () => {
  it("accepts real dates", () => {
    expect(isValidIsoDate("2026-08-16")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true); // leap year
  });

  it("rejects impossible or malformed dates", () => {
    expect(isValidIsoDate("2026-02-29")).toBe(false); // not a leap year
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-04-31")).toBe(false);
    expect(isValidIsoDate("16/08/2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });
});

describe("validateInvoice", () => {
  it("passes a complete draft", () => {
    const result = validateInvoice(validDraft());
    expect(result.ok).toBe(true);
  });

  it("requires both party names and an invoice number", () => {
    const result = validateInvoice(
      validDraft({ fromName: " ", toName: "", invoiceNumber: "" }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.fromName).toBeTruthy();
    expect(result.errors.toName).toBeTruthy();
    expect(result.errors.invoiceNumber).toBeTruthy();
  });

  it("rejects a due date before the issue date", () => {
    const result = validateInvoice(
      validDraft({ issueDate: "2026-08-31", dueDate: "2026-08-01" }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.dueDate).toContain("before the issue date");
  });

  it("flags bad quantities and prices per row", () => {
    const result = validateInvoice(
      validDraft({
        items: [
          { description: "OK", quantity: "0", unitPrice: "abc" },
          { description: "", quantity: "2", unitPrice: "5" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.itemErrors[0].quantity).toBeTruthy();
    expect(result.errors.itemErrors[0].unitPrice).toBeTruthy();
    expect(result.errors.itemErrors[1].description).toBeTruthy();
  });

  it("ignores completely empty rows when another row is usable", () => {
    const result = validateInvoice(
      validDraft({
        items: [
          { description: "Design", quantity: "1", unitPrice: "100" },
          { description: "", quantity: "", unitPrice: "" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("requires at least one usable line item", () => {
    const result = validateInvoice(
      validDraft({ items: [{ description: "", quantity: "", unitPrice: "" }] }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.items).toContain("at least one line item");
  });

  it("rejects a VAT rate outside 0–100 but allows empty", () => {
    expect(validateInvoice(validDraft({ taxRate: "150" })).ok).toBe(false);
    expect(validateInvoice(validDraft({ taxRate: "-5" })).ok).toBe(false);
    expect(validateInvoice(validDraft({ taxRate: "" })).ok).toBe(true);
    expect(validateInvoice(validDraft({ taxRate: "20" })).ok).toBe(true);
  });
});

describe("draftToInvoice", () => {
  it("parses numbers, drops empty rows and trims text", () => {
    const invoice = draftToInvoice(
      validDraft({
        items: [
          { description: "  Design ", quantity: "2", unitPrice: "10.50" },
          { description: "", quantity: "", unitPrice: "" },
        ],
        taxRate: "20",
        notes: "  Payment terms: 30 days  ",
      }),
    );
    expect(invoice.items).toEqual([
      { description: "Design", quantity: 2, unitPrice: 10.5 },
    ]);
    expect(invoice.taxRate).toBe(20);
    expect(invoice.notes).toBe("Payment terms: 30 days");
    expect(invoice.from.name).toBe("Jane Smith Design");
  });

  it("maps an empty tax rate to undefined", () => {
    expect(draftToInvoice(validDraft({ taxRate: "" })).taxRate).toBeUndefined();
  });
});

describe("isEmptyDraftItem", () => {
  it("detects untouched rows", () => {
    expect(
      isEmptyDraftItem({ description: " ", quantity: "", unitPrice: "" }),
    ).toBe(true);
    expect(
      isEmptyDraftItem({ description: "", quantity: "1", unitPrice: "" }),
    ).toBe(false);
  });
});

describe("formatInvoiceDate", () => {
  it("formats ISO dates in UK long form", () => {
    expect(formatInvoiceDate("2026-08-16")).toBe("16 August 2026");
    expect(formatInvoiceDate("2025-01-02")).toBe("2 January 2025");
  });

  it("falls back to the raw string for invalid input", () => {
    expect(formatInvoiceDate("not-a-date")).toBe("not-a-date");
  });
});
