/**
 * Holiday pay estimates based on the UK statutory rules (verified in
 * TAX_RESEARCH.md, section 6):
 *
 * - Statutory minimum: 5.6 weeks of paid holiday per year.
 * - Cap: 28 days — a 6-day-week worker still gets a maximum of 28 days.
 * - Irregular-hours / part-year workers (leave years from 1 April 2024):
 *   holiday accrues at 12.07% of hours worked in each pay period,
 *   rounded to the nearest hour; rolled-up holiday pay may be 12.07% of
 *   pay in the period. 12.07% = 5.6 / 46.4 (52 − 5.6).
 *
 * These rules are the same for 2025-26 and 2026-27. Estimates only —
 * contracts can be more generous, and leave-year start dates, part-year
 * contracts and TUPE situations can change the numbers.
 */

import {
  type CalcError,
  calcError,
  parseNumber,
  poundsToPence,
} from "./workingHours";

export const STATUTORY_WEEKS = 5.6;
export const STATUTORY_DAYS_CAP = 28;
/** 12.07% = 5.6 / 46.4 — the statutory accrual rate for irregular hours. */
export const ACCRUAL_PERCENT = 12.07;

/* ------------------------------------------------------------------ */
/* Mode A: regular hours                                               */
/* ------------------------------------------------------------------ */

export interface RegularHolidayInput {
  /** Hourly rate in pounds (raw string). */
  hourlyRate: string;
  /** Hours worked per week (raw string). */
  weeklyHours: string;
  /** Days worked per week (raw string, 0–7, decimals allowed). */
  daysPerWeek: string;
}

export interface RegularHolidayResult {
  ok: true;
  /** Hours in a typical working day (weekly hours ÷ days per week). */
  dailyHours: number;
  /** 5.6 × days per week, before the 28-day cap. */
  uncappedDays: number;
  /** Annual entitlement in days after the 28-day cap. */
  entitlementDays: number;
  /** True when the 28-day cap reduced the entitlement. */
  capApplied: boolean;
  /** Annual entitlement in hours (entitlement days × daily hours). */
  entitlementHours: number;
  /** Value of the annual entitlement at the hourly rate, in pence. */
  entitlementPayPence: number;
}

export function calculateRegularHoliday(
  input: RegularHolidayInput,
): RegularHolidayResult | CalcError {
  if (input.hourlyRate.trim() === "") {
    return calcError("rate", "Enter your hourly rate.", true);
  }
  const rate = parseNumber(input.hourlyRate);
  if (rate === null || rate <= 0) {
    return calcError("rate", "Hourly rate must be more than zero.");
  }

  if (input.weeklyHours.trim() === "") {
    return calcError("weeklyHours", "Enter your usual weekly hours.", true);
  }
  const weeklyHours = parseNumber(input.weeklyHours);
  if (weeklyHours === null || weeklyHours <= 0) {
    return calcError("weeklyHours", "Weekly hours must be more than 0.");
  }
  if (weeklyHours > 168) {
    return calcError(
      "weeklyHours",
      "Weekly hours can't be more than 168 — there are only 168 hours in a week.",
    );
  }

  if (input.daysPerWeek.trim() === "") {
    return calcError(
      "daysPerWeek",
      "Enter how many days a week you work.",
      true,
    );
  }
  const daysPerWeek = parseNumber(input.daysPerWeek);
  if (daysPerWeek === null || daysPerWeek <= 0 || daysPerWeek > 7) {
    return calcError(
      "daysPerWeek",
      "Days per week must be between 1 and 7 (part days like 4.5 are fine).",
    );
  }

  const dailyHours = weeklyHours / daysPerWeek;
  const uncappedDays = STATUTORY_WEEKS * daysPerWeek;
  const capApplied = uncappedDays > STATUTORY_DAYS_CAP;
  const entitlementDays = capApplied ? STATUTORY_DAYS_CAP : uncappedDays;
  const entitlementHours = entitlementDays * dailyHours;
  const entitlementPayPence = Math.round(
    poundsToPence(rate) * entitlementHours,
  );

  return {
    ok: true,
    dailyHours,
    uncappedDays,
    entitlementDays,
    capApplied,
    entitlementHours,
    entitlementPayPence,
  };
}

