/**
 * Shift pay calculation — base pay, night premium, weekend premium and
 * overtime uplift for a single shift, with overnight support.
 *
 * Conventions (documented on the tool page):
 * - Times sit on a linear minute timeline starting at midnight on the
 *   shift's first day; overnight shifts extend past minute 1440. Night
 *   windows repeat daily and may themselves wrap midnight, so overlap is
 *   computed against window instances over up to 48 hours of timeline.
 * - Break rule: unpaid break minutes reduce the night-premium-eligible
 *   minutes in proportion to the shift's night share. Eligible night
 *   minutes = raw night overlap × (paid minutes ÷ elapsed minutes).
 * - Weekend premium applies to all paid minutes when the shift is marked
 *   as a weekend shift.
 * - Overtime: paid minutes beyond the threshold earn base rate ×
 *   multiplier; the uplift shown is only the extra above base pay.
 *   Premiums are not multiplied.
 * - Money is handled in integer pence. Each displayed component is
 *   rounded to the nearest penny and the total is the sum of the rounded
 *   components, so the breakdown always adds up.
 */

import {
  type CalcError,
  calcError,
  calculateSingleShift,
  parseNumber,
  parseTimeToMinutes,
  poundsToPence,
} from "./workingHours";

export interface ShiftPayInput {
  /** Shift start "HH:MM" (24-hour). */
  start: string;
  /** Shift finish "HH:MM" (24-hour). */
  end: string;
  /** Finish time is on the following day. */
  overnight: boolean;
  /** Unpaid break in minutes (raw string; empty = 0). */
  breakMinutes: string;
  /** Base hourly rate in pounds (raw string). */
  hourlyRate: string;

  /** Night premium on/off. */
  nightPremium: boolean;
  /** Extra £/hour paid during the night window (raw string). */
  nightRate: string;
  /** Night window start "HH:MM" — default 22:00. */
  nightStart: string;
  /** Night window end "HH:MM" — default 06:00. May wrap midnight. */
  nightEnd: string;

  /** Whole shift counts as a weekend shift. */
  weekendShift: boolean;
  /** Extra £/hour for weekend shifts (raw string). */
  weekendRate: string;

  /** Overtime on/off. */
  overtime: boolean;
  /** Paid hours beyond this threshold count as overtime (raw string). */
  overtimeThresholdHours: string;
  /** Overtime multiplier, e.g. "1.5" (raw string). */
  overtimeMultiplier: string;
}

export interface ShiftPayResult {
  ok: true;
  elapsedMinutes: number;
  breakMinutes: number;
  paidMinutes: number;
  /** Raw overlap between the shift span and the night window(s). */
  nightOverlapMinutes: number;
  /** Night minutes actually paid the premium, after the break rule. */
  nightEligibleMinutes: number;
  overtimeMinutes: number;
  basePayPence: number;
  nightPremiumPence: number;
  weekendPremiumPence: number;
  overtimeUpliftPence: number;
  totalPence: number;
}

/**
 * Minutes of overlap between a shift span and a daily-repeating window.
 *
 * @param shiftStart minutes since midnight day 0 (0–1439)
 * @param shiftEnd   linear-timeline finish minute (may exceed 1440)
 * @param windowStart window start, minutes since midnight (0–1439)
 * @param windowEnd   window end, minutes since midnight (0–1439);
 *                    a window with end <= start wraps midnight.
 *                    windowStart === windowEnd means a zero-length window.
 */
export function nightOverlapMinutes(
  shiftStart: number,
  shiftEnd: number,
  windowStart: number,
  windowEnd: number,
): number {
  if (windowStart === windowEnd) return 0;

  let overlap = 0;
  // Window instances for days -1..2 cover any shift span within the
  // 48-hour timeline used here (shift end <= 2880).
  for (let day = -1; day <= 2; day++) {
    const ws = windowStart + day * 1440;
    const we =
      windowEnd > windowStart
        ? windowEnd + day * 1440
        : windowEnd + (day + 1) * 1440; // window wraps midnight
    overlap += Math.max(0, Math.min(shiftEnd, we) - Math.max(shiftStart, ws));
  }
  return overlap;
}

