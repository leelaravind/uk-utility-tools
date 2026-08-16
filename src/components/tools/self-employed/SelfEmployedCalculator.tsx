"use client";

import { useMemo, useState } from "react";

import {
  CheckboxInput,
  CurrencyInput,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import { getTaxYear, TAX_YEARS } from "@/config/ukTax";
import { formatGBP } from "@/lib/calc/salary";
import {
  computeSelfEmployed,
  type Period,
  type SelfEmployedResult,
} from "@/lib/calc/selfEmployed";

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function SelfEmployedCalculator() {
  const [taxYearId, setTaxYearId] = useState(TAX_YEARS[0].id);
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [includeTax, setIncludeTax] = useState(true);

  const config = getTaxYear(taxYearId) ?? TAX_YEARS[0];

  const revenueNum = parseAmount(revenue);
  const revenueError =
    revenue.trim() !== "" && (revenueNum === null || revenueNum < 0)
      ? "Enter a valid revenue amount."
      : undefined;

  const expensesNum = parseAmount(expenses);
  const expensesError =
    expenses.trim() !== "" && (expensesNum === null || expensesNum < 0)
      ? "Enter a valid expenses amount."
      : undefined;

  const result: SelfEmployedResult | null = useMemo(() => {
    if (revenueNum === null || revenueError || expensesError) return null;
    return computeSelfEmployed(config, {
      revenue: revenueNum,
      expenses: expensesNum ?? 0,
      period,
      includeTax,
    });
  }, [config, revenueNum, revenueError, expensesNum, expensesError, period, includeTax]);

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
        <h2 className="text-lg font-semibold text-foreground">
          Your self-employment figures
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="se-period"
            label="Figures entered per"
            value={period}
            onChange={(v) => setPeriod(v as Period)}
            options={[
              { value: "weekly", label: "Week" },
              { value: "monthly", label: "Month" },
              { value: "annual", label: "Year" },
            ]}
            hint="Weekly and monthly figures are annualised (× 52 or × 12)."
          />
          <SelectInput
            id="se-tax-year"
            label="Tax year"
            value={taxYearId}
            onChange={setTaxYearId}
            options={TAX_YEARS.map((y) => ({ value: y.id, label: y.label }))}
          />
          <CurrencyInput
            id="se-revenue"
            label="Revenue (money in)"
            value={revenue}
            onChange={setRevenue}
            error={revenueError}
            placeholder="3000"
            hint="Total sales or fees before any costs."
          />
          <CurrencyInput
            id="se-expenses"
            label="Allowable expenses"
            value={expenses}
            onChange={setExpenses}
            error={expensesError}
            placeholder="500"
            hint="Business costs HMRC allows you to deduct."
          />
        </div>
        <div className="mt-4">
          <CheckboxInput
            id="se-include-tax"
            label="Include illustrative tax estimate"
            checked={includeTax}
            onChange={setIncludeTax}
            hint="Income tax (England, Wales & NI bands) and Class 4 National Insurance on your profit — assumes this is your only income."
          />
        </div>
      </div>

      {result ? (
        <>
          <ResultCard
            live
            title={
              includeTax
                ? `Illustrative estimate — ${config.label}`
                : "Profit estimate"
            }
            primary={{
              label:
                result.tax !== undefined
                  ? "Estimated annual profit after tax"
                  : "Estimated annual profit",
              value: formatGBP(
                result.tax !== undefined
                  ? result.tax.postTaxProfit
                  : result.annualProfit,
              ),
            }}
            rows={[
              {
                label: "Annual revenue",
                value: formatGBP(result.annualRevenue),
              },
              {
                label: "Annual expenses",
                value: formatGBP(result.annualExpenses),
              },
              {
                label: result.isLoss ? "Annual loss" : "Annual profit",
                value: formatGBP(result.annualProfit),
                strong: true,
              },
              ...(result.tax !== undefined
                ? [
                    {
                      label: "Personal allowance",
                      value: formatGBP(result.tax.personalAllowance),
                    },
                    {
                      label: "Income tax (illustrative)",
                      value: formatGBP(result.tax.incomeTax),
                    },
                    {
                      label: "Class 4 National Insurance",
                      value: formatGBP(result.tax.class4Ni),
                    },
                    {
                      label: "Estimated profit after tax",
                      value: formatGBP(result.tax.postTaxProfit),
                      strong: true,
                    },
                    {
                      label: "Monthly equivalent after tax",
                      value: formatGBP(
                        Math.round((result.tax.postTaxProfit / 12) * 100) / 100,
                      ),
                    },
                  ]
                : []),
            ]}
            footnote="Illustrative — not tax advice. Assumes self-employment is your only income, with the standard personal allowance and no other reliefs."
          >
            {result.isLoss ? (
              <p className="mt-4 text-sm leading-relaxed text-danger">
                Your expenses are higher than your revenue, so this is a loss.
                No income tax or National Insurance would be due on it.
              </p>
            ) : null}
            {result.tax !== undefined ? (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {result.tax.class2.treatedAsPaid ? (
                  <>
                    <strong className="text-foreground">Class 2 NI:</strong>{" "}
                    your profit is at or above the{" "}
                    {formatGBP(result.tax.class2.smallProfitsThreshold)} small
                    profits threshold, so you are treated as having paid Class
                    2 automatically — nothing extra to pay.
                  </>
                ) : (
                  <>
                    <strong className="text-foreground">Class 2 NI:</strong>{" "}
                    your profit is below the{" "}
                    {formatGBP(result.tax.class2.smallProfitsThreshold)} small
                    profits threshold. You can pay voluntary Class 2 at{" "}
                    {formatGBP(result.tax.class2.weeklyRate)} a week (about{" "}
                    {formatGBP(result.tax.class2.annualVoluntaryCost)} a year)
                    to protect your State Pension record — this is optional
                    and not included in the figures above.
                  </>
                )}
              </p>
            ) : null}
          </ResultCard>

          {result.tax !== undefined &&
          result.tax.incomeTaxBands.length > 0 ? (
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
                    {result.tax.incomeTaxBands.map((band) => (
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
          Enter your revenue to see an instant estimate.
        </p>
      )}

      <div className="text-xs leading-relaxed text-faint">
        <p className="font-medium text-muted">
          Estimate only — tax rules can change.
        </p>
        <p className="mt-1">
          Rates for {config.label} last verified against GOV.UK on{" "}
          {config.lastVerified}.
        </p>
      </div>
    </div>
  );
}