/* ------------------------------------------------------------------ */
/* Quick calc: value of X holiday days/hours                           */
/* ------------------------------------------------------------------ */

export interface HolidayValueInput {
  /** Hourly rate in pounds (raw string). */
  hourlyRate: string;
  /** How much holiday (raw string). */
  amount: string;
  unit: "days" | "hours";
  /** Hours per working day — needed only when unit is "days". */
  hoursPerDay: string;
}

export interface HolidayValueResult {
  ok: true;
  hours: number;
  payPence: number;
}

export function calculateHolidayValue(
  input: HolidayValueInput,
): HolidayValueResult | CalcError {
  if (input.hourlyRate.trim() === "") {
    return calcError("valueRate", "Enter your hourly rate.", true);
  }
  const rate = parseNumber(input.hourlyRate);
  if (rate === null || rate <= 0) {
    return calcError("valueRate", "Hourly rate must be more than zero.");
  }

  if (input.amount.trim() === "") {
    return calcError(
      "valueAmount",
      "Enter how much holiday to value.",
      true,
    );
  }
  const amount = parseNumber(input.amount);
  if (amount === null || amount < 0) {
    return calcError("valueAmount", "Holiday amount must be 0 or more.");
  }

  let hours = amount;
  if (input.unit === "days") {
    if (input.hoursPerDay.trim() === "") {
      return calcError(
        "valueHoursPerDay",
        "Enter the hours in a working day.",
        true,
      );
    }
    const hoursPerDay = parseNumber(input.hoursPerDay);
    if (hoursPerDay === null || hoursPerDay <= 0 || hoursPerDay > 24) {
      return calcError(
        "valueHoursPerDay",
        "Hours per day must be between 0 and 24.",
      );
    }
    hours = amount * hoursPerDay;
  }

  return {
    ok: true,
    hours,
    payPence: Math.round(poundsToPence(rate) * hours),
  };
}

/* ------------------------------------------------------------------ */
/* Mode B: irregular hours — 12.07% accrual                            */
/* ------------------------------------------------------------------ */

export interface IrregularHolidayInput {
  /** Gross pay for the period, in pounds (raw string). */
  grossPay: string;
  /** Hours worked in the period (raw string; optional — empty allowed). */
  hoursWorked: string;
}

export interface IrregularHolidayResult {
  ok: true;
  /** 12.07% of gross pay, in pence. */
  accruedPayPence: number;
  /** 12.07% of hours worked (exact), or null when hours weren't given. */
  accruedHoursExact: number | null;
  /** Accrued hours rounded to the nearest whole hour (statutory rounding). */
  accruedHoursRounded: number | null;
}

export function calculateIrregularHoliday(
  input: IrregularHolidayInput,
): IrregularHolidayResult | CalcError {
  if (input.grossPay.trim() === "") {
    return calcError(
      "grossPay",
      "Enter your gross pay for the period.",
      true,
    );
  }
  const gross = parseNumber(input.grossPay);
  if (gross === null || gross < 0) {
    return calcError("grossPay", "Gross pay must be zero or more.");
  }

  let accruedHoursExact: number | null = null;
  let accruedHoursRounded: number | null = null;
  if (input.hoursWorked.trim() !== "") {
    const hours = parseNumber(input.hoursWorked);
    if (hours === null || hours < 0) {
      return calcError("hoursWorked", "Hours worked must be 0 or more.");
    }
    accruedHoursExact = (hours * ACCRUAL_PERCENT) / 100;
    accruedHoursRounded = Math.round(accruedHoursExact);
  }

  return {
    ok: true,
    accruedPayPence: Math.round(
      (poundsToPence(gross) * ACCRUAL_PERCENT) / 100,
    ),
    accruedHoursExact,
    accruedHoursRounded,
  };
}
