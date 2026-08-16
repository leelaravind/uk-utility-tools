import { describe, expect, it } from "vitest";

import {
  addMonthsIsoMonth,
  MAX_MONTHS,
  monthlyRateFromApr,
  requiredMonthlyPayment,
  simulatePayoff,
} from "./creditCard";

const TODAY = new Date(2026, 7, 16); // 16 Aug 2026

describe("monthlyRateFromApr", () => {
  it("APR / 12 approximation", () => {
    expect(monthlyRateFromApr(24)).toBeCloseTo(0.02, 12);
    expect(monthlyRateFromApr(0)).toBe(0);
  });
});

describe("addMonthsIsoMonth", () => {
  it("adds calendar months, rolling over year ends", () => {
    expect(addMonthsIsoMonth(TODAY, 12)).toBe("2027-08");
    expect(addMonthsIsoMonth(TODAY, 5)).toBe("2027-01");
    expect(addMonthsIsoMonth(new Date(2026, 11, 1), 1)).toBe("2027-01");
    expect(addMonthsIsoMonth(new Date(2026, 0, 15), 0)).toBe("2026-01");
  });
});

describe("simulatePayoff — zero interest", () => {
  it("£1,200 at 0% with £100/month → exactly 12 months, no interest", () => {
    const r = simulatePayoff(
      { balance: 1200, aprPercent: 0, monthlyPayment: 100 },
      TODAY,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.months).toBe(12);
    expect(r.totalInterestPence).toBe(0);
    expect(r.totalPaidPence).toBe(120000);
    expect(r.finalPaymentPence).toBe(10000);
    expect(r.payoffMonth).toBe("2027-08");
  });

  it("£1,000 at 0% with £300/month → 4 months, £100 final payment", () => {
    const r = simulatePayoff(
      { balance: 1000, aprPercent: 0, monthlyPayment: 300 },
      TODAY,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.months).toBe(4);
    expect(r.finalPaymentPence).toBe(10000);
    expect(r.totalPaidPence).toBe(100000);
  });
});

describe("simulatePayoff — £1,000 at 24% APR, £100/month (hand-computed)", () => {
  const r = simulatePayoff(
    { balance: 1000, aprPercent: 24, monthlyPayment: 100 },
    TODAY,
  );
  if (!r.ok) throw new Error("expected success");

  it("first three months match hand calculation (2%/month)", () => {
    // m1: £20.00 interest → £920.00; m2: £18.40 → £838.40;
    // m3: round(£16.768) = £16.77 → £755.17
    expect(r.schedule[0]).toEqual({
      month: 1,
      paymentPence: 10000,
      interestPence: 2000,
      principalPence: 8000,
      balancePence: 92000,
    });
    expect(r.schedule[1]).toEqual({
      month: 2,
      paymentPence: 10000,
      interestPence: 1840,
      principalPence: 8160,
      balancePence: 83840,
    });
    expect(r.schedule[2]).toEqual({
      month: 3,
      paymentPence: 10000,
      interestPence: 1677,
      principalPence: 8323,
      balancePence: 75517,
    });
  });

  it("clears in 12 months with a £27.04 final payment", () => {
    expect(r.months).toBe(12);
    expect(r.finalPaymentPence).toBe(2704);
  });

  it("total interest £127.04, total paid £1,127.04", () => {
    expect(r.totalInterestPence).toBe(12704);
    expect(r.totalPaidPence).toBe(112704);
    // invariant: total paid = balance + interest
    expect(r.totalPaidPence).toBe(100000 + r.totalInterestPence);
  });

  it("projects the payoff month 12 months ahead", () => {
    expect(r.payoffMonth).toBe("2027-08");
  });
});