export function calculateShiftPay(
  input: ShiftPayInput,
): ShiftPayResult | CalcError {
  const shift = calculateSingleShift({
    start: input.start,
    end: input.end,
    breakMinutes: input.breakMinutes,
    overnight: input.overnight,
  });
  if (!shift.ok) return shift;

  // Base hourly rate
  if (input.hourlyRate.trim() === "") {
    return calcError(
      "rate",
      "Enter your hourly rate to see the estimate.",
      true,
    );
  }
  const rate = parseNumber(input.hourlyRate);
  if (rate === null || rate <= 0) {
    return calcError("rate", "Hourly rate must be more than £0.");
  }
  const ratePence = poundsToPence(rate);

  // Night premium
  let nightOverlap = 0;
  let nightEligible = 0;
  let nightRatePence = 0;
  if (input.nightPremium) {
    if (input.nightRate.trim() === "") {
      return calcError(
        "nightRate",
        "Enter the night premium in £ per hour (0 if none).",
        true,
      );
    }
    const nightRate = parseNumber(input.nightRate);
    if (nightRate === null || nightRate < 0) {
      return calcError("nightRate", "Night premium must be £0 or more.");
    }
    nightRatePence = poundsToPence(nightRate);

    const ws = parseTimeToMinutes(input.nightStart);
    const we = parseTimeToMinutes(input.nightEnd);
    if (ws === null) {
      return calcError(
        "nightStart",
        "Enter the night window start as HH:MM (24-hour).",
      );
    }
    if (we === null) {
      return calcError(
        "nightEnd",
        "Enter the night window end as HH:MM (24-hour).",
      );
    }
    if (ws === we) {
      return calcError(
        "nightEnd",
        "The night window start and end can't be the same time.",
      );
    }

    nightOverlap = nightOverlapMinutes(
      shift.startMinute,
      shift.endMinute,
      ws,
      we,
    );
    // Break rule: breaks reduce eligible night minutes proportionally
    // to the shift's night share.
    nightEligible =
      nightOverlap * (shift.paidMinutes / shift.elapsedMinutes);
  }

  // Weekend premium
  let weekendRatePence = 0;
  if (input.weekendShift) {
    if (input.weekendRate.trim() === "") {
      return calcError(
        "weekendRate",
        "Enter the weekend premium in £ per hour (0 if none).",
        true,
      );
    }
    const weekendRate = parseNumber(input.weekendRate);
    if (weekendRate === null || weekendRate < 0) {
      return calcError("weekendRate", "Weekend premium must be £0 or more.");
    }
    weekendRatePence = poundsToPence(weekendRate);
  }

  // Overtime
  let overtimeMinutes = 0;
  let multiplier = 1;
  if (input.overtime) {
    if (input.overtimeThresholdHours.trim() === "") {
      return calcError(
        "overtimeThreshold",
        "Enter the overtime threshold in hours.",
        true,
      );
    }
    const threshold = parseNumber(input.overtimeThresholdHours);
    if (threshold === null || threshold < 0) {
      return calcError(
        "overtimeThreshold",
        "Overtime threshold must be 0 hours or more.",
      );
    }
    if (input.overtimeMultiplier.trim() === "") {
      return calcError(
        "overtimeMultiplier",
        "Enter the overtime multiplier (e.g. 1.5).",
        true,
      );
    }
    const parsedMultiplier = parseNumber(input.overtimeMultiplier);
    if (parsedMultiplier === null || parsedMultiplier < 1) {
      return calcError(
        "overtimeMultiplier",
        "Overtime multiplier must be 1 or more.",
      );
    }
    multiplier = parsedMultiplier;
    overtimeMinutes = Math.max(0, shift.paidMinutes - threshold * 60);
  }

  const basePayPence = Math.round((ratePence * shift.paidMinutes) / 60);
  const nightPremiumPence = Math.round((nightRatePence * nightEligible) / 60);
  const weekendPremiumPence = Math.round(
    (weekendRatePence * shift.paidMinutes) / 60,
  );
  const overtimeUpliftPence = Math.round(
    (ratePence * (multiplier - 1) * overtimeMinutes) / 60,
  );
  const totalPence =
    basePayPence + nightPremiumPence + weekendPremiumPence + overtimeUpliftPence;

  return {
    ok: true,
    elapsedMinutes: shift.elapsedMinutes,
    breakMinutes: shift.breakMinutes,
    paidMinutes: shift.paidMinutes,
    nightOverlapMinutes: nightOverlap,
    nightEligibleMinutes: nightEligible,
    overtimeMinutes,
    basePayPence,
    nightPremiumPence,
    weekendPremiumPence,
    overtimeUpliftPence,
    totalPence,
  };
}
