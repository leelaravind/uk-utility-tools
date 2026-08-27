"use client";

import { useMemo, useState } from "react";

import {
  CurrencyInput,
  CurrencySelect,
  NumberInput,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import { calculateOvertime, type OvertimeMode } from "@/lib/calc/overtime";
import { formatHoursNumber } from "@/lib/calc/workingHours";
import { formatCurrencyFromMinor } from "@/lib/currency";
import { useCurrencyPreference } from "@/lib/useCurrencyPreference";

const MODE_OPTIONS = [
  { value: "multiplier", label: "Multiplier of my normal rate (e.g. 1.5×)" },
  { value: "rate", label: "A specific overtime hourly rate" },
];

const MULTIPLIER_OPTIONS = [
  { value: "1", label: "1× (same rate)" },
  { value: "1.25", label: "1.25×" },
  { value: "1.5", label: "1.5× (time and a half)" },
  { value: "2", label: "2× (double time)" },
  { value: "custom", label: "Custom…" },
];

export function OvertimeCalculator() {
  const [currency, setCurrency] = useCurrencyPreference();
  const [hourlyRate, setHourlyRate] = useState("");
  const [standardWeeklyHours, setStandardWeeklyHours] = useState("37.5");
  const [actualHours, setActualHours] = useState("");
  const [mode, setMode] = useState<OvertimeMode>("multiplier");
  const [multiplierChoice, setMultiplierChoice] = useState("1.5");
  const [customMultiplier, setCustomMultiplier] = useState("1.75");
  const [overtimeRate, setOvertimeRate] = useState("");

  const multiplier =
    multiplierChoice === "custom" ? customMultiplier : multiplierChoice;

  /**
   * Single funnel for every money string here. Overtime pay is hours × rate,
   * which is the same arithmetic in any currency — the selector changes the
   * symbol only, and never converts between currencies.
   */
  const money = (pence: number) => formatCurrencyFromMinor(pence, currency);

  const result = useMemo(
    () =>
      calculateOvertime({
        hourlyRate,
        standardWeeklyHours,
        actualHours,
        mode,
        multiplier,
        overtimeRate,
      }),
    [hourlyRate, standardWeeklyHours, actualHours, mode, multiplier, overtimeRate],
  );

  const fieldError = (field: string): string | undefined =>
    !result.ok && !result.incomplete && result.field === field
      ? result.message
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Your week</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <CurrencyInput
            id="ot-rate"
            label="Standard hourly rate"
            currency={currency}
            value={hourlyRate}
            onChange={setHourlyRate}
            suffix="per hour"
            placeholder="12.50"
            error={fieldError("rate")}
          />
          <CurrencySelect
            id="ot-currency"
            value={currency}
            onChange={setCurrency}
          />
          <NumberInput
            id="ot-standard"
            label="Standard weekly hours"
            value={standardWeeklyHours}
            onChange={setStandardWeeklyHours}
            suffix="hours"
            min={0}
            hint="Hours before overtime starts."
            error={fieldError("standard")}
          />
          <NumberInput
            id="ot-actual"
            label="Hours actually worked"
            value={actualHours}
            onChange={setActualHours}
            suffix="hours"
            min={0}
            placeholder="42.5"
            error={fieldError("actual")}
          />
        </div>

        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Overtime rate
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="ot-mode"
            label="How is overtime paid?"
            value={mode}
            onChange={(v) => setMode(v === "rate" ? "rate" : "multiplier")}
            options={MODE_OPTIONS}
          />
          {mode === "multiplier" ? (
            <SelectInput
              id="ot-multiplier"
              label="Overtime multiplier"
              value={multiplierChoice}
              onChange={setMultiplierChoice}
              options={MULTIPLIER_OPTIONS}
              error={
                multiplierChoice === "custom"
                  ? undefined
                  : fieldError("multiplier")
              }
            />
          ) : (
            <CurrencyInput
              id="ot-explicit-rate"
              label="Overtime hourly rate"
              currency={currency}
              value={overtimeRate}
              onChange={setOvertimeRate}
              suffix="per hour"
              placeholder="18.75"
              error={fieldError("overtimeRate")}
            />
          )}
          {mode === "multiplier" && multiplierChoice === "custom" ? (
            <NumberInput
              id="ot-custom-multiplier"
              label="Custom multiplier"
              value={customMultiplier}
              onChange={setCustomMultiplier}
              suffix="×"
              min={1}
              error={fieldError("multiplier")}
            />
          ) : null}
        </div>
      </div>

      {result.ok ? (
        <ResultCard
          live
          title="This week"
          primary={{
            label: "Estimated gross weekly pay",
            value: money(result.totalPence),
          }}
          rows={[
            {
              label: "Normal hours",
              value: `${formatHoursNumber(result.normalHours)} hrs`,
            },
            {
              label: "Overtime hours",
              value: `${formatHoursNumber(result.overtimeHours)} hrs`,
            },
            {
              label: "Overtime rate",
              value: `${money(result.overtimeRatePence)}/hour`,
            },
            { label: "Normal pay", value: money(result.normalPayPence) },
            {
              label: "Overtime pay",
              value: money(result.overtimePayPence),
            },
            {
              label: "Estimated total",
              value: money(result.totalPence),
              strong: true,
            },
          ]}
          footnote="Illustrative gross pay before tax, National Insurance and other deductions. Overtime terms are set by your contract."
        />
      ) : (
        <div
          aria-live="polite"
          className="rounded-card border border-border bg-surface-subtle p-5 text-sm text-muted"
        >
          {result.incomplete
            ? result.message
            : "Fix the highlighted field above to see your estimated pay."}
        </div>
      )}
    </div>
  );
}
