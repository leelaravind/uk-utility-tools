/**
 * Currency-neutrality guarantees for the calculators.
 *
 * The promise the site makes to visitors is narrow and worth testing
 * directly: choosing GBP, USD or EUR changes the SYMBOL in front of a
 * number and nothing else. No exchange rate is applied, no figure is
 * converted, and the underlying maths never sees a currency at all.
 *
 * So each block below runs a calculator ONCE, then formats that single
 * result under all three currencies and asserts the digits are byte-for-byte
 * identical. If anyone ever threads a currency into the calc layer, or
 * reaches for `Intl`'s currency style (which renders USD as "US$1,234.56"
 * under en-GB), these tests fail.
 *
 * `src/lib/currency.test.ts` covers the formatter's own behaviour; this file
 * covers the calculators' relationship to it.
 */

import { describe, expect, it } from "vitest";

import { getTaxYear } from "@/config/ukTax";
import { simulatePayoff } from "@/lib/calc/creditCard";
import {
  calculateIrregularHoliday,
  calculateRegularHoliday,
} from "@/lib/calc/holidayPay";
import { calculateOvertime } from "@/lib/calc/overtime";
import { computeSelfEmployed } from "@/lib/calc/selfEmployed";
import { calculateShiftPay } from "@/lib/calc/shiftPay";
import {
  CURRENCIES,
  CURRENCY_CODES,
  currencySymbol,
  formatCurrency,
  formatCurrencyFromMinor,
  type SupportedCurrency,
} from "./currency";

/** Everything after the currency symbol, i.e. the digits and separators. */
function digitsOf(formatted: string, currency: SupportedCurrency): string {
  const symbol = currencySymbol(currency);
  const index = formatted.indexOf(symbol);
  expect(index, `"${formatted}" should contain "${symbol}"`).toBeGreaterThan(
    -1,
  );
  return formatted.slice(index + symbol.length);
}

/**
 * Assert that one numeric result renders identically in every currency apart
 * from its leading symbol. Returns the shared digit string so callers can
 * additionally pin the exact expected value.
 */
function expectOnlySymbolDiffers(
  format: (currency: SupportedCurrency) => string,
): string {
  const rendered = CURRENCY_CODES.map((code) => ({
    code,
    text: format(code),
    digits: digitsOf(format(code), code),
  }));

  const [first, ...rest] = rendered;
  for (const other of rest) {
    // Same digits, grouping and decimals…
    expect(other.digits).toBe(first.digits);
    // …but a genuinely different string, because the symbol changed.
    expect(other.text).not.toBe(first.text);
    expect(other.text).toBe(`${CURRENCIES[other.code].symbol}${other.digits}`);
  }

  for (const { text } of rendered) {
    expect(text).not.toContain("US$");
  }

  return first.digits;
}

/* ------------------------------------------------------------------ */
/* The formatter contract these tools rely on                          */
/* ------------------------------------------------------------------ */

