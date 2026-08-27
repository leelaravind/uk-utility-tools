import { describe, expect, it } from "vitest";

import {
  CURRENCIES,
  CURRENCY_CODES,
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  currencySymbol,
  formatCurrency,
  formatCurrencyFromMinor,
  isSupportedCurrency,
  type SupportedCurrency,
} from "./currency";

describe("currency metadata", () => {
  it("supports exactly GBP, USD and EUR, in that order", () => {
    expect(CURRENCY_CODES).toEqual(["GBP", "USD", "EUR"]);
  });

  it("defaults to GBP", () => {
    expect(DEFAULT_CURRENCY).toBe("GBP");
  });

  it("exposes a symbol and label for every supported code", () => {
    for (const code of CURRENCY_CODES) {
      expect(CURRENCIES[code].code).toBe(code);
      expect(CURRENCIES[code].symbol.length).toBeGreaterThan(0);
      expect(CURRENCIES[code].label).toContain(code);
    }
  });

  it("builds select options matching the code order", () => {
    expect(CURRENCY_OPTIONS.map((o) => o.value)).toEqual(CURRENCY_CODES);
    expect(CURRENCY_OPTIONS).toEqual([
      { value: "GBP", label: "GBP (£)" },
      { value: "USD", label: "USD ($)" },
      { value: "EUR", label: "EUR (€)" },
    ]);
  });

  it("maps codes to the expected symbols", () => {
    expect(currencySymbol("GBP")).toBe("£");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("EUR")).toBe("€");
  });
});

describe("isSupportedCurrency", () => {
  it("accepts the supported codes", () => {
    for (const code of CURRENCY_CODES) {
      expect(isSupportedCurrency(code)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const bad of ["gbp", "JPY", "", null, undefined, 3, {}]) {
      expect(isSupportedCurrency(bad)).toBe(false);
    }
  });
});

describe("formatCurrency", () => {
  it("formats 1000 with the plain symbol in every currency", () => {
    expect(formatCurrency(1000, "GBP")).toBe("£1,000.00");
    expect(formatCurrency(1000, "USD")).toBe("$1,000.00");
    expect(formatCurrency(1000, "EUR")).toBe("€1,000.00");
  });

  it("never renders the ICU 'US$' prefix for dollars", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    expect(formatCurrency(1234.56, "USD")).not.toContain("US$");
  });

  it("groups thousands and keeps two decimals by default", () => {
    expect(formatCurrency(1234567.891, "GBP")).toBe("£1,234,567.89");
    expect(formatCurrency(0, "GBP")).toBe("£0.00");
    expect(formatCurrency(0.5, "EUR")).toBe("€0.50");
  });

  it("puts the sign outside the symbol for negatives", () => {
    expect(formatCurrency(-12.34, "GBP")).toBe("-£12.34");
    expect(formatCurrency(-12.34, "USD")).toBe("-$12.34");
  });

  it("honours explicit fraction digits", () => {
    expect(
      formatCurrency(12.3456, "GBP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
    ).toBe("£12.3456");
    expect(
      formatCurrency(12, "GBP", { minimumFractionDigits: 0 }),
    ).toBe("£12");
  });

  it("can trim decimals on whole amounts", () => {
    expect(formatCurrency(1500, "GBP", { trimWholeDecimals: true })).toBe(
      "£1,500",
    );
    expect(formatCurrency(1500.5, "GBP", { trimWholeDecimals: true })).toBe(
      "£1,500.50",
    );
  });

  it("falls back to GBP and zero for unusable input", () => {
    expect(formatCurrency(Number.NaN, "GBP")).toBe("£0.00");
    expect(formatCurrency(Number.POSITIVE_INFINITY, "USD")).toBe("$0.00");
    expect(formatCurrency(5, undefined)).toBe("£5.00");
  });
});

describe("formatCurrencyFromMinor", () => {
  it("converts minor units before formatting", () => {
    expect(formatCurrencyFromMinor(123456, "GBP")).toBe("£1,234.56");
    expect(formatCurrencyFromMinor(123456, "USD")).toBe("$1,234.56");
    expect(formatCurrencyFromMinor(123456, "EUR")).toBe("€1,234.56");
    expect(formatCurrencyFromMinor(1, "GBP")).toBe("£0.01");
    expect(formatCurrencyFromMinor(0, "GBP")).toBe("£0.00");
  });
});

describe("currency neutrality", () => {
  it("changes only the symbol, never the digits", () => {
    const amounts = [0, 1, 99.99, 1000, 1234567.89];
    for (const amount of amounts) {
      const rendered = CURRENCY_CODES.map((c: SupportedCurrency) =>
        formatCurrency(amount, c),
      );
      const digitsOnly = rendered.map((r) => r.replace(/^[-]?[£$€]/, ""));
      expect(new Set(digitsOnly).size).toBe(1);
    }
  });
});
