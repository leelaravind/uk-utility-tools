import { describe, expect, it } from "vitest";

import {
  calculateShiftPay,
  nightOverlapMinutes,
  type ShiftPayInput,
} from "./shiftPay";

/** Baseline input: plain same-day shift with everything optional off. */
const BASE: ShiftPayInput = {
  start: "09:00",
  end: "17:00",
  overnight: false,
  breakMinutes: "",
  hourlyRate: "10",
  nightPremium: false,
  nightRate: "",
  nightStart: "22:00",
  nightEnd: "06:00",
  weekendShift: false,
  weekendRate: "",
  overtime: false,
  overtimeThresholdHours: "",
  overtimeMultiplier: "",
};

describe("nightOverlapMinutes", () => {
  it("computes full overlap for a night shift inside a wrapping window", () => {
    // Shift 22:00 → 06:00 next day, window 22:00–06:00
    expect(nightOverlapMinutes(1320, 1800, 1320, 360)).toBe(480);
  });

  it("computes partial overlap when the shift starts before the window", () => {
    // Shift 18:00 → 02:00 next day, window 22:00–06:00 → 22:00–02:00 = 240
    expect(nightOverlapMinutes(1080, 1560, 1320, 360)).toBe(240);
  });

  it("handles a wrapping window against a same-day early shift", () => {
    // Shift 04:00 → 08:00, window 22:00–06:00 → 04:00–06:00 = 120
    expect(nightOverlapMinutes(240, 480, 1320, 360)).toBe(120);
  });

  it("handles a non-wrapping window on the shift's second day", () => {
    // Shift 22:00 → 06:00 next day, window 00:00–06:00 → 360 on day 2
    expect(nightOverlapMinutes(1320, 1800, 0, 360)).toBe(360);
  });

  it("returns zero when there is no overlap or a zero-length window", () => {
    // Day shift vs 22:00–06:00 window
    expect(nightOverlapMinutes(540, 1020, 1320, 360)).toBe(0);
    // Zero-length window
    expect(nightOverlapMinutes(540, 1020, 600, 600)).toBe(0);
  });
});