describe("formatCurrency — the exact shapes the tools display", () => {
  it("renders 1000 as £1,000.00 / $1,000.00 / €1,000.00", () => {
    expect(formatCurrency(1000, "GBP")).toBe("£1,000.00");
    expect(formatCurrency(1000, "USD")).toBe("$1,000.00");
    expect(formatCurrency(1000, "EUR")).toBe("€1,000.00");
  });

  it("never emits the ICU 'US$' prefix for dollars", () => {
    const samples = [0, 1, 12.5, 1000, 1234.56, 1_000_000, -99.99];
    for (const amount of samples) {
      for (const code of CURRENCY_CODES) {
        expect(formatCurrency(amount, code)).not.toContain("US$");
        expect(formatCurrencyFromMinor(amount * 100, code)).not.toContain(
          "US$",
        );
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Shift pay                                                           */
/* ------------------------------------------------------------------ */

describe("shift pay is currency-neutral", () => {
  // The site's documented worked example: 22:00–06:00, 30-minute unpaid
  // break, 12.50 an hour, 2.00 an hour night premium → 108.75 gross.
  const result = calculateShiftPay({
    start: "22:00",
    end: "06:00",
    overnight: true,
    breakMinutes: "30",
    hourlyRate: "12.50",
    nightPremium: true,
    nightRate: "2",
    nightStart: "22:00",
    nightEnd: "06:00",
    weekendShift: false,
    weekendRate: "0",
    overtime: false,
    overtimeThresholdHours: "8",
    overtimeMultiplier: "1.5",
  });

  it("calculates once, with no currency involved", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalPence).toBe(10875);
    expect(result.basePayPence).toBe(9375);
    expect(result.nightPremiumPence).toBe(1500);
  });

  it("shows the same total in every currency, symbol aside", () => {
    if (!result.ok) return;
    const digits = expectOnlySymbolDiffers((c) =>
      formatCurrencyFromMinor(result.totalPence, c),
    );
    expect(digits).toBe("108.75");
    expect(formatCurrencyFromMinor(result.totalPence, "USD")).toBe("$108.75");
  });

  it("holds for every line of the breakdown, not just the total", () => {
    if (!result.ok) return;
    const lines = [
      result.basePayPence,
      result.nightPremiumPence,
      result.totalPence,
    ];
    for (const pence of lines) {
      expectOnlySymbolDiffers((c) => formatCurrencyFromMinor(pence, c));
    }
  });
});

/* ------------------------------------------------------------------ */
/* Overtime                                                            */
/* ------------------------------------------------------------------ */

describe("overtime pay is currency-neutral", () => {
  // 15.00/hour, 37.5 standard hours, 42.5 worked, time and a half.
  const result = calculateOvertime({
    hourlyRate: "15",
    standardWeeklyHours: "37.5",
    actualHours: "42.5",
    mode: "multiplier",
    multiplier: "1.5",
    overtimeRate: "",
  });

  it("calculates once, with no currency involved", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalPayPence).toBe(56250);
    expect(result.overtimePayPence).toBe(11250);
    expect(result.totalPence).toBe(67500);
  });

  it("shows the same figures in every currency, symbol aside", () => {
    if (!result.ok) return;
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(result.normalPayPence, c),
      ),
    ).toBe("562.50");
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(result.overtimePayPence, c),
      ),
    ).toBe("112.50");
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(result.totalPence, c),
      ),
    ).toBe("675.00");
  });
});

/* ------------------------------------------------------------------ */
/* Credit card payoff                                                  */
/* ------------------------------------------------------------------ */

