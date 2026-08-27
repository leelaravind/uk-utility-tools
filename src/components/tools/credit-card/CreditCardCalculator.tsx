"use client";

import { useMemo, useState } from "react";

import {
  Button,
  CurrencyInput,
  CurrencySelect,
  NumberInput,
  ResultCard,
} from "@/components/ui";
import {
  MAX_MONTHS,
  requiredMonthlyPayment,
  simulatePayoff,
  type AmortisationRow,
  type PayoffResult,
  type RequiredPaymentResult,
} from "@/lib/calc/creditCard";
import {
  formatCurrency,
  formatCurrencyFromMinor,
  type SupportedCurrency,
} from "@/lib/currency";
import { useCurrencyPreference } from "@/lib/useCurrencyPreference";

type Mode = "payment" | "target";

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[£$€,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatDuration(months: number): string {
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  return rest === 0 ? y : `${y} ${rest} month${rest === 1 ? "" : "s"}`;
}

function formatPayoffMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Format an amount held in minor units (pence/cents) in the chosen currency.
 * The amortisation maths is pure arithmetic on integers, so the currency only
 * ever changes the symbol in front of the digits — nothing is converted.
 */
function money(minorUnits: number, currency: SupportedCurrency): string {
  return formatCurrencyFromMinor(minorUnits, currency);
}

/** Inline SVG line of balance over time — no chart library. */
function BalanceChart({
  startBalancePence,
  schedule,
  months,
  currency,
}: {
  startBalancePence: number;
  schedule: AmortisationRow[];
  months: number;
  currency: SupportedCurrency;
}) {
  const width = 400;
  const height = 140;
  const pad = 10;
  const balances = [startBalancePence, ...schedule.map((r) => r.balancePence)];
  const max = Math.max(...balances, 1);
  const points = balances
    .map((b, i) => {
      const x = pad + (i / (balances.length - 1)) * (width - pad * 2);
      const y = pad + (1 - b / max) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="h-auto w-full text-accent"
        role="presentation"
      >
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="sr-only">
        Chart alternative: the balance falls from{" "}
        {money(startBalancePence, currency)} to zero over{" "}
        {formatDuration(months)}.
      </p>
      <p className="mt-1 text-xs text-muted">
        Balance falling from {money(startBalancePence, currency)} to{" "}
        {formatCurrency(0, currency)} over {formatDuration(months)}.
      </p>
    </div>
  );
}

function ScheduleTable({
  schedule,
  currency,
}: {
  schedule: AmortisationRow[];
  currency: SupportedCurrency;
}) {
  return (
    <details className="rounded-card border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        Month-by-month schedule ({schedule.length} rows)
      </summary>
      <div className="mt-3 max-h-80 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4 font-medium">Month</th>
              <th className="py-2 pr-4 text-right font-medium">Payment</th>
              <th className="py-2 pr-4 text-right font-medium">Interest</th>
              <th className="py-2 pr-4 text-right font-medium">Principal</th>
              <th className="py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row) => (
              <tr key={row.month} className="border-b border-border">
                <td className="py-1.5 pr-4 tabular-nums text-foreground">
                  {row.month}
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-foreground">
                  {money(row.paymentPence, currency)}
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-foreground">
                  {money(row.interestPence, currency)}
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-foreground">
                  {money(row.principalPence, currency)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-foreground">
                  {money(row.balancePence, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function CreditCardCalculator() {
  const [currency, setCurrency] = useCurrencyPreference();
  const [mode, setMode] = useState<Mode>("payment");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [payment, setPayment] = useState("");
  const [months, setMonths] = useState("");

  const balanceNum = parseAmount(balance);
  const balanceError =
    balance.trim() !== "" && (balanceNum === null || balanceNum <= 0)
      ? "Enter a balance greater than zero."
      : undefined;

  const aprNum = parseAmount(apr);
  const aprError =
    apr.trim() !== "" && (aprNum === null || aprNum < 0 || aprNum > 200)
      ? "Enter an APR between 0 and 200."
      : undefined;

  const paymentNum = parseAmount(payment);
  const paymentError =
    mode === "payment" &&
    payment.trim() !== "" &&
    (paymentNum === null || paymentNum <= 0)
      ? "Enter a monthly payment greater than zero."
      : undefined;

  const monthsNum = parseAmount(months);
  const monthsError =
    mode === "target" &&
    months.trim() !== "" &&
    (monthsNum === null ||
      !Number.isInteger(monthsNum) ||
      monthsNum < 1 ||
      monthsNum > MAX_MONTHS)
      ? `Enter a whole number of months between 1 and ${MAX_MONTHS}.`
      : undefined;

  const ready =
    balanceNum !== null &&
    !balanceError &&
    aprNum !== null &&
    !aprError &&
    (mode === "payment"
      ? paymentNum !== null && !paymentError
      : monthsNum !== null && !monthsError);

  const result: PayoffResult | RequiredPaymentResult | null = useMemo(() => {
    if (!ready) return null;
    const today = new Date();
    if (mode === "payment") {
      return simulatePayoff(
        {
          balance: balanceNum!,
          aprPercent: aprNum!,
          monthlyPayment: paymentNum!,
        },
        today,
      );
    }
    return requiredMonthlyPayment(
      { balance: balanceNum!, aprPercent: aprNum!, targetMonths: monthsNum! },
      today,
    );
  }, [ready, mode, balanceNum, aprNum, paymentNum, monthsNum]);

  const startBalancePence =
    balanceNum !== null ? Math.round(balanceNum * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">
          What do you want to work out?
        </h2>
        <div
          role="group"
          aria-label="Calculator mode"
          className="mt-3 flex flex-wrap gap-2"
        >
          <Button
            variant={mode === "payment" ? "primary" : "secondary"}
            onClick={() => setMode("payment")}
          >
            How long to clear it
          </Button>
          <Button
            variant={mode === "target" ? "primary" : "secondary"}
            onClick={() => setMode("target")}
          >
            Payment for a target date
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CurrencyInput
            id="cc-balance"
            label="Card balance"
            currency={currency}
            value={balance}
            onChange={setBalance}
            error={balanceError}
            placeholder="2500"
          />
          <NumberInput
            id="cc-apr"
            label="Interest rate (APR)"
            value={apr}
            onChange={setApr}
            suffix="%"
            error={aprError}
            placeholder="24.9"
            hint="From your statement. We use APR ÷ 12 as the monthly rate."
          />
          {mode === "payment" ? (
            <CurrencyInput
              id="cc-payment"
              label="Monthly payment"
              currency={currency}
              value={payment}
              onChange={setPayment}
              error={paymentError}
              placeholder="150"
              hint="A fixed amount you'll pay every month."
            />
          ) : (
            <NumberInput
              id="cc-months"
              label="Clear the balance in (months)"
              value={months}
              onChange={setMonths}
              error={monthsError}
              placeholder="24"
              inputMode="numeric"
            />
          )}
          <CurrencySelect
            id="cc-currency"
            value={currency}
            onChange={setCurrency}
          />
        </div>
      </div>

      {result === null ? (
        <p className="text-sm text-muted">
          Fill in the fields above to see an instant estimate.
        </p>
      ) : !result.ok ? (
        <div
          role="alert"
          className="rounded-card border border-border bg-surface-subtle p-5"
        >
          <p className="text-base font-semibold text-danger">
            {result.message}
          </p>
          {result.suggestedMonthlyPence !== null ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {result.firstMonthInterestPence !== null ? (
                <>
                  Interest alone is{" "}
                  <strong className="text-foreground">
                    {money(result.firstMonthInterestPence, currency)}
                  </strong>{" "}
                  in the first month.{" "}
                </>
              ) : null}
              You would need at least{" "}
              <strong className="text-foreground">
                {money(result.suggestedMonthlyPence, currency)}
              </strong>{" "}
              a month to clear the balance within {MAX_MONTHS / 12} years —
              and considerably more to clear it quickly.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <ResultCard
            live
            title={
              mode === "payment" ? "Time to clear" : "Required monthly payment"
            }
            primary={
              mode === "payment"
                ? {
                    label: "Estimated time to clear the balance",
                    value: formatDuration(result.months),
                  }
                : {
                    label: "Monthly payment needed",
                    value:
                      result.monthlyPaymentPence !== undefined
                        ? money(result.monthlyPaymentPence, currency)
                        : "—",
                  }
            }
            rows={[
              ...(mode === "target"
                ? [
                    {
                      label: "Clears the balance in",
                      value: formatDuration(result.months),
                    },
                  ]
                : []),
              {
                label: "Projected payoff date",
                value: formatPayoffMonth(result.payoffMonth),
              },
              {
                label: "Total you would pay",
                value: money(result.totalPaidPence, currency),
              },
              {
                label: "Total interest",
                value: money(result.totalInterestPence, currency),
                strong: true,
              },
              {
                label: "Final payment",
                value: money(result.finalPaymentPence, currency),
              },
            ]}
            footnote="Illustrative amortisation only, not country-specific advice. The maths is the same in any currency, but how interest is charged and how card lending is regulated differ from country to country — most issuers compound daily and add fees — so your real statements will vary."
          >
            <BalanceChart
              startBalancePence={startBalancePence}
              schedule={result.schedule}
              months={result.months}
              currency={currency}
            />
          </ResultCard>

          <ScheduleTable schedule={result.schedule} currency={currency} />
        </>
      )}
    </div>
  );
}