describe("calculateShiftPay", () => {
  it("reproduces the reference example exactly", () => {
    // 22:00 → 06:00, 30 min break, £12.50/h, £2/h night premium covering
    // the whole shift → worked 7h30m, base £93.75, night £15, total £108.75
    const r = calculateShiftPay({
      ...BASE,
      start: "22:00",
      end: "06:00",
      overnight: true,
      breakMinutes: "30",
      hourlyRate: "12.50",
      nightPremium: true,
      nightRate: "2",
      nightStart: "22:00",
      nightEnd: "06:00",
    });
    expect(r).toMatchObject({
      ok: true,
      elapsedMinutes: 480,
      breakMinutes: 30,
      paidMinutes: 450, // 7h 30m
      nightOverlapMinutes: 480,
      nightEligibleMinutes: 450,
      basePayPence: 9375, // £93.75
      nightPremiumPence: 1500, // £15.00
      weekendPremiumPence: 0,
      overtimeUpliftPence: 0,
      totalPence: 10875, // £108.75
    });
  });

  it("handles a plain same-day shift with a break", () => {
    const r = calculateShiftPay({ ...BASE, breakMinutes: "60" });
    expect(r).toMatchObject({
      ok: true,
      elapsedMinutes: 480,
      paidMinutes: 420,
      basePayPence: 7000, // 7h × £10
      totalPence: 7000,
    });
  });

  it("handles zero break on an overnight shift", () => {
    const r = calculateShiftPay({
      ...BASE,
      start: "22:00",
      end: "06:00",
      overnight: true,
    });
    expect(r).toMatchObject({ ok: true, paidMinutes: 480, basePayPence: 8000 });
  });

  it("pays the night premium only on the overlapping portion", () => {
    // 18:00 → 02:00, window 22:00–06:00 → 4h of 8h at night, no break
    const r = calculateShiftPay({
      ...BASE,
      start: "18:00",
      end: "02:00",
      overnight: true,
      nightPremium: true,
      nightRate: "3",
    });
    expect(r).toMatchObject({
      ok: true,
      nightOverlapMinutes: 240,
      nightEligibleMinutes: 240,
      basePayPence: 8000,
      nightPremiumPence: 1200, // 4h × £3
      totalPence: 9200,
    });
  });

  it("reduces night-eligible minutes proportionally when there is a break", () => {
    // Same partial-overlap shift with a 60 min break: night share is
    // 240/480, so eligible = 240 × (420/480) = 210 min.
    const r = calculateShiftPay({
      ...BASE,
      start: "18:00",
      end: "02:00",
      overnight: true,
      breakMinutes: "60",
      nightPremium: true,
      nightRate: "3",
    });
    expect(r).toMatchObject({
      ok: true,
      paidMinutes: 420,
      nightOverlapMinutes: 240,
      nightEligibleMinutes: 210,
      basePayPence: 7000, // 7h × £10
      nightPremiumPence: 1050, // 3.5h × £3
      totalPence: 8050,
    });
  });

  it("handles a night window that wraps midnight against an early shift", () => {
    // 04:00 → 08:00 shift, window 22:00–06:00 → 2h of premium
    const r = calculateShiftPay({
      ...BASE,
      start: "04:00",
      end: "08:00",
      nightPremium: true,
      nightRate: "2",
    });
    expect(r).toMatchObject({
      ok: true,
      nightOverlapMinutes: 120,
      basePayPence: 4000,
      nightPremiumPence: 400, // 2h × £2
      totalPence: 4400,
    });
  });

  it("applies the weekend premium to all paid hours", () => {
    const r = calculateShiftPay({
      ...BASE,
      weekendShift: true,
      weekendRate: "1.50",
    });
    expect(r).toMatchObject({
      ok: true,
      basePayPence: 8000, // 8h × £10
      weekendPremiumPence: 1200, // 8h × £1.50
      totalPence: 9200,
    });
  });

  it("shows the overtime uplift separately from base pay", () => {
    // 08:00 → 18:30, 30 min break → 10 paid hours; threshold 8h at 1.5×.
    // 2h overtime → uplift = 2 × £12 × 0.5 = £12.
    const r = calculateShiftPay({
      ...BASE,
      start: "08:00",
      end: "18:30",
      breakMinutes: "30",
      hourlyRate: "12",
      overtime: true,
      overtimeThresholdHours: "8",
      overtimeMultiplier: "1.5",
    });
    expect(r).toMatchObject({
      ok: true,
      paidMinutes: 600,
      overtimeMinutes: 120,
      basePayPence: 12000, // 10h × £12 (all hours at base)
      overtimeUpliftPence: 1200, // the extra above base
      totalPence: 13200,
    });
  });

  it("charges no overtime when paid hours are under the threshold", () => {
    const r = calculateShiftPay({
      ...BASE,
      overtime: true,
      overtimeThresholdHours: "10",
      overtimeMultiplier: "2",
    });
    expect(r).toMatchObject({ ok: true, overtimeMinutes: 0, overtimeUpliftPence: 0 });
  });

  it("rejects a finish equal to the start without overnight", () => {
    const r = calculateShiftPay({ ...BASE, end: "09:00" });
    expect(r).toMatchObject({
      ok: false,
      message:
        "Finish time must be after the start time, or turn on overnight shift.",
    });
  });

  it("rejects a negative or zero hourly rate", () => {
    for (const hourlyRate of ["-5", "0"]) {
      const r = calculateShiftPay({ ...BASE, hourlyRate });
      expect(r).toMatchObject({ ok: false, field: "rate" });
    }
  });

  it("rejects a break as long as the shift", () => {
    const r = calculateShiftPay({
      ...BASE,
      start: "09:00",
      end: "10:00",
      breakMinutes: "60",
    });
    expect(r).toMatchObject({ ok: false, field: "break" });
  });

  it("flags an empty hourly rate as incomplete, not an error", () => {
    const r = calculateShiftPay({ ...BASE, hourlyRate: "" });
    expect(r).toMatchObject({ ok: false, incomplete: true, field: "rate" });
  });

  it("rejects an overtime multiplier below 1 and a bad night window", () => {
    const badMultiplier = calculateShiftPay({
      ...BASE,
      overtime: true,
      overtimeThresholdHours: "8",
      overtimeMultiplier: "0.5",
    });
    expect(badMultiplier).toMatchObject({ ok: false, field: "overtimeMultiplier" });

    const badWindow = calculateShiftPay({
      ...BASE,
      nightPremium: true,
      nightRate: "2",
      nightStart: "22:00",
      nightEnd: "22:00",
    });
    expect(badWindow).toMatchObject({ ok: false, field: "nightEnd" });
  });
});
