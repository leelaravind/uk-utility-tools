import { describe, expect, it } from "vitest";

import {
  ACCRUAL_PERCENT,
  calculateHolidayValue,
  calculateIrregularHoliday,
  calculateRegularHoliday,
  STATUTORY_DAYS_CAP,
  STATUTORY_WEEKS,
} from "./holidayPay";

describe("constants", () => {
  it("matches the verified statutory figures", () => {
    expect(STATUTORY_WEEKS).toBe(5.6);
    expect(STATUTORY_DAYS_CAP).toBe(28);
    expect(ACCRUAL_PERCENT).toBe(12.07);
  });
});

describe("calculateRegularHoliday", () => {
  it("gives a 5-day 40h worker exactly 28 days / 224 hours", () => {
    const r = calculateRegularHoliday({
      hourlyRate: "12",
      weeklyHours: "40",
      daysPerWeek: "5",
    });
    expect(r).toMatchObject({
      ok: true,
      dailyHours: 8,
      uncappedDays: 28, // 5.6 × 5
      entitlementDays: 28,
      capApplied: false,
      entitlementHours: 224, // 5.6 × 40
      entitlementPayPence: 268800, // £2,688
    });
  });

  it("caps a 6-day-week worker at 28 days", () => {
    const r = calculateRegularHoliday({
      hourlyRate: "10",
      weeklyHours: "48",
      daysPerWeek: "6",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.uncappedDays).toBeCloseTo(33.6, 10); // 5.6 × 6
      expect(r.capApplied).toBe(true);
      expect(r.entitlementDays).toBe(28);
      expect(r.entitlementHours).toBe(224); // 28 × 8, not 5.6 × 48 = 268.8
      expect(r.entitlementPayPence).toBe(224000); // £2,240
    }
  });

  it("pro-rates part-time workers (2-day 16h week)", () => {
    const r = calculateRegularHoliday({
      hourlyRate: "11",
      weeklyHours: "16",
      daysPerWeek: "2",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.uncappedDays).toBeCloseTo(11.2, 10); // 5.6 × 2
      expect(r.capApplied).toBe(false);
      expect(r.entitlementHours).toBeCloseTo(89.6, 10); // 5.6 × 16
      expect(r.entitlementPayPence).toBe(98560); // £985.60
    }
  });

  it("rejects invalid inputs and flags empties as incomplete", () => {
    expect(
      calculateRegularHoliday({
        hourlyRate: "12",
        weeklyHours: "40",
        daysPerWeek: "8",
      }),
    ).toMatchObject({ ok: false, field: "daysPerWeek" });
    expect(
      calculateRegularHoliday({
        hourlyRate: "12",
        weeklyHours: "0",
        daysPerWeek: "5",
      }),
    ).toMatchObject({ ok: false, field: "weeklyHours" });
    expect(
      calculateRegularHoliday({
        hourlyRate: "",
        weeklyHours: "40",
        daysPerWeek: "5",
      }),
    ).toMatchObject({ ok: false, incomplete: true, field: "rate" });
  });
});

describe("calculateHolidayValue", () => {
  it("values holiday given in days", () => {
    // 5 days × 7.5 h/day = 37.5h at £12.21 → £457.88 (rounded to a penny)
    const r = calculateHolidayValue({
      hourlyRate: "12.21",
      amount: "5",
      unit: "days",
      hoursPerDay: "7.5",
    });
    expect(r).toMatchObject({ ok: true, hours: 37.5, payPence: 45788 });
  });

  it("values holiday given in hours, ignoring hours-per-day", () => {
    const r = calculateHolidayValue({
      hourlyRate: "10",
      amount: "20",
      unit: "hours",
      hoursPerDay: "",
    });
    expect(r).toMatchObject({ ok: true, hours: 20, payPence: 20000 });
  });

  it("rejects invalid hours-per-day in days mode", () => {
    const r = calculateHolidayValue({
      hourlyRate: "10",
      amount: "5",
      unit: "days",
      hoursPerDay: "0",
    });
    expect(r).toMatchObject({ ok: false, field: "valueHoursPerDay" });
  });
});

describe("calculateIrregularHoliday (12.07% accrual)", () => {
  it("accrues 12.07% of gross pay", () => {
    const r = calculateIrregularHoliday({ grossPay: "1000", hoursWorked: "" });
    expect(r).toMatchObject({
      ok: true,
      accruedPayPence: 12070, // £120.70
      accruedHoursExact: null,
      accruedHoursRounded: null,
    });

    const r2 = calculateIrregularHoliday({ grossPay: "2500", hoursWorked: "" });
    expect(r2).toMatchObject({ ok: true, accruedPayPence: 30175 }); // £301.75
  });

  it("accrues hours at 12.07%, rounded to the nearest whole hour", () => {
    const r = calculateIrregularHoliday({
      grossPay: "1200",
      hoursWorked: "100",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.accruedHoursExact).toBeCloseTo(12.07, 10);
      expect(r.accruedHoursRounded).toBe(12);
    }

    const r2 = calculateIrregularHoliday({
      grossPay: "1200",
      hoursWorked: "95",
    });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.accruedHoursRounded).toBe(11); // 11.4665 → 11
  });

  it("rejects negative amounts and flags an empty gross as incomplete", () => {
    expect(
      calculateIrregularHoliday({ grossPay: "-5", hoursWorked: "" }),
    ).toMatchObject({ ok: false, field: "grossPay" });
    expect(
      calculateIrregularHoliday({ grossPay: "1000", hoursWorked: "-1" }),
    ).toMatchObject({ ok: false, field: "hoursWorked" });
    expect(
      calculateIrregularHoliday({ grossPay: "", hoursWorked: "" }),
    ).toMatchObject({ ok: false, incomplete: true });
  });
});