describe("credit card payoff is currency-neutral", () => {
  // 1,000 at 24% APR paying 100 a month — a fixed date keeps this stable.
  const result = simulatePayoff(
    { balance: 1000, aprPercent: 24, monthlyPayment: 100 },
    new Date(2026, 0, 15),
  );

  it("calculates once, with no currency involved", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.months).toBe(12);
    expect(result.totalInterestPence).toBe(12704);
    expect(result.totalPaidPence).toBe(112704);
  });

  it("shows the same totals in every currency, symbol aside", () => {
    if (!result.ok) return;
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(result.totalInterestPence, c),
      ),
    ).toBe("127.04");
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(result.totalPaidPence, c),
      ),
    ).toBe("1,127.04");
  });

  it("holds for every row of the amortisation schedule", () => {
    if (!result.ok) return;
    for (const row of result.schedule) {
      for (const pence of [
        row.paymentPence,
        row.interestPence,
        row.principalPence,
        row.balancePence,
      ]) {
        expectOnlySymbolDiffers((c) => formatCurrencyFromMinor(pence, c));
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Self-employed PROFIT (the half that travels)                        */
/* ------------------------------------------------------------------ */

describe("self-employed profit is currency-neutral", () => {
  const config = getTaxYear("2026-27")!;
  // Profit only: revenue − expenses is arithmetic, not tax.
  const result = computeSelfEmployed(config, {
    revenue: 3000,
    expenses: 500,
    period: "monthly",
    includeTax: false,
  });

  it("annualises without any currency involved", () => {
    expect(result.annualRevenue).toBe(36000);
    expect(result.annualExpenses).toBe(6000);
    expect(result.annualProfit).toBe(30000);
    expect(result.tax).toBeUndefined();
  });

  it("shows revenue, expenses and profit identically in every currency", () => {
    expect(
      expectOnlySymbolDiffers((c) => formatCurrency(result.annualRevenue, c)),
    ).toBe("36,000.00");
    expect(
      expectOnlySymbolDiffers((c) => formatCurrency(result.annualExpenses, c)),
    ).toBe("6,000.00");
    expect(
      expectOnlySymbolDiffers((c) => formatCurrency(result.annualProfit, c)),
    ).toBe("30,000.00");
  });

  it("renders a loss the same way in every currency", () => {
    const loss = computeSelfEmployed(config, {
      revenue: 1000,
      expenses: 2500,
      period: "annual",
      includeTax: false,
    });
    expect(loss.isLoss).toBe(true);
    expect(loss.annualProfit).toBe(-1500);
    expect(formatCurrency(loss.annualProfit, "GBP")).toBe("-£1,500.00");
    expect(formatCurrency(loss.annualProfit, "USD")).toBe("-$1,500.00");
    expect(formatCurrency(loss.annualProfit, "EUR")).toBe("-€1,500.00");
  });

  it("keeps the UK tax estimate in sterling, never re-badged", () => {
    // The component only computes tax when the display currency is GBP, and
    // formats those figures with an explicit "GBP" — this pins that shape.
    const taxed = computeSelfEmployed(config, {
      revenue: 3000,
      expenses: 500,
      period: "monthly",
      includeTax: true,
    });
    expect(taxed.tax).toBeDefined();
    if (!taxed.tax) return;
    for (const amount of [
      taxed.tax.personalAllowance,
      taxed.tax.incomeTax,
      taxed.tax.class4Ni,
      taxed.tax.postTaxProfit,
    ]) {
      const rendered = formatCurrency(amount, "GBP");
      expect(rendered.startsWith("£")).toBe(true);
      expect(rendered).not.toContain("$");
      expect(rendered).not.toContain("€");
      expect(rendered).not.toContain("US$");
    }
  });
});

/* ------------------------------------------------------------------ */
/* Holiday pay — UK rules, portable money                              */
/* ------------------------------------------------------------------ */

describe("holiday pay value is currency-neutral (the UK rules are not)", () => {
  const regular = calculateRegularHoliday({
    hourlyRate: "12",
    weeklyHours: "40",
    daysPerWeek: "5",
  });

  const irregular = calculateIrregularHoliday({
    grossPay: "1000",
    hoursWorked: "100",
  });

  it("applies the UK statutory rules regardless of display currency", () => {
    expect(regular.ok).toBe(true);
    if (!regular.ok) return;
    // 5.6 weeks × 5 days = 28 days, 8 hours a day → 224 hours. These are
    // UK statutory numbers and no currency choice can move them.
    expect(regular.entitlementDays).toBe(28);
    expect(regular.entitlementHours).toBe(224);
    expect(regular.entitlementPayPence).toBe(268800);
  });

  it("shows the entitlement's value identically in every currency", () => {
    if (!regular.ok) return;
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(regular.entitlementPayPence, c),
      ),
    ).toBe("2,688.00");
  });

  it("shows 12.07% accrued pay identically in every currency", () => {
    expect(irregular.ok).toBe(true);
    if (!irregular.ok) return;
    expect(irregular.accruedPayPence).toBe(12070);
    expect(irregular.accruedHoursRounded).toBe(12);
    expect(
      expectOnlySymbolDiffers((c) =>
        formatCurrencyFromMinor(irregular.accruedPayPence, c),
      ),
    ).toBe("120.70");
  });
});

/* ------------------------------------------------------------------ */
/* Belt and braces                                                     */
/* ------------------------------------------------------------------ */

describe("no formatted output anywhere contains 'US$'", () => {
  it("holds across a wide sweep of amounts and both entry points", () => {
    const majors = [0, 0.01, 0.5, 7, 99.995, 1000, 12345.678, -1234.56];
    for (const code of CURRENCY_CODES) {
      for (const amount of majors) {
        expect(formatCurrency(amount, code)).not.toContain("US$");
        expect(
          formatCurrency(amount, code, { trimWholeDecimals: true }),
        ).not.toContain("US$");
        expect(
          formatCurrency(amount, code, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }),
        ).not.toContain("US$");
        expect(formatCurrencyFromMinor(amount, code)).not.toContain("US$");
      }
    }
  });
});
