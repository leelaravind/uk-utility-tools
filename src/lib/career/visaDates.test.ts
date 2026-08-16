import { describe, expect, it } from "vitest";

import {
  buildIcs,
  calculateVisaCountdown,
  escapeIcsText,
  parseIsoDate,
  type VisaCountdown,
} from "./visaDates";

function okResult(
  start: string,
  expiry: string,
  today: string
): VisaCountdown {
  const result = calculateVisaCountdown(start, expiry, today);
  if (!result.ok) throw new Error(`Expected ok result, got: ${result.error}`);
  return result;
}

describe("parseIsoDate", () => {
  it("parses a valid ISO date to UTC midnight", () => {
    expect(parseIsoDate("2028-02-29")).toBe(Date.UTC(2028, 1, 29));
  });

  it("rejects impossible dates and bad formats", () => {
    expect(parseIsoDate("2027-02-30")).toBeNull();
    expect(parseIsoDate("2027-13-01")).toBeNull();
    expect(parseIsoDate("2027-00-10")).toBeNull();
    expect(parseIsoDate("20270101")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
  });

  it("rejects Feb 29 in a non-leap year but allows it in 2028", () => {
    expect(parseIsoDate("2027-02-29")).toBeNull();
    expect(parseIsoDate("2028-02-29")).not.toBeNull();
  });
});

describe("calculateVisaCountdown — countdown maths", () => {
  it("counts a full leap year as 366 days (2028)", () => {
    const r = okResult("2028-01-01", "2029-01-01", "2028-01-01");
    expect(r.totalDays).toBe(366);
    expect(r.daysRemaining).toBe(366);
    expect(r.daysElapsed).toBe(0);
    expect(r.percentElapsed).toBe(0);
    expect(r.status).toBe("active");
    expect(r.weeksApprox).toBe(52); // floor(366 / 7)
    expect(r.monthsApprox).toBe(12); // round(366 / 30.44)
  });

  it("crosses 29 February correctly", () => {
    // Feb 2028 has 29 days: 28 Feb → 1 Mar is 2 days.
    const r = okResult("2028-02-01", "2028-03-01", "2028-02-28");
    expect(r.totalDays).toBe(29);
    expect(r.daysRemaining).toBe(2);
    expect(r.daysElapsed).toBe(27);
    expect(r.percentElapsed).toBe(93.1); // round(27/29 × 1000) / 10
  });

  it("percentElapsed is exactly 0 on the start date", () => {
    const r = okResult("2027-06-01", "2027-12-01", "2027-06-01");
    expect(r.percentElapsed).toBe(0);
    expect(r.daysElapsed).toBe(0);
  });

  it("percentElapsed is exactly 100 on the expiry date, still active", () => {
    const r = okResult("2027-06-01", "2027-12-01", "2027-12-01");
    expect(r.percentElapsed).toBe(100);
    expect(r.daysRemaining).toBe(0);
    expect(r.status).toBe("active");
  });

  it("reports expired the day after expiry, clamped at 100% / 0 days", () => {
    const r = okResult("2027-06-01", "2027-12-01", "2027-12-02");
    expect(r.status).toBe("expired");
    expect(r.daysRemaining).toBe(0);
    expect(r.daysElapsed).toBe(r.totalDays);
    expect(r.percentElapsed).toBe(100);
  });

  it("reports future before the start date with 0% elapsed", () => {
    const r = okResult("2027-06-01", "2027-12-01", "2027-05-01");
    expect(r.status).toBe("future");
    expect(r.daysElapsed).toBe(0);
    expect(r.percentElapsed).toBe(0);
    // 1 May → 1 Dec 2027 = 31+30+31+31+30+31+30 = 214 days.
    expect(r.daysRemaining).toBe(214);
  });

  it("computes weeks and months approximations", () => {
    // 1 Jan → 11 Mar 2027 = 31 + 28 + 10 = 69 days remaining.
    const r = okResult("2027-01-01", "2027-03-11", "2027-01-01");
    expect(r.daysRemaining).toBe(69);
    expect(r.weeksApprox).toBe(9); // floor(69 / 7)
    expect(r.monthsApprox).toBe(2); // round(69 / 30.44) = round(2.27)
  });
});

describe("calculateVisaCountdown — validation", () => {
  it("rejects expiry on or before the start date", () => {
    const same = calculateVisaCountdown("2027-06-01", "2027-06-01", "2027-06-01");
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.error).toContain("after the start date");
    const before = calculateVisaCountdown("2027-06-01", "2027-05-01", "2027-06-01");
    expect(before.ok).toBe(false);
  });

  it("rejects invalid dates with a readable message", () => {
    const r = calculateVisaCountdown("2027-02-30", "2027-12-01", "2027-06-01");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("start date");
    const e = calculateVisaCountdown("2027-01-01", "nope", "2027-06-01");
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.error).toContain("expiry date");
  });
});

describe("escapeIcsText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("buildIcs", () => {
  const stamp = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
  const events = [
    {
      date: "2028-03-01",
      title: "Visa expires; renew, now",
      description: "Check UKVI guidance",
    },
    { date: "2027-12-01", title: "Reminder" },
  ];

  it("uses CRLF line endings exclusively", () => {
    const ics = buildIcs(events, stamp);
    expect(ics.endsWith("\r\n")).toBe(true);
    // No bare LF anywhere: every \n is preceded by \r.
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("has correctly paired BEGIN/END blocks", () => {
    const ics = buildIcs(events, stamp);
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(2);
    expect(lines.filter((l) => l === "END:VEVENT")).toHaveLength(2);
    expect(lines.filter((l) => l === "END:VCALENDAR")).toHaveLength(1);
    // END:VCALENDAR is the last content line.
    const content = lines.filter((l) => l.length > 0);
    expect(content[content.length - 1]).toBe("END:VCALENDAR");
  });

  it("writes all-day DTSTART/DTEND and the provided DTSTAMP", () => {
    const ics = buildIcs(events, stamp);
    expect(ics).toContain("DTSTART;VALUE=DATE:20280301");
    expect(ics).toContain("DTEND;VALUE=DATE:20280302"); // exclusive end, next day
    expect(ics).toContain("DTSTART;VALUE=DATE:20271201");
    expect(ics).toContain("DTSTAMP:20260102T030405Z");
  });

  it("escapes commas and semicolons in text fields", () => {
    const ics = buildIcs(events, stamp);
    expect(ics).toContain("SUMMARY:Visa expires\\; renew\\, now");
  });

  it("produces deterministic UIDs — identical input, identical output", () => {
    expect(buildIcs(events, stamp)).toBe(buildIcs(events, stamp));
    const uids = buildIcs(events, stamp)
      .split("\r\n")
      .filter((l) => l.startsWith("UID:"));
    expect(uids).toHaveLength(2);
    expect(uids[0]).not.toBe(uids[1]);
  });

  it("folds long lines with a leading-space continuation", () => {
    const longTitle = "Renew visa " + "very ".repeat(30) + "soon";
    const ics = buildIcs([{ date: "2027-12-01", title: longTitle }], stamp);
    expect(ics).toContain("\r\n "); // folded continuation line
    // Unfolding restores the full summary.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`SUMMARY:${longTitle}`);
  });

  it("throws readable errors for empty input and invalid dates", () => {
    expect(() => buildIcs([], stamp)).toThrowError(/at least one event/i);
    expect(() =>
      buildIcs([{ date: "2027-02-30", title: "Bad" }], stamp)
    ).toThrowError(/invalid event date/i);
  });
});
