import type { Metadata } from "next";

import { SalaryCalculator } from "@/components/tools/salary/SalaryCalculator";
import { ToolLayout } from "@/components/ui";
import { getTaxYear, TAX_YEARS, type TaxBand } from "@/config/ukTax";
import { getTool } from "@/lib/registry";

const defaultYear = TAX_YEARS[0];

export const metadata: Metadata = {
  title:
    "UK Salary Calculator 2026/27 — Take-Home Pay After Tax, NI & Student Loan",
  description:
    "Estimate UK take-home pay for 2026/27 or 2025/26 after income tax, National Insurance, pension and student loans — with Scottish tax bands included.",
  alternates: { canonical: "/salary" },
};

const gbp0 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** Render a config band list as taxable-income ranges. */
function bandRows(bands: TaxBand[]) {
  let previous = 0;
  return bands.map((band) => {
    const from = previous;
    const to = band.upTo;
    previous = band.upTo ?? previous;
    const range =
      to === null
        ? `Over ${gbp0.format(from)}`
        : from === 0
          ? `Up to ${gbp0.format(to)}`
          : `${gbp0.format(from)} – ${gbp0.format(to)}`;
    return { name: band.name, range, rate: `${Math.round(band.rate * 1000) / 10}%` };
  });
}

function BandTable({ caption, bands }: { caption: string; bands: TaxBand[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th>Band</th>
            <th>Taxable income (above your allowance)</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {bandRows(bands).map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.range}</td>
              <td>{row.rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FAQS = [
  {
    question: "How is my take-home pay calculated?",
    answer:
      "We start with your gross annual salary, deduct any pension contribution, then apply income tax over your personal allowance using the bands for your part of the UK. Employee National Insurance is worked out separately on your full gross pay (8% between £12,570 and £50,270, 2% above), and student loan repayments are a percentage of gross pay above your plan's threshold. Take-home pay is gross pay minus all of these.",
  },
  {
    question: "Why is take-home pay different in Scotland?",
    answer:
      "Scotland sets its own income tax bands and rates (starter, basic, intermediate, higher, advanced and top, from 19% up to 48% in 2026/27). Lower earners in Scotland pay slightly less income tax than in the rest of the UK, while higher earners pay more. National Insurance and student loan rules are the same UK-wide, so only the income tax portion changes.",
  },
  {
    question: "How do student loan repayments come out of my pay?",
    answer:
      "You repay 9% of gross income above your plan's threshold (Plan 1, 2, 4 or 5), or 6% above £21,000 for a postgraduate loan. An undergraduate plan and a postgraduate loan can both be deducted at the same time. In 2026/27 the thresholds are: Plan 1 £26,900, Plan 2 £29,385, Plan 4 £33,795 and Plan 5 £25,000. Nothing is repaid below the threshold.",
  },
  {
    question: "How does the calculator treat my pension contribution?",
    answer:
      "As a workplace 'net pay' arrangement: the contribution is taken from pay before income tax, so it reduces your income tax bill, but it does not reduce National Insurance or student loan deductions. Salary sacrifice schemes (which do save NI) and relief-at-source personal pensions work differently, so your real figures may vary.",
  },
  {
    question: "What happens to my personal allowance above £100,000?",
    answer:
      "The £12,570 personal allowance is withdrawn at £1 for every £2 of income over £100,000, disappearing entirely at £125,140. In that range each extra £1 is effectively taxed at around 60% in England, Wales and Northern Ireland. Pension contributions can restore some allowance because they reduce the income used for the taper.",
  },
  {
    question: "Will this match my payslip exactly?",
    answer:
      "It should be very close but not always penny-perfect. Payroll works out tax, NI and student loans per pay period using your tax code, whereas this calculator uses a simple annual basis and assumes the standard personal allowance with no benefits in kind or other income.",
  },
];

export default function SalaryPage() {
  const tool = getTool("salary")!;
  const y2526 = getTaxYear("2025-26");

  return (
    <ToolLayout
      tool={tool}
      explanation={
        <>
          <p>
            This calculator estimates your take-home pay for the{" "}
            <strong>{defaultYear.label}</strong> tax year by default (you can
            switch to {y2526 ? y2526.label : "the previous year"}). It applies
            four deductions to your gross salary: income tax, employee National
            Insurance, your pension contribution and student loan repayments.
            All rates below are read from the same verified configuration the
            calculator uses.
          </p>

          <h3>Income tax bands — England, Wales &amp; Northern Ireland ({defaultYear.id})</h3>
          <p>
            You pay no income tax on the first{" "}
            {gbp0.format(defaultYear.personalAllowance)} (your personal
            allowance), then the following rates on taxable income above it:
          </p>
          <BandTable
            caption={`Income tax bands for England, Wales and Northern Ireland, ${defaultYear.label}`}
            bands={defaultYear.bands.ruk}
          />

          <h3>Scottish income tax bands ({defaultYear.id})</h3>
          <p>
            Scottish taxpayers get the same{" "}
            {gbp0.format(defaultYear.personalAllowance)} allowance but
            different bands and rates on non-savings income:
          </p>
          <BandTable
            caption={`Scottish income tax bands, ${defaultYear.label}`}
            bands={defaultYear.bands.scotland}
          />
          <p>
            Above {gbp0.format(defaultYear.paTaperThreshold)} the personal
            allowance shrinks by £1 for every £2 of income (UK-wide), reaching
            zero at £125,140.
          </p>

          <h3>National Insurance ({defaultYear.id})</h3>
          <p>
            Employee Class 1 NI is{" "}
            {Math.round(defaultYear.employeeNi.mainRate * 100)}% of earnings
            between {gbp0.format(defaultYear.employeeNi.primaryThreshold)} and{" "}
            {gbp0.format(defaultYear.employeeNi.upperEarningsLimit)} a year,
            and {Math.round(defaultYear.employeeNi.upperRate * 100)}% above
            that. NI rates are the same across the whole UK and are not reduced
            by ordinary pension contributions.
          </p>

          <h3>Student loan thresholds ({defaultYear.id})</h3>
          <ul>
            <li>
              Plan 1 — 9% above{" "}
              {gbp0.format(defaultYear.studentLoans.plan1.threshold)} a year
            </li>
            <li>
              Plan 2 — 9% above{" "}
              {gbp0.format(defaultYear.studentLoans.plan2.threshold)} a year
            </li>
            <li>
              Plan 4 — 9% above{" "}
              {gbp0.format(defaultYear.studentLoans.plan4.threshold)} a year
            </li>
            {defaultYear.studentLoans.plan5 ? (
              <li>
                Plan 5 — 9% above{" "}
                {gbp0.format(defaultYear.studentLoans.plan5.threshold)} a year
                (first deductions began 6 April 2026)
              </li>
            ) : null}
            <li>
              Postgraduate loan — 6% above{" "}
              {gbp0.format(defaultYear.studentLoans.postgrad.threshold)} a year
            </li>
          </ul>

          <h3>What the calculator assumes</h3>
          <ul>
            <li>
              Your salary is your only income and you have the standard tax
              code with no benefits in kind, marriage allowance or blind
              person&apos;s allowance.
            </li>
            <li>
              Pension contributions use a net pay arrangement — they reduce
              income tax only, not NI or student loans.
            </li>
            <li>
              Everything is calculated on an annual basis; payroll calculates
              per pay period, so payslips can differ by small amounts.
            </li>
          </ul>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          This is an illustrative estimate, not financial or tax advice. Tax
          rules and rates can change at any time. Figures were last verified
          against GOV.UK on {defaultYear.lastVerified}. Check your own position
          on{" "}
          <a
            href="https://www.gov.uk/income-tax-rates"
            rel="noopener noreferrer"
            target="_blank"
          >
            GOV.UK
          </a>{" "}
          or with a qualified adviser.
        </>
      }
    >
      <SalaryCalculator />
    </ToolLayout>
  );
}
