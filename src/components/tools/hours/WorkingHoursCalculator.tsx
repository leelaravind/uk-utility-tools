"use client";

import { useMemo, useRef, useState } from "react";

import {
  Button,
  CheckboxInput,
  CurrencyInput,
  NumberInput,
  ResultCard,
  TimeInput,
} from "@/components/ui";
import {
  calculateSingleShift,
  calculateWeeklyTotals,
  formatDecimalHours,
  formatHoursMinutes,
  formatPence,
} from "@/lib/calc/workingHours";

interface Row {
  id: number;
  start: string;
  end: string;
  breakMinutes: string;
  overnight: boolean;
}

const emptyRow = (id: number): Row => ({
  id,
  start: "",
  end: "",
  breakMinutes: "",
  overnight: false,
});

export function WorkingHoursCalculator() {
  const [mode, setMode] = useState<"single" | "weekly">("single");

  // Single shift
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [overnight, setOvernight] = useState(false);

  // Weekly timesheet
  const nextId = useRef(3);
  const [rows, setRows] = useState<Row[]>([
    { id: 1, start: "09:00", end: "17:00", breakMinutes: "30", overnight: false },
    emptyRow(2),
  ]);
  const [hourlyRate, setHourlyRate] = useState("");

  const single = useMemo(
    () => calculateSingleShift({ start, end, breakMinutes, overnight }),
    [start, end, breakMinutes, overnight],
  );

  const weekly = useMemo(
    () => calculateWeeklyTotals(rows, hourlyRate),
    [rows, hourlyRate],
  );

  const singleFieldError = (field: string): string | undefined =>
    !single.ok && !single.incomplete && single.field === field
      ? single.message
      : undefined;

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(nextId.current)]);
    nextId.current += 1;
  };

  const removeRow = (id: number) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="Calculator mode"
        className="flex flex-wrap gap-2"
      >
        <Button
          variant={mode === "single" ? "primary" : "secondary"}
          onClick={() => setMode("single")}
        >
          Single shift
        </Button>
        <Button
          variant={mode === "weekly" ? "primary" : "secondary"}
          onClick={() => setMode("weekly")}
        >
          Weekly timesheet
        </Button>
      </div>

      {mode === "single" ? (
        <>
          <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Shift times
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <TimeInput
                id="hours-start"
                label="Start"
                value={start}
                onChange={setStart}
                error={singleFieldError("start")}
              />
              <TimeInput
                id="hours-end"
                label="Finish"
                value={end}
                onChange={setEnd}
                error={singleFieldError("end")}
              />
              <NumberInput
                id="hours-break"
                label="Unpaid break"
                value={breakMinutes}
                onChange={setBreakMinutes}
                suffix="min"
                min={0}
                error={singleFieldError("break")}
              />
            </div>
            <CheckboxInput
              id="hours-overnight"
              label="Overnight shift"
              checked={overnight}
              onChange={setOvernight}
              hint="The finish time is on the next day — e.g. 22:00 to 06:00."
            />
          </div>

          {single.ok ? (
            <ResultCard
              live
              title="Time worked"
              primary={{
                label: "Paid time",
                value: formatHoursMinutes(single.paidMinutes),
              }}
              rows={[
                {
                  label: "Total elapsed time",
                  value: formatHoursMinutes(single.elapsedMinutes),
                },
                {
                  label: "Unpaid break",
                  value: formatHoursMinutes(single.breakMinutes),
                },
                {
                  label: "Paid time (decimal hours)",
                  value: `${formatDecimalHours(single.paidMinutes)} hrs`,
                  strong: true,
                },
              ]}
              footnote="Decimal hours are rounded to 2 decimal places — handy for timesheets and payroll systems."
            />
          ) : (
            <div
              aria-live="polite"
              className="rounded-card border border-border bg-surface-subtle p-5 text-sm text-muted"
            >
              {single.incomplete
                ? single.message
                : "Fix the highlighted field above to see the hours."}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              This week&apos;s shifts
            </h2>
            <p className="text-sm text-muted">
              Add a row per shift. Rows with no times are ignored.
            </p>
            <ol className="flex flex-col gap-5">
              {rows.map((row, index) => {
                const rowResult = weekly.rows[index];
                const blank = row.start === "" && row.end === "";
                const rowError =
                  rowResult && !rowResult.ok && !rowResult.incomplete && !blank
                    ? rowResult
                    : null;
                return (
                  <li
                    key={row.id}
                    className="rounded-field border border-border bg-surface-subtle p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Shift {index + 1}
                      </p>
                      {rows.length > 1 ? (
                        <Button
                          variant="ghost"
                          onClick={() => removeRow(row.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <TimeInput
                        id={`week-start-${row.id}`}
                        label="Start"
                        value={row.start}
                        onChange={(v) => updateRow(row.id, { start: v })}
                        error={
                          rowError?.field === "start"
                            ? rowError.message
                            : undefined
                        }
                      />
                      <TimeInput
                        id={`week-end-${row.id}`}
                        label="Finish"
                        value={row.end}
                        onChange={(v) => updateRow(row.id, { end: v })}
                        error={
                          rowError?.field === "end"
                            ? rowError.message
                            : undefined
                        }
                      />
                      <NumberInput
                        id={`week-break-${row.id}`}
                        label="Unpaid break"
                        value={row.breakMinutes}
                        onChange={(v) =>
                          updateRow(row.id, { breakMinutes: v })
                        }
                        suffix="min"
                        min={0}
                        error={
                          rowError?.field === "break"
                            ? rowError.message
                            : undefined
                        }
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <CheckboxInput
                        id={`week-overnight-${row.id}`}
                        label="Overnight"
                        checked={row.overnight}
                        onChange={(v) => updateRow(row.id, { overnight: v })}
                      />
                      {rowResult?.ok ? (
                        <p className="text-sm text-muted">
                          Paid:{" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {formatHoursMinutes(rowResult.paidMinutes)} (
                            {formatDecimalHours(rowResult.paidMinutes)} hrs)
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div>
              <Button variant="secondary" onClick={addRow}>
                + Add shift
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput
                id="week-rate"
                label="Hourly rate (optional)"
                value={hourlyRate}
                onChange={setHourlyRate}
                suffix="per hour"
                hint="Add a rate to price the week's paid hours."
                error={weekly.rateError}
              />
            </div>
          </div>

          <ResultCard
            live
            title="Weekly total"
            primary={{
              label: "Total paid time",
              value: formatHoursMinutes(weekly.totalPaidMinutes),
            }}
            rows={[
              {
                label: "Shifts counted",
                value: String(weekly.countedRows),
              },
              {
                label: "Total (decimal hours)",
                value: `${formatDecimalHours(weekly.totalPaidMinutes)} hrs`,
                strong: weekly.payPence === null,
              },
              ...(weekly.payPence !== null
                ? [
                    {
                      label: "Estimated gross pay",
                      value: formatPence(weekly.payPence),
                      strong: true,
                    },
                  ]
                : []),
            ]}
            footnote={
              weekly.hasRowErrors
                ? "Some rows have errors and are not included in the total — fix the highlighted fields."
                : "Rows without times are ignored. Pay is illustrative gross pay before tax and deductions."
            }
          />
        </>
      )}
    </div>
  );
}