describe("simulatePayoff — payment too small", () => {
  it("payment equal to first month's interest never clears", () => {
    const r = simulatePayoff(
      { balance: 1000, aprPercent: 24, monthlyPayment: 20 },
      TODAY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.firstMonthInterestPence).toBe(2000);
    // Minimum viable = annuity payment over 600 months: £20.01
    expect(r.suggestedMonthlyPence).toBe(2001);
    expect(r.message).toMatch(/never clears/i);
  });

  it("payment that shrinks the balance too slowly hits the 600-month cap", () => {
    const r = simulatePayoff(
      { balance: 1_000_000, aprPercent: 24, monthlyPayment: 20000.01 },
      TODAY,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("50 years");
    expect(r.suggestedMonthlyPence).toBe(2000014);
  });

  it("rejects invalid inputs with messages, never throws", () => {
    expect(
      simulatePayoff({ balance: 0, aprPercent: 24, monthlyPayment: 50 }, TODAY)
        .ok,
    ).toBe(false);
    expect(
      simulatePayoff(
        { balance: 1000, aprPercent: -1, monthlyPayment: 50 },
        TODAY,
      ).ok,
    ).toBe(false);
    expect(
      simulatePayoff(
        { balance: 1000, aprPercent: 24, monthlyPayment: 0 },
        TODAY,
      ).ok,
    ).toBe(false);
  });
});

describe("simulatePayoff — rounding edges", () => {
  it("a 1p balance clears in one month with zero interest", () => {
    const r = simulatePayoff(
      { balance: 0.01, aprPercent: 24, monthlyPayment: 10 },
      TODAY,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.months).toBe(1);
    expect(r.finalPaymentPence).toBe(1);
    expect(r.totalInterestPence).toBe(0);
  });
});

describe("requiredMonthlyPayment (mode B)", () => {
  it("zero APR: £1,000 over 12 months → £83.34, verified by simulation", () => {
    const r = requiredMonthlyPayment(
      { balance: 1000, aprPercent: 0, targetMonths: 12 },
      TODAY,
    );
    if (!r.ok) throw new Error(r.message);
    expect(r.monthlyPaymentPence).toBe(8334); // ceil(100000 / 12)
    expect(r.months).toBe(12);
    expect(r.finalPaymentPence).toBe(8326); // 100000 − 11 × 8334
    expect(r.totalPaidPence).toBe(100000);
    expect(r.totalInterestPence).toBe(0);
  });

  it("£5,000 at 19.9% over 24 months round-trips through the simulation", () => {
    const r = requiredMonthlyPayment(
      { balance: 5000, aprPercent: 19.9, targetMonths: 24 },
      TODAY,
    );
    if (!r.ok) throw new Error(r.message);
    // Annuity formula gives ≈ £254.23/month.
    expect(r.monthlyPaymentPence).toBeGreaterThan(25300);
    expect(r.monthlyPaymentPence).toBeLessThan(25550);
    expect(r.months).toBeLessThanOrEqual(24);
    expect(r.months).toBeGreaterThanOrEqual(23);
    const last = r.schedule[r.schedule.length - 1];
    expect(last.balancePence).toBe(0);
    // invariant: total paid = payments made
    const paid = r.schedule.reduce((sum, row) => sum + row.paymentPence, 0);
    expect(paid).toBe(r.totalPaidPence);
    expect(r.totalPaidPence).toBe(500000 + r.totalInterestPence);
  });

  it("rejects a target outside 1..MAX_MONTHS", () => {
    expect(
      requiredMonthlyPayment(
        { balance: 1000, aprPercent: 20, targetMonths: 0 },
        TODAY,
      ).ok,
    ).toBe(false);
    expect(
      requiredMonthlyPayment(
        { balance: 1000, aprPercent: 20, targetMonths: MAX_MONTHS + 1 },
        TODAY,
      ).ok,
    ).toBe(false);
  });

  it("rejects a zero balance", () => {
    expect(
      requiredMonthlyPayment(
        { balance: 0, aprPercent: 20, targetMonths: 12 },
        TODAY,
      ).ok,
    ).toBe(false);
  });
});
