"use client";

import { useMemo, useState } from "react";

import { Button, DateInput, ResultCard } from "@/components/ui";
import {
  buildIcs,
  calculateVisaCountdown,
  parseIsoDate,
  type VisaCountdown,
} from "@/lib/career/visaDates";

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatIsoLong(iso: string): string {
  const ms = parseIsoDate(iso);
  return ms === null ? iso : LONG_DATE.format(new Date(ms));
}

function plural(n: number, unit: string): string {
  return `${n.toLocaleString("en-GB")} ${unit}${n === 1 ? "" : "s"}`;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function VisaDatesTool() {
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [today] = useState(() => new Date());
  const todayIso = toLocalIsoDate(today);

  const outcome = useMemo(() => {
    if (!startDate || !expiryDate) return null;
    return calculateVisaCountdown(startDate, expiryDate, todayIso);
  }, [startDate, expiryDate, todayIso]);

  const countdown: VisaCountdown | null =
    outcome && outcome.ok ? outcome : null;
  const calcError = outcome && !outcome.ok ? outcome.error : undefined;

  const startError =
    calcError && calcError.includes("start date") && !calcError.includes("after")
      ? calcError
      : undefined;
  const expiryError =
    calcError && !startError ? calcError : undefined;

  const reminderMs = reminderDate ? parseIsoDate(reminderDate) : null;
  const expiryMs = expiryDate ? parseIsoDate(expiryDate) : null;
  const reminderError =
    reminderDate && reminderMs === null
      ? "Enter a valid reminder date."
      : reminderDate &&
          reminderMs !== null &&
          expiryMs !== null &&
          reminderMs >= expiryMs
        ? "Pick a reminder date before the visa expiry date."
        : undefined;

  const reminderDaysBefore =
    reminderMs !== null && expiryMs !== null && reminderMs < expiryMs
      ? Math.round((expiryMs - reminderMs) / 86_400_000)
      : null;

  function downloadExpiryIcs() {
    if (!expiryDate || expiryMs === null) return;
    const ics = buildIcs(
      [
        {
          date: expiryDate,
          title: "Visa expiry date",
          description:
            "Visa expiry date entered in the UK Utility Tools visa date calculator. Check the exact date on your BRP/eVisa and official UKVI guidance well before today.",
        },
      ],
      new Date()
    );
    downloadFile("visa-expiry.ics", ics);
  }

  function downloadReminderIcs() {
    if (!reminderDate || reminderMs === null || reminderError) return;
    const ics = buildIcs(
      [
        {
          date: reminderDate,
          title:
            reminderDaysBefore !== null
              ? `Visa reminder — ${plural(reminderDaysBefore, "day")} until expiry`
              : "Visa reminder",
          description:
            "Reminder created with the UK Utility Tools visa date calculator. Check renewal or extension options on the official UKVI website.",
        },
      ],
      new Date()
    );
    downloadFile("visa-reminder.ics", ics);
  }

  const primaryValue = countdown
    ? countdown.status === "expired"
      ? "Expired"
      : plural(countdown.daysRemaining, "day")
    : "";

  const statusText = countdown
    ? countdown.status === "active"
      ? "Active"
      : countdown.status === "future"
        ? "Not started yet"
        : "Expired"
    : "";

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2.5 rounded-field border border-accent-soft-border bg-accent-soft p-3.5 text-sm font-medium leading-relaxed text-accent-emphasis">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        Date calculator only — not immigration advice. Always check your
        BRP/eVisa and official UKVI guidance.
      </p>

      <div className="grid gap-5 sm:grid-cols-3">
        <DateInput
          id="visa-start"
          label="Visa start date"
          value={startDate}
          onChange={setStartDate}
          error={startError}
          hint="The 'valid from' date."
        />
        <DateInput
          id="visa-expiry"
          label="Visa expiry date"
          value={expiryDate}
          onChange={setExpiryDate}
          error={expiryError}
          hint="The 'valid until' date."
        />
        <DateInput
          id="visa-reminder"
          label="Reminder date (optional)"
          value={reminderDate}
          onChange={setReminderDate}
          error={reminderError}
          hint="e.g. 3 months before expiry."
        />
      </div>

      {!countdown ? (
        !calcError ? (
          <p className="rounded-field border border-border bg-surface-subtle p-4 text-sm text-muted">
            Enter the visa start and expiry dates — the countdown appears
            automatically.
          </p>
        ) : null
      ) : (
        <>
          <ResultCard
            live
            title="Countdown"
            primary={{
              label:
                countdown.status === "future"
                  ? "Days until the visa expires"
                  : "Days remaining on the visa",
              value: primaryValue,
            }}
            rows={[
              { label: "Status", value: statusText },
              {
                label: "Roughly",
                value: `${plural(countdown.weeksApprox, "week")} · about ${plural(
                  countdown.monthsApprox,
                  "month"
                )}`,
              },
              {
                label: "Days used",
                value: `${countdown.daysElapsed.toLocaleString("en-GB")} of ${countdown.totalDays.toLocaleString("en-GB")}`,
              },
              {
                label: "Period elapsed",
                value: `${countdown.percentElapsed}%`,
                strong: true,
              },
            ]}
            footnote="Illustrative date maths only. The visa is treated as valid up to and including the expiry date — check your own documents for the exact conditions."
          >
            <div className="mt-5">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={countdown.percentElapsed}
                aria-label="Percentage of the visa period elapsed"
                className="h-3 w-full overflow-hidden rounded-full border border-accent-soft-border bg-surface"
              >
                <div
                  className="h-full rounded-full bg-accent-solid transition-all"
                  style={{ width: `${countdown.percentElapsed}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {countdown.percentElapsed}% of the visa period has elapsed.
              </p>
            </div>
          </ResultCard>

          <section aria-labelledby="key-dates-heading">
            <h2
              id="key-dates-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Key dates
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-field border border-border bg-surface p-3">
                <span className="text-sm text-muted">Visa starts</span>
                <span className="text-sm font-medium text-foreground">
                  {formatIsoLong(startDate)}
                </span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-field border border-border bg-surface p-3">
                <span className="text-sm text-muted">Visa expires</span>
                <span className="text-sm font-medium text-foreground">
                  {formatIsoLong(expiryDate)}
                </span>
              </li>
              {reminderDate && !reminderError ? (
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-field border border-border bg-surface p-3">
                  <span className="text-sm text-muted">
                    Your reminder
                    {reminderDaysBefore !== null
                      ? ` (${plural(reminderDaysBefore, "day")} before expiry)`
                      : ""}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formatIsoLong(reminderDate)}
                  </span>
                </li>
              ) : null}
            </ul>
          </section>

          <section aria-labelledby="reminders-heading">
            <h2
              id="reminders-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Calendar reminders
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Download an .ics file and open it to add the date to Google
              Calendar, Outlook or Apple Calendar. Files are generated on your
              device.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={downloadExpiryIcs}>
                Download expiry reminder (.ics)
              </Button>
              {reminderDate && !reminderError ? (
                <Button variant="secondary" onClick={downloadReminderIcs}>
                  Download custom reminder (.ics)
                </Button>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
