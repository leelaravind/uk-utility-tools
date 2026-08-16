import { describe, expect, it } from "vitest";

import {
  calculateSingleShift,
  calculateWeeklyTotals,
  formatDecimalHours,
  formatHoursMinutes,
  formatHoursNumber,
  formatPence,
  minutesToDecimalHours,
  parseNumber,
  parseTimeToMinutes,
  poundsToPence,
} from "./workingHours";

describe("parseTimeToMinutes", () => {
  it("parses standard HH:MM values", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("accepts a single-digit hour", () => {
    expect(parseTimeToMinutes("9:30")).toBe(570);
  });

  it("rejects out-of-range and malformed values", () => {
    expect(parseTimeToMinutes("24:00")).toBeNull();
    expect(parseTimeToMinutes("12:60")).toBeNull();
    expect(parseTimeToMinutes("noon")).toBeNull();
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("12")).toBeNull();
  });
});

describe("parseNumber", () => {
  it("parses plain and comma-grouped numbers", () => {
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("1,250.50")).toBe(1250.5);
    expect(parseNumber(" 7 ")).toBe(7);
    expect(parseNumber("-3")).toBe(-3);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("   ")).toBeNull();
    expect(parseNumber("12abc")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("formatting helpers", () => {
  it("formats minutes as h/m", () => {
    expect(formatHoursMinutes(450)).toBe("7h 30m");
    expect(formatHoursMinutes(0)).toBe("0h 0m");
    expect(formatHoursMinutes(59.6)).toBe("1h 0m"); // rounds to nearest minute
  });

  it("converts minutes to decimal hours (2 dp)", () => {
    expect(minutesToDecimalHours(450)).toBe(7.5); // 7h30m = 7.5
    expect(minutesToDecimalHours(440)).toBe(7.33); // 7h20m ≈ 7.33
    expect(formatDecimalHours(450)).toBe("7.50");
  });

  it("formats hour quantities without trailing zeros", () => {
    expect(formatHoursNumber(37.5)).toBe("37.5");
    expect(formatHoursNumber(5)).toBe("5");
    expect(formatHoursNumber(11.4665)).toBe("11.47");
  });

  it("formats pence as GBP", () => {
    expect(formatPence(10875)).toBe("£108.75");
    expect(formatPence(0)).toBe("£0.00");
    expect(formatPence(268800)).toBe("£2,688.00");
  });

  it("converts pounds to pence, rounding to the nearest penny", () => {
    expect(poundsToPence(12.5)).toBe(1250);
    expect(poundsToPence(12.21)).toBe(1221);
  });
});

describe("calculateSingleShift", () => {
  it("handles a same-day shift with a break", () => {
    const r = calculateSingleShift({
      start: "09:00",
      end: "17:30",
      breakMinutes: "30",
      overnight: false,
    });
    expect(r).toMatchObject({
      ok: true,
      elapsedMinutes: 510,
      breakMinutes: 30,
      paidMinutes: 480,
      paidDecimalHours: 8,
    });
  });

  it("handles an overnight shift (22:00 → 06:00 = 8h)", () => {
    const r = calculateSingleShift({
      start: "22:00",
      end: "06:00",
      breakMinutes: "",
      overnight: true,
    });
    expect(r).toMatchObject({
      ok: true,
      startMinute: 1320,
      endMinute: 1800,
      elapsedMinutes: 480,
      breakMinutes: 0,
      paidMinutes: 480,
    });
  });

  it("treats an empty break as zero", () => {
    const r = calculateSingleShift({
      start: "08:00",
      end: "16:00",
      breakMinutes: "",
      overnight: false,
    });
    expect(r).toMatchObject({ ok: true, paidMinutes: 480 });
  });

  it("subtracts the unpaid break", () => {
    const r = calculateSingleShift({
      start: "09:00",
      end: "17:00",
      breakMinutes: "60",
      overnight: false,
    });
    expect(r).toMatchObject({ ok: true, paidMinutes: 420, paidDecimalHours: 7 });
  });

  it("allows a full 24-hour overnight shift (same start and end)", () => {
    const r = calculateSingleShift({
      start: "22:00",
      end: "22:00",
      breakMinutes: "",
      overnight: true,
    });
    expect(r).toMatchObject({ ok: true, elapsedMinutes: 1440 });
  });

  it("rejects finish before or equal to start without overnight", () => {
    for (const end of ["09:00", "08:00"]) {
      const r = calculateSingleShift({
        start: "09:00",
        end,
        breakMinutes: "",
        overnight: false,
      });
      expect(r).toMatchObject({
        ok: false,
        field: "end",
        message:
          "Finish time must be after the start time, or turn on overnight shift.",
      });
    }
  });

  it("rejects an overnight shift longer than 24 hours", () => {
    const r = calculateSingleShift({
      start: "09:00",
      end: "17:00",
      breakMinutes: "",
      overnight: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/24 hours/);
  });

  it("rejects a break as long as the shift", () => {
    const r = calculateSingleShift({
      start: "09:00",
      end: "10:00",
      breakMinutes: "60",
      overnight: false,
    });
    expect(r).toMatchObject({
      ok: false,
      field: "break",
      message: "The unpaid break must be shorter than the shift itself.",
    });
  });

  it("rejects negative or non-numeric breaks", () => {
    for (const breakMinutes of ["-10", "abc"]) {
      const r = calculateSingleShift({
        start: "09:00",
        end: "17:00",
        breakMinutes,
        overnight: false,
      });
      expect(r).toMatchObject({ ok: false, field: "break" });
    }
  });

  it("rejects malformed times and flags empty ones as incomplete", () => {
    const bad = calculateSingleShift({
      start: "25:00",
      end: "17:00",
      breakMinutes: "",
      overnight: false,
    });
    expect(bad).toMatchObject({ ok: false, field: "start" });

    const empty = calculateSingleShift({
      start: "",
      end: "17:00",
      breakMinutes: "",
      overnight: false,
    });
    expect(empty).toMatchObject({ ok: false, field: "start", incomplete: true });
  });
});

describe("calculateWeeklyTotals", () => {
  const day = { breakMinutes: "", overnight: false };

  it("totals multiple shifts and prices them at an hourly rate", () => {
    const r = calculateWeeklyTotals(
      [
        { start: "09:00", end: "17:00", breakMinutes: "30", overnight: false }, // 450
        { start: "22:00", end: "06:00", breakMinutes: "60", overnight: true }, // 420
      ],
      "10",
    );
    expect(r.countedRows).toBe(2);
    expect(r.totalPaidMinutes).toBe(870); // 14h 30m
    expect(r.totalDecimalHours).toBe(14.5);
    expect(r.payPence).toBe(14500); // 14.5h × £10
    expect(r.hasRowErrors).toBe(false);
  });

  it("converts awkward totals to decimal hours correctly", () => {
    const r = calculateWeeklyTotals(
      [
        { ...day, start: "09:00", end: "16:30" }, // 450 = 7.5
        { ...day, start: "09:00", end: "16:20" }, // 440 ≈ 7.33
      ],
      "",
    );
    expect(r.totalPaidMinutes).toBe(890);
    expect(r.totalDecimalHours).toBe(14.83);
    expect(r.payPence).toBeNull();
  });

  it("skips blank rows without flagging errors", () => {
    const r = calculateWeeklyTotals(
      [
        { ...day, start: "09:00", end: "17:00" },
        { ...day, start: "", end: "" },
      ],
      "",
    );
    expect(r.countedRows).toBe(1);
    expect(r.totalPaidMinutes).toBe(480);
    expect(r.hasRowErrors).toBe(false);
  });

  it("excludes error rows from the total and flags them", () => {
    const r = calculateWeeklyTotals(
      [
        { ...day, start: "09:00", end: "17:00" },
        { ...day, start: "09:00", end: "09:00" }, // invalid
      ],
      "",
    );
    expect(r.countedRows).toBe(1);
    expect(r.totalPaidMinutes).toBe(480);
    expect(r.hasRowErrors).toBe(true);
    expect(r.rows[1]).toMatchObject({ ok: false });
  });

  it("reports a rate error instead of pay when the rate is invalid", () => {
    const r = calculateWeeklyTotals(
      [{ ...day, start: "09:00", end: "17:00" }],
      "abc",
    );
    expect(r.payPence).toBeNull();
    expect(r.rateError).toBeTruthy();
  });
});
