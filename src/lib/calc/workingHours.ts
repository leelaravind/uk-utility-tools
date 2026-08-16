/**
 * Working hours calculations — single shifts and weekly timesheets.
 *
 * Also exports the shared parsing/formatting helpers used by the other
 * Work & Pay calculators (shift pay, overtime, holiday pay).
 *
 * All functions are pure and deterministic. User input arrives as raw
 * strings; parsing and validation happen here, and failures are returned
 * as typed error objects with human-readable messages — never thrown.
 */

/** A calculation failure with a message suitable for showing to the user. */
export interface CalcError {
  ok: false;
  /** Human-readable message, e.g. "Finish time must be after the start time…". */
  message: string;
  /** Which input the message belongs to, so the UI can attach it to a field. */
  field?: string;
  /**
   * True when the input is simply missing (empty field) rather than wrong.
   * The UI can show a gentle prompt instead of a red error.
   */
  incomplete?: boolean;
}

export function calcError(
  field: string,
  message: string,
  incomplete = false,
): CalcError {
  return { ok: false, message, field, incomplete };
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse "HH:MM" (24-hour) to minutes since midnight, or null if invalid.
 * Accepts "9:30" as well as "09:30".
 */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Parse a free-typed numeric string to a finite number, or null if invalid.
 * Commas and surrounding spaces are tolerated ("1,250.50" → 1250.5).
 * Empty strings return null — treat emptiness separately before calling.
 */
export function parseNumber(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Convert a pounds amount to integer pence (nearest penny). */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

/** Format integer pence as GBP, e.g. 10875 → "£108.75". */
export function formatPence(pence: number): string {
  return GBP.format(pence / 100);
}

/** Format minutes as "7h 30m" (rounded to the nearest minute). */
export function formatHoursMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const h = Math.floor(rounded / 60);
  const m = rounded - h * 60;
  return `${h}h ${m}m`;
}

/** Minutes → decimal hours rounded to 2 dp, e.g. 450 → 7.5, 440 → 7.33. */
export function minutesToDecimalHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Minutes → decimal-hours display string with 2 dp, e.g. "7.50". */
export function formatDecimalHours(minutes: number): string {
  return minutesToDecimalHours(minutes).toFixed(2);
}

/**
 * Format an hours quantity for display: up to 2 dp, trailing zeros
 * trimmed — 37.5 → "37.5", 5 → "5", 11.4665 → "11.47".
 */
export function formatHoursNumber(hours: number): string {
  return String(Math.round(hours * 100) / 100);
}

/* ------------------------------------------------------------------ */
/* Single shift                                                        */
/* ------------------------------------------------------------------ */

export interface SingleShiftInput {
  /** Start time "HH:MM" (24-hour). */
  start: string;
  /** Finish time "HH:MM" (24-hour). */
  end: string;
  /** Unpaid break in minutes, raw string; empty = 0. */
  breakMinutes: string;
  /** When true the finish time is on the following day. */
  overnight: boolean;
}

export interface SingleShiftResult {
  ok: true;
  /** Minutes since midnight on the shift's first day. */
  startMinute: number;
  /** Linear-timeline finish minute — exceeds 1440 for overnight shifts. */
  endMinute: number;
  elapsedMinutes: number;
  breakMinutes: number;
  paidMinutes: number;
  /** Paid time in decimal hours, rounded to 2 dp. */
  paidDecimalHours: number;
}

/**
 * Work out elapsed and paid time for one shift.
 *
 * Overnight rule: with `overnight` on, the finish time is on the next day,
 * so 22:00 → 06:00 is 8 hours. A shift may not exceed 24 hours.
 */
export function calculateSingleShift(
  input: SingleShiftInput,
): SingleShiftResult | CalcError {
  if (input.start.trim() === "") {
    return calcError("start", "Enter a start time.", true);
  }
  const startMinute = parseTimeToMinutes(input.start);
  if (startMinute === null) {
    return calcError("start", "Enter the start time as HH:MM (24-hour).");
  }

  if (input.end.trim() === "") {
    return calcError("end", "Enter a finish time.", true);
  }
  const endRaw = parseTimeToMinutes(input.end);
  if (endRaw === null) {
    return calcError("end", "Enter the finish time as HH:MM (24-hour).");
  }

  let breakMinutes = 0;
  if (input.breakMinutes.trim() !== "") {
    const parsed = parseNumber(input.breakMinutes);
    if (parsed === null || parsed < 0) {
      return calcError(
        "break",
        "Break minutes must be a number of 0 or more.",
      );
    }
    breakMinutes = parsed;
  }

  let endMinute: number;
  if (input.overnight) {
    endMinute = endRaw + 1440;
    if (endMinute - startMinute > 1440) {
      return calcError(
        "end",
        "An overnight shift can't be longer than 24 hours — check the times, or turn off overnight.",
      );
    }
  } else {
    if (endRaw <= startMinute) {
      return calcError(
        "end",
        "Finish time must be after the start time, or turn on overnight shift.",
      );
    }
    endMinute = endRaw;
  }

  const elapsedMinutes = endMinute - startMinute;
  if (breakMinutes >= elapsedMinutes) {
    return calcError(
      "break",
      "The unpaid break must be shorter than the shift itself.",
    );
  }

  const paidMinutes = elapsedMinutes - breakMinutes;
  return {
    ok: true,
    startMinute,
    endMinute,
    elapsedMinutes,
    breakMinutes,
    paidMinutes,
    paidDecimalHours: minutesToDecimalHours(paidMinutes),
  };
}

/* ------------------------------------------------------------------ */
/* Weekly timesheet                                                    */
/* ------------------------------------------------------------------ */

export interface WeeklyRowInput {
  start: string;
  end: string;
  breakMinutes: string;
  overnight: boolean;
}

export type WeeklyRowResult = SingleShiftResult | CalcError;

export interface WeeklyResult {
  ok: true;
  /** One result per input row, in order. Blank rows come back incomplete. */
  rows: WeeklyRowResult[];
  /** How many rows were valid and counted in the totals. */
  countedRows: number;
  /** True when at least one non-blank row has a real (non-incomplete) error. */
  hasRowErrors: boolean;
  totalPaidMinutes: number;
  totalDecimalHours: number;
  /** Estimated gross pay in pence, or null when no rate was entered. */
  payPence: number | null;
  /** Set when the hourly rate was entered but couldn't be used. */
  rateError?: string;
}

/**
 * Total up a week of shifts. Rows where both times are empty are treated
 * as blank and skipped; rows with errors are excluded from the totals but
 * reported so the UI can flag them.
 */
export function calculateWeeklyTotals(
  rows: WeeklyRowInput[],
  hourlyRate: string,
): WeeklyResult {
  const results: WeeklyRowResult[] = rows.map((row) =>
    calculateSingleShift(row),
  );

  let totalPaidMinutes = 0;
  let countedRows = 0;
  let hasRowErrors = false;
  for (const r of results) {
    if (r.ok) {
      totalPaidMinutes += r.paidMinutes;
      countedRows += 1;
    } else if (!r.incomplete) {
      hasRowErrors = true;
    }
  }

  let payPence: number | null = null;
  let rateError: string | undefined;
  if (hourlyRate.trim() !== "") {
    const rate = parseNumber(hourlyRate);
    if (rate === null || rate < 0) {
      rateError = "Hourly rate must be a number of £0 or more.";
    } else {
      payPence = Math.round((poundsToPence(rate) * totalPaidMinutes) / 60);
    }
  }

  return {
    ok: true,
    rows: results,
    countedRows,
    hasRowErrors,
    totalPaidMinutes,
    totalDecimalHours: minutesToDecimalHours(totalPaidMinutes),
    payPence,
    rateError,
  };
}
