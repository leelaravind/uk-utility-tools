"use client";

import { useMemo, useState } from "react";

import {
  Button,
  CurrencyInput,
  NumberInput,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import {
  ACCRUAL_PERCENT,
  calculateHolidayValue,
  calculateIrregularHoliday,
  calculateRegularHoliday,
} from "@/lib/calc/holidayPay";
import { formatHoursNumber, formatPence } from "@/lib/calc/workingHours";

const UNIT_OPTIONS = [
  { value: "days", label: "days" },
  { value: "hours", label: "hours" },
];

export function HolidayPayCalculator() {
  const [mode, setMode] = useState<"regular" | "irregular">("regular");

  // Regular hours mode
  const [hourlyRate, setHourlyRate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("37.5");
  const [daysPerWeek, setDaysPerWeek] = useState("5");

  // Quick "value of X holiday" calc (shares the hourly rate)
  const [valueAmount, setValueAmount] = useState("");
  const [valueUnit, setValueUnit] = useState<"days" | "hours">("days");
  const [valueHoursPerDay, setValueHoursPerDay] = useState("7.5");

  // Irregular hours mode
  const [grossPay, setGrossPay] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");

  const regular = useMemo(
    () => calculateRegularHoliday({ hourlyRate, weeklyHours, daysPerWeek }),
    [hourlyRate, weeklyHours, daysPerWeek],
  );

  const quickValue = useMemo(
    () =>
      calculateHolidayValue({
        hourlyRate,
        amount: valueAmount,
        unit: valueUnit,
        hoursPerDay: valueHoursPerDay,
      }),
    [hourlyRate, valueAmount, valueUnit, valueHoursPerDay],
  );

  const irregular = useMemo(
    () => calculateIrregularHoliday({ grossPay, hoursWorked }),
    [grossPay, hoursWorked],
  );

  const regularError = (field: string): string | undefined =>
    !regular.ok && !regular.incomplete && regular.field === field
      ? regular.message
      : undefined;

  const irregularError = (field: string): string | undefined =>
    !irregular.ok && !irregular.incomplete && irregular.field === field
      ? irregular.message
      : undefined;

  const quickValueError = (field: string): string | undefined =>
    !quickValue.ok && !quickValue.incomplete && quickValue.field === field
      ? quickValue.message
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="How you work"
        className="flex flex-wrap gap-2"
      >
        <Button
          variant={mode === "regular" ? "primary" : "secondary"}
          onClick={() => setMode("regular")}
        >
          Regular hours
        </Button>
        <Button
          variant={mode === "irregular" ? "primary" : "secondary"}
          onClick={() => setMode("irregular")}
        >
          Irregular / casual hours
        </Button>
      </div>

      {mode === "regular" ? (
        <>
          <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Your working pattern
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <CurrencyInput
                id="hol-rate"
                label="Hourly rate"
                value={hourlyRate}
                onChange={setHourlyRate}
                suffix="per hour"
                placeholder="12.71"
                error={regularError("rate")}
              />
              <NumberInput
                id="hol-weekly-hours"
                label="Hours per week"
                value={weeklyHours}
                onChange={setWeeklyHours}
                suffix="hours"
                min={0}
                error={regularError("weeklyHours")}
              />
              <NumberInput
                id="hol-days-per-week"
                label="Days per week"
                value={daysPerWeek}
                onChange={setDaysPerWeek}
                suffix="days"
                min={0}
                max={7}
                hint="Part days like 4.5 are fine."
                error={regularError("daysPerWeek")}
              />
            </div>
          </div>

          {regular.ok ? (
            <ResultCard
              live
              title="Statutory minimum (5.6 weeks)"
              primary={{
                label: "Estimated annual holiday entitlement",
                value: `${formatHoursNumber(regular.entitlementHours)} hours`,
              }}
              rows={[
                {
                  label: "In days",
                  value: regular.capApplied
                    ? `28 days (capped from ${formatHoursNumber(regular.uncappedDays)})`
                    : `${formatHoursNumber(regular.entitlementDays)} days`,
                },
                {
                  label: "Hours per working day",
                  value: `${formatHoursNumber(regular.dailyHours)} hrs`,
                },
                {
                  label: "Estimated value at your rate",
                  value: formatPence(regular.entitlementPayPence),
                  strong: true,
                },
              ]}
              footnote="5.6 weeks × your working pattern, capped at 28 days. Bank holidays can count towards this minimum, and your contract may give you more."
            />
          ) : (
            <div
              aria-live="polite"
              className="rounded-card border border-border bg-surface-subtle p-5 text-sm text-muted"
            >
              {regular.incomplete
                ? regular.message
                : "Fix the highlighted field above to see your estimated entitlement."}
            </div>
          )}

          <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              What is some holiday worth?
            </h2>
            <p className="text-sm text-muted">
              Value a specific amount of holiday at the hourly rate entered
              above.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberInput
                id="hol-value-amount"
                label="Amount of holiday"
                value={valueAmount}
                onChange={setValueAmount}
                min={0}
                placeholder="5"
                error={quickValueError("valueAmount")}
              />
              <SelectInput
                id="hol-value-unit"
                label="Days or hours"
                value={valueUnit}
                onChange={(v) => setValueUnit(v === "hours" ? "hours" : "days")}
                options={UNIT_OPTIONS}
              />
              {valueUnit === "days" ? (
                <NumberInput
                  id="hol-value-hours-per-day"
                  label="Hours per working day"
                  value={valueHoursPerDay}
                  onChange={setValueHoursPerDay}
                  suffix="hours"
                  min={0}
                  error={quickValueError("valueHoursPerDay")}
                />
              ) : null}
            </div>
            <p aria-live="polite" className="text-sm text-muted">
              {quickValue.ok && valueAmount.trim() !== "" ? (
                <>
                  {valueAmount.trim()} {valueUnit} ={" "}
                  <span className="font-medium text-foreground">
                    {formatHoursNumber(quickValue.hours)} hours
                  </span>{" "}
                  ≈{" "}
                  <span className="font-semibold text-foreground">
                    {formatPence(quickValue.payPence)}
                  </span>{" "}
                  gross
                </>
              ) : !quickValue.ok &&
                valueAmount.trim() !== "" &&
                quickValue.message ? (
                quickValue.message
              ) : (
                "Enter an amount and your hourly rate to see its estimated value."
              )}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Your recent earnings
            </h2>
            <p className="text-sm text-muted">
              For irregular-hours and part-year workers, holiday builds up at{" "}
              {ACCRUAL_PERCENT}% of the hours you work in each pay period.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput
                id="hol-gross"
                label="Gross pay in the period"
                value={grossPay}
                onChange={setGrossPay}
                placeholder="1,200"
                hint="Wages before tax for the period — e.g. the last month."
                error={irregularError("grossPay")}
              />
              <NumberInput
                id="hol-hours-worked"
                label="Hours worked (optional)"
                value={hoursWorked}
                onChange={setHoursWorked}
                suffix="hours"
                min={0}
                hint="Add hours to estimate accrued holiday hours too."
                error={irregularError("hoursWorked")}
              />
            </div>
          </div>

          {irregular.ok ? (
            <ResultCard
              live
              title={`${ACCRUAL_PERCENT}% accrual`}
              primary={{
                label: "Estimated accrued holiday pay",
                value: formatPence(irregular.accruedPayPence),
              }}
              rows={[
                {
                  label: "Accrual rate",
                  value: `${ACCRUAL_PERCENT}% of pay`,
                },
                ...(irregular.accruedHoursRounded !== null &&
                irregular.accruedHoursExact !== null
                  ? [
                      {
                        label: "Accrued holiday hours",
                        value: `≈ ${irregular.accruedHoursRounded} hours (${formatHoursNumber(irregular.accruedHoursExact)} exact)`,
                      },
                    ]
                  : []),
              ]}
              footnote="12.07% is the statutory accrual rate for irregular-hours and part-year workers (leave years starting on or after 1 April 2024). Accrued hours are rounded to the nearest whole hour, as the rules require."
            />
          ) : (
            <div
              aria-live="polite"
              className="rounded-card border border-border bg-surface-subtle p-5 text-sm text-muted"
            >
              {irregular.incomplete
                ? irregular.message
                : "Fix the highlighted field above to see your estimate."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
