"use client";

import { useMemo, useState } from "react";

import {
  CheckboxInput,
  CurrencyInput,
  NumberInput,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import { getTaxYear, TAX_YEARS } from "@/config/ukTax";
import {
  computeTakeHome,
  formatGBP,
  type PayFrequency,
  type Region,
  type SalaryResult,
  type StudentPlanId,
} from "@/lib/calc/salary";

/** Parse a user-typed amount ("30,000", "£30000.50") → number or null. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const FREQUENCY_LABEL: Record<PayFrequency, string> = {
  annual: "per year",
  monthly: "per month",
  weekly: "per week",
};

export function SalaryCalculator() {
  const [taxYearId, setTaxYearId] = useState(TAX_YEARS[0].id);
  const [gross, setGross] = useState("");
  const [region, setRegion] = useState<Region>("ruk");
  const [frequency, setFrequency] = useState<PayFrequency>("monthly");
  const [pensionType, setPensionType] = useState<"none" | "percent" | "amount">(
    "none",
  );
  const [pensionValue, setPensionValue] = useState("");
  const [studentPlan, setStudentPlan] = useState<StudentPlanId>("none");
  const [postgrad, setPostgrad] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState("5");
  const [hoursPerWeek, setHoursPerWeek] = useState("37.5");

  const config = getTaxYear(taxYearId) ?? TAX_YEARS[0];

  // --- Validation (messages, never codes) ---
  const grossNum = parseAmount(gross);
  const grossError =
    gross.trim() !== "" && (grossNum === null || grossNum < 0)
      ? "Enter a valid salary amount, e.g. 30000."
      : undefined;

  const pensionNum = parseAmount(pensionValue);
  let pensionError: string | undefined;
  if (pensionType !== "none" && pensionValue.trim() !== "") {
    if (pensionNum === null || pensionNum < 0) {
      pensionError = "Enter a valid pension contribution.";
    } else if (pensionType === "percent" && pensionNum > 100) {
      pensionError = "Pension percentage must be between 0 and 100.";
    }
  }

  const daysNum = parseAmount(daysPerWeek);
  const daysError =
    daysNum === null || daysNum <= 0 || daysNum > 7
      ? "Days per week must be between 1 and 7."
      : undefined;
  const hoursNum = parseAmount(hoursPerWeek);
  const hoursError =
    hoursNum === null || hoursNum <= 0 || hoursNum > 168
      ? "Hours per week must be between 1 and 168."
      : undefined;

  const result: SalaryResult | null = useMemo(() => {
    if (grossNum === null || grossNum < 0 || grossError || pensionError) {
      return null;
    }
    return computeTakeHome(config, {
      grossAnnual: grossNum,
      region,
      pension:
        pensionType !== "none" && pensionNum !== null && pensionNum >= 0
          ? { type: pensionType, value: pensionNum }
          : undefined,
      studentPlan,
      postgradLoan: postgrad,
      workingPattern: {
        daysPerWeek: daysError ? undefined : (daysNum ?? undefined),
        hoursPerWeek: hoursError ? undefined : (hoursNum ?? undefined),
      },
    });
  }, [
    config,
    grossNum,
    grossError,
    region,
    pensionType,
    pensionNum,
    pensionError,
    studentPlan,
    postgrad,
    daysNum,
    daysError,
    hoursNum,
    hoursError,
  ]);

  const planOptions = [
    { value: "none", label: "No student loan" },
    { value: "plan1", label: "Plan 1" },
    { value: "plan2", label: "Plan 2 (England/Wales, pre-Aug 2023)" },
    { value: "plan4", label: "Plan 4 (Scotland)" },
    { value: "plan5", label: "Plan 5 (England, from Aug 2023)" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!config.verified ? (
        <div
          role="alert"
          className="rounded-card border border-danger/40 bg-surface-subtle p-4 text-sm leading-relaxed text-danger"
        >
          <strong>Warning:</strong> the rates for {config.label} have not been
          fully verified against GOV.UK. Treat any result as a rough guide
          only.
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Your details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="salary-tax-year"
            label="Tax year"
            value={taxYearId}
            onChange={setTaxYearId}
            options={TAX_YEARS.map((y) => ({ value: y.id, label: y.label }))}
          />
          <SelectInput
            id="salary-region"
            label="Where do you pay income tax?"
            value={region}
            onChange={(v) => setRegion(v as Region)}
            options={[
              { value: "ruk", label: "England, Wales or Northern Ireland" },
              { value: "scotland", label: "Scotland" },
            ]}
            hint="Scotland has its own income tax bands. National Insurance is the same UK-wide."
          />
          <CurrencyInput
            id="salary-gross"
            label="Gross annual salary"
            value={gross}
            onChange={setGross}
            error={grossError}
            placeholder="30000"
            hint="Your salary before any deductions."
          />
          <SelectInput
            id="salary-frequency"
            label="Show take-home as"
            value={frequency}
            onChange={(v) => setFrequency(v as PayFrequency)}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Annual" },
              { value: "weekly", label: "Weekly" },
            ]}
          />
        </div>

        <h2 className="mt-6 text-lg font-semibold text-foreground">
          Pension and student loans
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="salary-pension-type"
            label="Pension contribution"
            value={pensionType}
            onChange={(v) =>
              setPensionType(v as "none" | "percent" | "amount")
            }
            options={[
              { value: "none", label: "None" },
              { value: "percent", label: "Percentage of salary" },
              { value: "amount", label: "Fixed annual amount" },
            ]}
            hint="Treated as a workplace (net pay) contribution — it reduces income tax but not National Insurance or student loan deductions."
          />
          {pensionType === "percent" ? (
            <NumberInput
              id="salary-pension-value"
              label="Pension (% of salary)"
              value={pensionValue}
              onChange={setPensionValue}
              suffix="%"
              placeholder="5"
              error={pensionError}
            />
          ) : null}
          {pensionType === "amount" ? (
            <CurrencyInput
              id="salary-pension-value"
              label="Pension (£ per year)"
              value={pensionValue}
              onChange={setPensionValue}
              placeholder="2000"
              error={pensionError}
            />
          ) : null}
          <SelectInput
            id="salary-student-plan"
            label="Student loan plan"
            value={studentPlan}
            onChange={(v) => setStudentPlan(v as StudentPlanId)}
            options={planOptions}
          />
          <div className="sm:pt-7">
            <CheckboxInput
              id="salary-postgrad"
              label="Postgraduate loan"
              checked={postgrad}
              onChange={setPostgrad}
              hint="Repaid at 6% — can apply on top of an undergraduate plan."
            />
          </div>
        </div>

        <h2 className="mt-6 text-lg font-semibold text-foreground">
          Working pattern
        </h2>
        <p className="mt-1 text-sm text-muted">
          Only used for the daily and hourly take-home figures.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberInput
            id="salary-days"
            label="Days worked per week"
            value={daysPerWeek}
            onChange={setDaysPerWeek}
            error={daysError}
            placeholder="5"
          />
          <NumberInput
            id="salary-hours"
            label="Hours worked per week"
            value={hoursPerWeek}
            onChange={setHoursPerWeek}
            error={hoursError}
            placeholder="37.5"
          />
        </div>
      </div>

      {result ? (
        <>
          <ResultCard
            live
            title={`Estimated take-home — ${config.label}`}
            primary={{
              label: `Take-home pay ${FREQUENCY_LABEL[frequency]}`,
              value: formatGBP(result.takeHome[frequency]),
            }}
            rows={[
              { label: "Gross salary", value: formatGBP(result.grossAnnual) },
              {
                label: "Personal allowance",
                value: formatGBP(result.personalAllowance),
              },
              { label: "Income tax", value: formatGBP(result.incomeTax) },
              {
                label: "National Insurance",
                value: formatGBP(result.nationalInsurance),
              },
              ...(result.pensionAnnual > 0
                ? [
                    {
                      label: "Pension contribution",
                      value: formatGBP(result.pensionAnnual),
                    },
                  ]
                : []),
              ...(studentPlan !== "none"
                ? [
                    {
                      label: "Student loan",
                      value: formatGBP(result.studentLoan),
                    },
                  ]
                : []),
              ...(postgrad
                ? [
                    {
                      label: "Postgraduate loan",
                      value: formatGBP(result.postgradLoan),
                    },
                  ]
                : []),
              {
                label: "Total deductions",
                value: formatGBP(result.totalDeductions),
              },
              {
                label: "Take-home per year",
                value: formatGBP(result.takeHome.annual),
                strong: true,
              },
              {
                label: "Take-home per month",
                value: formatGBP(result.takeHome.monthly),
              },
              {
                label: "Take-home per week",
                value: formatGBP(result.takeHome.weekly),
              },
              {
                label: `Per day (${result.workingPattern.daysPerWeek} days/week)`,
                value: formatGBP(result.takeHome.daily),
              },
              {
                label: `Per hour (${result.workingPattern.hoursPerWeek} h/week)`,
                value: formatGBP(result.takeHome.hourly),
              },
            ]}
            footnote="Estimated figures on an annual basis. Payroll calculates tax, NI and student loans per pay period, so real payslips can differ slightly."
          >
            {result.warnings.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-1 text-sm text-danger">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </ResultCard>

          {result.incomeTaxBands.length > 0 ? (
            <details className="rounded-card border border-border bg-surface p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Income tax band breakdown
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-2 pr-4 font-medium">Band</th>
                      <th className="py-2 pr-4 font-medium">Rate</th>
                      <th className="py-2 pr-4 text-right font-medium">
                        Amount taxed
                      </th>
                      <th className="py-2 text-right font-medium">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.incomeTaxBands.map((band) => (
                      <tr key={band.name} className="border-b border-border">
                        <td className="py-2 pr-4 text-foreground">
                          {band.name}
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-foreground">
                          {(band.rate * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-foreground">
                          {formatGBP(band.amount)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">
                          {formatGBP(band.tax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">
          Enter your gross annual salary to see an instant estimate.
        </p>
      )}

      <div className="text-xs leading-relaxed text-faint">
        <p className="font-medium text-muted">
          Estimate only — tax rules can change.
        </p>
        <p className="mt-1">
          Rates for {config.label} last verified against GOV.UK on{" "}
          {config.lastVerified}. Sources:{" "}
          {config.sources.map((src, i) => (
            <span key={src}>
              {i > 0 ? " · " : ""}
              <a
                href={src}
                rel="noopener noreferrer"
                target="_blank"
                className="underline decoration-border underline-offset-2 hover:text-accent"
              >
                {src.replace("https://www.", "").split("/").slice(0, 2).join("/")}
              </a>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
