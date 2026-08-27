"use client";

import { useMemo, useState } from "react";

import {
  CheckboxInput,
  CurrencyInput,
  CurrencySelect,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import { getTaxYear, TAX_YEARS } from "@/config/ukTax";
import {
  computeSelfEmployed,
  type Period,
  type SelfEmployedResult,
} from "@/lib/calc/selfEmployed";
import { formatCurrency } from "@/lib/currency";
import { useCurrencyPreference } from "@/lib/useCurrencyPreference";

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[£$€,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * UK income tax and National Insurance thresholds are defined in sterling.
 * They cannot be re-badged as dollars or euros by swapping a symbol, so the
 * tax half of this tool is available in GBP only — see `ukTaxAvailable`.
 */
const UK_TAX_CURRENCY = "GBP" as const;

export function SelfEmployedCalculator() {
  const [currency, setCurrency] = useCurrencyPreference();
  const [taxYearId, setTaxYearId] = useState(TAX_YEARS[0].id);
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [includeTax, setIncludeTax] = useState(true);

  const config = getTaxYear(taxYearId) ?? TAX_YEARS[0];

  /**
   * The two halves of this tool are not equally portable.
   *
   * Revenue − expenses = profit is arithmetic and works in any currency.
   * The tax half is UK-specific: the personal allowance, the income tax
   * bands and the Class 4 / Class 2 National Insurance thresholds are
   * amounts of sterling written into UK law. Showing them with a "$" or
   * "€" in front would state something false, so the tax estimate is only
   * computed and only rendered when the display currency is GBP.
   */
  const ukTaxAvailable = currency === UK_TAX_CURRENCY;
  const showTax = includeTax && ukTaxAvailable;

  /** Currency-neutral amounts: revenue, expenses, profit. */
  const money = (pounds: number) => formatCurrency(pounds, currency);
  /** UK tax amounts — always sterling, never re-badged. */
  const gbp = (amount: number) => formatCurrency(amount, UK_TAX_CURRENCY);

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
      // Not merely hidden: when the display currency isn't sterling the UK
      // tax estimate is never calculated, so no UK figure can reach the DOM.
      includeTax: showTax,
    });
  }, [config, revenueNum, revenueError, expensesNum, expensesError, period, showTax]);

  return (
    <div className="flex flex-col gap-6">
      {ukTaxAvailable && !config.verified ? (
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
          <CurrencySelect
            id="se-currency"
            value={currency}
            onChange={setCurrency}
            hint="Profit works in any currency. The UK tax estimate needs GBP."
          />
          <CurrencyInput
            id="se-revenue"
            label="Revenue (money in)"
            currency={currency}
            value={revenue}
            onChange={setRevenue}
            error={revenueError}
            placeholder="3000"
            hint="Total sales or fees before any costs."
          />
          <CurrencyInput
            id="se-expenses"
            label="Allowable expenses"
            currency={currency}
            value={expenses}
            onChange={setExpenses}
            error={expensesError}
            placeholder="500"
            hint="Business costs you are allowed to deduct."
          />
        </div>

        {ukTaxAvailable ? (
          <div className="mt-4 flex flex-col gap-4">
            <CheckboxInput
              id="se-include-tax"
              label="Include illustrative UK tax estimate"
              checked={includeTax}
              onChange={setIncludeTax}
              hint="UK income tax (England, Wales & NI bands) and Class 4 National Insurance on your profit — assumes this is your only income."
            />
            {includeTax ? (
              <div className="sm:max-w-xs">
                <SelectInput
                  id="se-tax-year"
                  label="UK tax year"
                  value={taxYearId}
                  onChange={setTaxYearId}
                  options={TAX_YEARS.map((y) => ({
                    value: y.id,
                    label: y.label,
                  }))}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-card border border-border bg-surface-subtle p-4 text-sm leading-relaxed text-muted">
            <p className="font-medium text-foreground">
              The UK tax estimate is switched off while you are viewing{" "}
              {currency}.
            </p>
            <p className="mt-1.5">
              Your profit above is still correct: revenue minus expenses is
              the same sum in any currency. The tax half is different. UK
              income tax bands, the personal allowance and the Class 4 and
              Class 2 National Insurance thresholds are{" "}
              <strong className="text-foreground">
                fixed amounts of sterling written into UK law
              </strong>
              . Putting a dollar or euro sign in front of them would not
              translate them — it would just state a figure that is wrong, so
              we do not show one.
            </p>
            <p className="mt-1.5">
              Switch the currency back to GBP (£) for the illustrative UK
              income tax and National Insurance estimate. For tax in another
              country, use that country&apos;s own tax authority or an
              accountant there.
            </p>
          </div>
        )}
      </div>

      {result ? (
        <>
          <ResultCard
            live
            title={
              result.tax !== undefined
                ? `Illustrative estimate — UK ${config.label}`
                : "Profit estimate"
            }
            primary={{
              label:
                result.tax !== undefined
                  ? "Estimated annual profit after tax"
                  : "Estimated annual profit",
              value:
                result.tax !== undefined
                  ? gbp(result.tax.postTaxProfit)
                  : money(result.annualProfit),
            }}
            rows={[
              {
                label: "Annual revenue",
                value: money(result.annualRevenue),
              },
              {
                label: "Annual expenses",
                value: money(result.annualExpenses),
              },
              {
                label: result.isLoss ? "Annual loss" : "Annual profit",
                value: money(result.annualProfit),
                strong: true,
              },
              ...(result.tax !== undefined
                ? [
                    {
                      label: "UK personal allowance",
                      value: gbp(result.tax.personalAllowance),
                    },
                    {
                      label: "UK income tax (illustrative)",
                      value: gbp(result.tax.incomeTax),
                    },
                    {
                      label: "Class 4 National Insurance",
                      value: gbp(result.tax.class4Ni),
                    },
                    {
                      label: "Estimated profit after tax",
                      value: gbp(result.tax.postTaxProfit),
                      strong: true,
                    },
                    {
                      label: "Monthly equivalent after tax",
                      value: gbp(
                        Math.round((result.tax.postTaxProfit / 12) * 100) / 100,
                      ),
                    },
                  ]
                : []),
            ]}
            footnote={
              result.tax !== undefined
                ? "Illustrative UK tax — not tax advice. Assumes self-employment is your only income, with the standard personal allowance and no other reliefs. Tax figures are always shown in sterling because UK thresholds are defined in sterling."
                : "Profit only: revenue minus allowable expenses, annualised. No tax is estimated — what you owe depends on the country you are taxed in."
            }
          >
            {result.isLoss ? (
              <p className="mt-4 text-sm leading-relaxed text-danger">
                Your expenses are higher than your revenue, so this is a loss.
                {result.tax !== undefined
                  ? " No UK income tax or National Insurance would be due on it."
                  : ""}
              </p>
            ) : null}
            {result.tax !== undefined ? (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {result.tax.class2.treatedAsPaid ? (
                  <>
                    <strong className="text-foreground">Class 2 NI:</strong>{" "}
                    your profit is at or above the{" "}
                    {gbp(result.tax.class2.smallProfitsThreshold)} small
                    profits threshold, so you are treated as having paid Class
                    2 automatically — nothing extra to pay.
                  </>
                ) : (
                  <>
                    <strong className="text-foreground">Class 2 NI:</strong>{" "}
                    your profit is below the{" "}
                    {gbp(result.tax.class2.smallProfitsThreshold)} small
                    profits threshold. You can pay voluntary Class 2 at{" "}
                    {gbp(result.tax.class2.weeklyRate)} a week (about{" "}
                    {gbp(result.tax.class2.annualVoluntaryCost)} a year)
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
                UK income tax band breakdown
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
                          {gbp(band.amount)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-foreground">
                          {gbp(band.tax)}
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

      {ukTaxAvailable ? (
        <div className="text-xs leading-relaxed text-faint">
          <p className="font-medium text-muted">
            Estimate only — tax rules can change.
          </p>
          <p className="mt-1">
            UK rates for {config.label} last verified against GOV.UK on{" "}
            {config.lastVerified}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
