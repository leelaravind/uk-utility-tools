import { describe, expect, it } from "vitest";

import { calculateOvertime, type OvertimeInput } from "./overtime";

const BASE: OvertimeInput = {
  hourlyRate: "15",
  standardWeeklyHours: "37.5",
  actualHours: "42.5",
  mode: "multiplier",
  multiplier: "1.5",
  overtimeRate: "",
};

describe("calculateOvertime", () => {
  it("splits hours and pays overtime at time and a half", () => {
    // 37.5h at £15 = £562.50; 5h at £22.50 = £112.50; total £675.
    const r = calculateOvertime(BASE);
    expect(r).toMatchObject({
      ok: true,
      normalHours: 37.5,
      overtimeHours: 5,
      normalPayPence: 56250,
      overtimePayPence: 11250,
      totalPence: 67500,
    });
  });

  it("pays no overtime when actual hours are at or under standard", () => {
    const r = calculateOvertime({ ...BASE, actualHours: "36" });
    expect(r).toMatchObject({
      ok: true,
      normalHours: 36,
      overtimeHours: 0,
      normalPayPence: 54000,
      overtimePayPence: 0,
      totalPence: 54000,
    });

    const exact = calculateOvertime({ ...BASE, actualHours: "37.5" });
    expect(exact).toMatchObject({ ok: true, overtimeHours: 0 });
  });

  it("uses an explicit overtime rate in rate mode", () => {
    const r = calculateOvertime({
      hourlyRate: "10",
      standardWeeklyHours: "40",
      actualHours: "45",
      mode: "rate",
      multiplier: "",
      overtimeRate: "18",
    });
    expect(r).toMatchObject({
      ok: true,
      normalHours: 40,
      overtimeHours: 5,
      normalPayPence: 40000,
      overtimePayPence: 9000, // 5h × £18
      totalPence: 49000,
    });
  });

  it("treats every hour as overtime when standard hours are zero", () => {
    const r = calculateOvertime({
      ...BASE,
      hourlyRate: "12",
      standardWeeklyHours: "0",
      actualHours: "10",
      multiplier: "2",
    });
    expect(r).toMatchObject({
      ok: true,
      normalHours: 0,
      overtimeHours: 10,
      normalPayPence: 0,
      overtimePayPence: 24000, // 10h × £24
      totalPence: 24000,
    });
  });

  it("rounds fractional-penny overtime rates only at the pay stage", () => {
    // £12.50 × 1.25 = £15.625/h; 1 OT hour → £15.63 after rounding.
    const r = calculateOvertime({
      ...BASE,
      hourlyRate: "12.50",
      standardWeeklyHours: "40",
      actualHours: "41",
      multiplier: "1.25",
    });
    expect(r).toMatchObject({
      ok: true,
      overtimeRatePence: 1562.5,
      normalPayPence: 50000,
      overtimePayPence: 1563,
      totalPence: 51563,
    });
  });

  it("rejects invalid inputs with field-level messages", () => {
    expect(calculateOvertime({ ...BASE, hourlyRate: "-1" })).toMatchObject({
      ok: false,
      field: "rate",
    });
    expect(calculateOvertime({ ...BASE, actualHours: "200" })).toMatchObject({
      ok: false,
      field: "actual",
    });
    expect(
      calculateOvertime({ ...BASE, standardWeeklyHours: "-2" }),
    ).toMatchObject({ ok: false, field: "standard" });
    expect(calculateOvertime({ ...BASE, multiplier: "0.9" })).toMatchObject({
      ok: false,
      field: "multiplier",
    });
    expect(
      calculateOvertime({ ...BASE, mode: "rate", overtimeRate: "0" }),
    ).toMatchObject({ ok: false, field: "overtimeRate" });
  });

  it("flags empty required fields as incomplete", () => {
    expect(calculateOvertime({ ...BASE, hourlyRate: "" })).toMatchObject({
      ok: false,
      incomplete: true,
    });
    expect(calculateOvertime({ ...BASE, actualHours: "" })).toMatchObject({
      ok: false,
      incomplete: true,
    });
  });
});
