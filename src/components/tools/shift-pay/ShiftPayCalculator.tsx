"use client";

import { useMemo, useState } from "react";

import {
  Button,
  CheckboxInput,
  CurrencyInput,
  CurrencySelect,
  NumberInput,
  ResultCard,
  SelectInput,
  TimeInput,
} from "@/components/ui";
import { calculateShiftPay } from "@/lib/calc/shiftPay";
import {
  formatDecimalHours,
  formatHoursMinutes,
} from "@/lib/calc/workingHours";
import { currencySymbol, formatCurrencyFromMinor } from "@/lib/currency";
import { useCurrencyPreference } from "@/lib/useCurrencyPreference";

const MULTIPLIER_OPTIONS = [
  { value: "1", label: "1× (no uplift)" },
  { value: "1.25", label: "1.25×" },
  { value: "1.5", label: "1.5× (time and a half)" },
  { value: "2", label: "2× (double time)" },
  { value: "custom", label: "Custom…" },
];

export function ShiftPayCalculator() {
  const [currency, setCurrency] = useCurrencyPreference();
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const [overnight, setOvernight] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [hourlyRate, setHourlyRate] = useState("");

  const [nightPremium, setNightPremium] = useState(false);
  const [nightRate, setNightRate] = useState("2");
  const [nightStart, setNightStart] = useState("22:00");
  const [nightEnd, setNightEnd] = useState("06:00");

  const [weekendShift, setWeekendShift] = useState(false);
  const [weekendRate, setWeekendRate] = useState("1");

  const [overtime, setOvertime] = useState(false);
  const [overtimeThresholdHours, setOvertimeThresholdHours] = useState("8");
  const [multiplierChoice, setMultiplierChoice] = useState("1.5");
  const [customMultiplier, setCustomMultiplier] = useState("1.75");

  const overtimeMultiplier =
    multiplierChoice === "custom" ? customMultiplier : multiplierChoice;

  /**
   * Every money string on this page goes through here. The pay maths is
   * currency-neutral — the selector only changes the symbol in front of the
   * digits, never a calculated figure, and no conversion is applied.
   */
  const money = (pence: number) => formatCurrencyFromMinor(pence, currency);
  const symbol = currencySymbol(currency);

  const result = useMemo(
    () =>
      calculateShiftPay({
        start,
        end,
        overnight,
        breakMinutes,
        hourlyRate,
        nightPremium,
        nightRate,
        nightStart,
        nightEnd,
        weekendShift,
        weekendRate,
        overtime,
        overtimeThresholdHours,
        overtimeMultiplier,
      }),
    [
      start,
      end,
      overnight,
      breakMinutes,
      hourlyRate,
      nightPremium,
      nightRate,
      nightStart,
      nightEnd,
      weekendShift,
      weekendRate,
      overtime,
      overtimeThresholdHours,
      overtimeMultiplier,
    ],
  );

  // Field-level error (red) only for genuinely wrong input — empty fields
  // get a gentle prompt near the result instead.
  const fieldError = (field: string): string | undefined =>
    !result.ok && !result.incomplete && result.field === field
      ? result.message
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Shift details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TimeInput
            id="shift-start"
            label="Shift start"
            value={start}
            onChange={setStart}
            error={fieldError("start")}
          />
          <TimeInput
            id="shift-end"
            label="Shift finish"
            value={end}
            onChange={setEnd}
            error={fieldError("end")}
          />
        </div>
        <CheckboxInput
          id="shift-overnight"
          label="Overnight shift"
          checked={overnight}
          onChange={setOvernight}
          hint="The finish time is on the next day — e.g. 22:00 to 06:00."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            id="shift-break"
            label="Unpaid break"
            value={breakMinutes}
            onChange={setBreakMinutes}
            suffix="min"
            min={0}
            hint="Total unpaid break time in minutes."
            error={fieldError("break")}
          />
          <CurrencyInput
            id="shift-rate"
            label="Hourly rate"
            currency={currency}
            value={hourlyRate}
            onChange={setHourlyRate}
            suffix="per hour"
            placeholder="12.50"
            error={fieldError("rate")}
          />
          <CurrencySelect
            id="shift-currency"
            value={currency}
            onChange={setCurrency}
          />
        </div>

        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Premiums (optional)
        </h2>
        <CheckboxInput
          id="shift-night-premium"
          label="Night premium"
          checked={nightPremium}
          onChange={setNightPremium}
          hint={`Extra ${symbol} per hour for time worked inside a night window.`}
        />
        {nightPremium ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <CurrencyInput
              id="shift-night-rate"
              label="Night premium"
              currency={currency}
              value={nightRate}
              onChange={setNightRate}
              suffix="per hour extra"
              error={fieldError("nightRate")}
            />
            <TimeInput
              id="shift-night-start"
              label="Night window starts"
              value={nightStart}
              onChange={setNightStart}
              error={fieldError("nightStart")}
            />
            <TimeInput
              id="shift-night-end"
              label="Night window ends"
              value={nightEnd}
              onChange={setNightEnd}
              error={fieldError("nightEnd")}
            />
          </div>
        ) : null}
        <CheckboxInput
          id="shift-weekend"
          label="This is a weekend shift"
          checked={weekendShift}
          onChange={setWeekendShift}
          hint="A weekend premium is added to every paid hour of the shift."
        />
        {weekendShift ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyInput
              id="shift-weekend-rate"
              label="Weekend premium"
              currency={currency}
              value={weekendRate}
              onChange={setWeekendRate}
              suffix="per hour extra"
              error={fieldError("weekendRate")}
            />
          </div>
        ) : null}

        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Overtime (optional)
        </h2>
        <CheckboxInput
          id="shift-overtime"
          label="Apply overtime after a threshold"
          checked={overtime}
          onChange={setOvertime}
          hint="Paid hours beyond the threshold earn your rate × the multiplier."
        />
        {overtime ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberInput
              id="shift-overtime-threshold"
              label="Overtime after"
              value={overtimeThresholdHours}
              onChange={setOvertimeThresholdHours}
              suffix="hours"
              min={0}
              error={fieldError("overtimeThreshold")}
            />
            <SelectInput
              id="shift-overtime-multiplier"
              label="Overtime multiplier"
              value={multiplierChoice}
              onChange={setMultiplierChoice}
              options={MULTIPLIER_OPTIONS}
              error={
                multiplierChoice === "custom"
                  ? undefined
                  : fieldError("overtimeMultiplier")
              }
            />
            {multiplierChoice === "custom" ? (
              <NumberInput
                id="shift-overtime-custom"
                label="Custom multiplier"
                value={customMultiplier}
                onChange={setCustomMultiplier}
                suffix="×"
                min={1}
                error={fieldError("overtimeMultiplier")}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {result.ok ? (
        <ResultCard
          live
          title="Your shift"
          primary={{
            label: "Estimated gross shift pay",
            value: money(result.totalPence),
          }}
          rows={[
            {
              label: "Total elapsed time",
              value: formatHoursMinutes(result.elapsedMinutes),
            },
            {
              label: "Unpaid break",
              value: formatHoursMinutes(result.breakMinutes),
            },
            {
              label: "Paid hours",
              value: `${formatHoursMinutes(result.paidMinutes)} (${formatDecimalHours(result.paidMinutes)} hrs)`,
            },
            { label: "Base pay", value: money(result.basePayPence) },
            ...(nightPremium
              ? [
                  {
                    label: `Night premium (${formatHoursMinutes(result.nightEligibleMinutes)})`,
                    value: money(result.nightPremiumPence),
                  },
                ]
              : []),
            ...(weekendShift
              ? [
                  {
                    label: "Weekend premium",
                    value: money(result.weekendPremiumPence),
                  },
                ]
              : []),
            ...(overtime
              ? [
                  {
                    label: `Overtime uplift (${formatHoursMinutes(result.overtimeMinutes)})`,
                    value: money(result.overtimeUpliftPence),
                  },
                ]
              : []),
            {
              label: "Estimated total",
              value: money(result.totalPence),
              strong: true,
            },
          ]}
          footnote="Illustrative gross pay before tax, National Insurance and other deductions. Premium and overtime rules vary by contract — check yours."
        />
      ) : (
        <div
          aria-live="polite"
          className="rounded-card border border-border bg-surface-subtle p-5 text-sm text-muted"
        >
          {result.incomplete
            ? result.message
            : "Fix the highlighted field above to see your estimated shift pay."}
        </div>
      )}

      <div>
        <Button
          variant="secondary"
          onClick={() => {
            setStart("09:00");
            setEnd("17:30");
            setOvernight(false);
            setBreakMinutes("30");
            setHourlyRate("");
            setNightPremium(false);
            setWeekendShift(false);
            setOvertime(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
