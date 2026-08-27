/**
 * Overtime pay calculation.
 *
 * Normal hours = min(actual, standard); overtime hours = the excess.
 * Overtime is paid either at base rate × multiplier or at an explicit
 * hourly rate. Money is handled in pence; each displayed component is
 * rounded to the nearest penny and the total is the sum of the rounded
 * components.
 */

import {
  type CalcError,
  calcError,
  parseNumber,
  poundsToPence,
} from "./workingHours";

export type OvertimeMode = "multiplier" | "rate";

export interface OvertimeInput {
  /** Standard hourly rate in pounds (raw string). */
  hourlyRate: string;
  /** Contracted weekly hours before overtime kicks in (raw string). */
  standardWeeklyHours: string;
  /** Hours actually worked this week (raw string). */
  actualHours: string;
  /** How overtime pay is defined. */
  mode: OvertimeMode;
  /** Multiplier of the standard rate, e.g. "1.5" (used in multiplier mode). */
  multiplier: string;
  /** Explicit overtime pay per hour (used in rate mode). */
  overtimeRate: string;
}

export interface OvertimeResult {
  ok: true;
  normalHours: number;
  overtimeHours: number;
  /** Effective overtime rate in pence/hour (may be fractional pence). */
  overtimeRatePence: number;
  normalPayPence: number;
  overtimePayPence: number;
  totalPence: number;
}

const MAX_WEEK_HOURS = 168;

export function calculateOvertime(
  input: OvertimeInput,
): OvertimeResult | CalcError {
  if (input.hourlyRate.trim() === "") {
    return calcError("rate", "Enter your standard hourly rate.", true);
  }
  const rate = parseNumber(input.hourlyRate);
  if (rate === null || rate <= 0) {
    return calcError("rate", "Hourly rate must be more than zero.");
  }
  const ratePence = poundsToPence(rate);

  if (input.standardWeeklyHours.trim() === "") {
    return calcError("standard", "Enter your standard weekly hours.", true);
  }
  const standard = parseNumber(input.standardWeeklyHours);
  if (standard === null || standard < 0) {
    return calcError("standard", "Standard hours must be 0 or more.");
  }
  if (standard > MAX_WEEK_HOURS) {
    return calcError(
      "standard",
      "Standard hours can't be more than 168 — there are only 168 hours in a week.",
    );
  }

  if (input.actualHours.trim() === "") {
    return calcError("actual", "Enter the hours you actually worked.", true);
  }
  const actual = parseNumber(input.actualHours);
  if (actual === null || actual < 0) {
    return calcError("actual", "Hours worked must be 0 or more.");
  }
  if (actual > MAX_WEEK_HOURS) {
    return calcError(
      "actual",
      "Hours worked can't be more than 168 — there are only 168 hours in a week.",
    );
  }

  let overtimeRatePence: number;
  if (input.mode === "multiplier") {
    if (input.multiplier.trim() === "") {
      return calcError(
        "multiplier",
        "Enter the overtime multiplier (e.g. 1.5).",
        true,
      );
    }
    const multiplier = parseNumber(input.multiplier);
    if (multiplier === null || multiplier < 1) {
      return calcError("multiplier", "Overtime multiplier must be 1 or more.");
    }
    overtimeRatePence = ratePence * multiplier;
  } else {
    if (input.overtimeRate.trim() === "") {
      return calcError(
        "overtimeRate",
        "Enter the overtime hourly rate.",
        true,
      );
    }
    const overtimeRate = parseNumber(input.overtimeRate);
    if (overtimeRate === null || overtimeRate <= 0) {
      return calcError("overtimeRate", "Overtime rate must be more than zero.");
    }
    overtimeRatePence = poundsToPence(overtimeRate);
  }

  const normalHours = Math.min(actual, standard);
  const overtimeHours = Math.max(0, actual - standard);

  const normalPayPence = Math.round(ratePence * normalHours);
  const overtimePayPence = Math.round(overtimeRatePence * overtimeHours);

  return {
    ok: true,
    normalHours,
    overtimeHours,
    overtimeRatePence,
    normalPayPence,
    overtimePayPence,
    totalPence: normalPayPence + overtimePayPence,
  };
}
