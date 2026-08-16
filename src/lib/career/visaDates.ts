/**
 * Visa date countdown maths + ICS (RFC 5545) calendar reminder builder.
 *
 * Date calculations only — this is emphatically NOT immigration advice.
 * All functions are pure and take explicit date parameters (never
 * Date.now()/new Date() internally) so they are fully deterministic.
 *
 * Civil dates are handled as 'YYYY-MM-DD' strings interpreted at UTC
 * midnight, so day arithmetic is exact and timezone-independent.
 */

export type VisaStatus = "future" | "active" | "expired";

export interface VisaCountdown {
  ok: true;
  status: VisaStatus;
  /** Whole days from start to expiry. */
  totalDays: number;
  /** Whole days from start to today, clamped to 0…totalDays. */
  daysElapsed: number;
  /** Whole days from today to expiry, floored at 0 once expired. */
  daysRemaining: number;
  /** floor(daysRemaining / 7). */
  weeksApprox: number;
  /** round(daysRemaining / 30.44) — average month length. */
  monthsApprox: number;
  /** 0–100, one decimal place: daysElapsed / totalDays. */
  percentElapsed: number;
}

export interface VisaCountdownError {
  ok: false;
  error: string;
}

const MS_PER_DAY = 86_400_000;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse 'YYYY-MM-DD' to UTC-midnight ms, or null when invalid. */
export function parseIsoDate(value: string): number | null {
  const m = ISO_DATE_RE.exec(value.trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  // Round-trip check rejects impossible dates like 2027-02-30.
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

/** Whole days from a to b (b − a). Inputs are UTC-midnight ms. */
function daysBetween(aMs: number, bMs: number): number {
  return Math.round((bMs - aMs) / MS_PER_DAY);
}

/**
 * Core countdown maths.
 *
 * Status convention: the visa counts as 'active' on the expiry date itself
 * (most UK visas are valid until the end of the stated expiry day) and
 * 'expired' from the day after.
 */
export function calculateVisaCountdown(
  startDate: string,
  expiryDate: string,
  today: string
): VisaCountdown | VisaCountdownError {
  const startMs = parseIsoDate(startDate);
  if (startMs === null) {
    return { ok: false, error: "Enter a valid visa start date." };
  }
  const expiryMs = parseIsoDate(expiryDate);
  if (expiryMs === null) {
    return { ok: false, error: "Enter a valid visa expiry date." };
  }
  const todayMs = parseIsoDate(today);
  if (todayMs === null) {
    return { ok: false, error: "Enter a valid date for today." };
  }
  if (expiryMs <= startMs) {
    return {
      ok: false,
      error: "The expiry date must be after the start date.",
    };
  }

  const totalDays = daysBetween(startMs, expiryMs);
  const rawElapsed = daysBetween(startMs, todayMs);
  const daysElapsed = Math.max(0, Math.min(totalDays, rawElapsed));
  const daysRemaining = Math.max(0, daysBetween(todayMs, expiryMs));

  let status: VisaStatus;
  if (todayMs < startMs) status = "future";
  else if (todayMs > expiryMs) status = "expired";
  else status = "active";

  const percentElapsed =
    Math.round((daysElapsed / totalDays) * 1000) / 10;

  return {
    ok: true,
    status,
    totalDays,
    daysElapsed,
    daysRemaining,
    weeksApprox: Math.floor(daysRemaining / 7),
    monthsApprox: Math.round(daysRemaining / 30.44),
    percentElapsed,
  };
}

/* ------------------------------------------------------------------ */
/* ICS builder (RFC 5545)                                              */
/* ------------------------------------------------------------------ */

export interface IcsEvent {
  /** All-day event date, 'YYYY-MM-DD'. */
  date: string;
  title: string;
  description?: string;
}

/** Escape text per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Deterministic djb2 hash, hex-encoded — used to build stable UIDs. */
function djb2Hex(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/** Fold a content line at 74 octets with a leading space (RFC 5545 §3.1). */
function foldLine(line: string): string[] {
  if (line.length <= 74) return [line];
  const parts: string[] = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest.length > 0) parts.push(" " + rest);
  return parts;
}

function toBasicDate(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${mo}${day}`;
}

function toBasicDateTime(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

/**
 * Build an RFC 5545 VCALENDAR string of all-day VEVENTs.
 *
 * - CRLF line endings throughout, lines folded at 74 octets.
 * - DTSTART;VALUE=DATE / exclusive DTEND (next day).
 * - UIDs are deterministic hashes of each event's date+title+description,
 *   so re-generating the same reminder produces the same UID (calendars
 *   then update rather than duplicate).
 * - dtStamp is passed in by the caller (kept pure — no Date.now() here).
 *
 * Invalid event dates produce a thrown Error with a readable message;
 * callers should validate first via parseIsoDate.
 */
export function buildIcs(events: IcsEvent[], dtStamp: Date): string {
  if (events.length === 0) {
    throw new Error("At least one event is required to build a calendar file.");
  }

  const stamp = toBasicDateTime(dtStamp);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UK Utility Tools//Visa Dates//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const ms = parseIsoDate(event.date);
    if (ms === null) {
      throw new Error(`Invalid event date: "${event.date}".`);
    }
    const uid = `${djb2Hex(
      `${event.date}|${event.title}|${event.description ?? ""}`
    )}-${toBasicDate(ms)}@uk-utility-tools`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toBasicDate(ms)}`);
    lines.push(`DTEND;VALUE=DATE:${toBasicDate(ms + MS_PER_DAY)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const folded: string[] = [];
  for (const line of lines) folded.push(...foldLine(line));
  return folded.join("\r\n") + "\r\n";
}
