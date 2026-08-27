
import { SelfEmployedCalculator } from "@/components/tools/self-employed/SelfEmployedCalculator";
import { pageMetadata } from "@/lib/seo";
import { ToolLayout } from "@/components/ui";
import { TAX_YEARS } from "@/config/ukTax";
import { getTool } from "@/lib/registry";

const defaultYear = TAX_YEARS[0];

export const metadata = pageMetadata({
  title:
    "Self-Employed Profit Calculator — Sole Trader Take-Home After Tax & NI",
  description:
    "Estimate sole trader profit from revenue and allowable expenses, with an illustrative UK income tax and Class 4 National Insurance estimate for 2026/27.",
  path: "/self-employed",
});

const gbp0 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const FAQS = [
  {
    question: "How is self-employed profit calculated?",
    answer:
      "Profit is simply your revenue (everything you invoice or sell) minus your allowable business expenses. If you enter weekly or monthly figures the calculator multiplies them by 52 or 12 to get an annual picture. You pay income tax and National Insurance on profit, not on revenue.",
  },
  {
    question: "What counts as an allowable expense?",
    answer:
      "Costs incurred wholly and exclusively for the business — for example stock, materials, business travel, a proportion of home-working costs, accountancy fees, insurance and business phone use. HMRC publishes the full rules; personal spending and most capital purchases follow different rules and are not allowable as day-to-day expenses.",
  },
  {
    question: "What is the £1,000 trading allowance?",
    answer:
      "Instead of deducting actual expenses you can deduct a flat £1,000 trading allowance from your self-employment income. It is worthwhile when your real expenses are under £1,000 — common for small side hustles. You cannot claim both the allowance and actual expenses; this calculator models actual expenses only.",
  },
  {
    question: "How much National Insurance do the self-employed pay?",
    answer:
      "For 2026/27, Class 4 NI is 6% on profits between £12,570 and £50,270 and 2% above that. Compulsory Class 2 was abolished in April 2024: with profits of £7,105 or more you receive a National Insurance credit automatically at no cost, and below that you can pay £3.65 a week voluntarily to protect your State Pension record.",
  },
  {
    question: "Is this what I will actually owe HMRC?",
    answer:
      "No — it is an illustration that assumes self-employment is your only income and you take the standard personal allowance. Employment income, payments on account, pension contributions, the trading allowance, Scottish residence and other reliefs all change the real bill. Use it for planning, then complete a Self Assessment return for the actual figure.",
  },
  {
    question: "Do I need to save for tax as I earn?",
    answer:
      "It is sensible to. Self Assessment tax is paid in arrears (31 January after the tax year, plus payments on account for many people), so setting aside a slice of each payment — often 20–30% of profit for basic-rate traders — avoids a shock bill. This calculator's tax estimate gives you a reasonable percentage to aim for.",
  },
];

export default function SelfEmployedPage() {
  const tool = getTool("self-employed")!;

  return (
    <ToolLayout
      tool={tool}
      explanation={
        <>
          <p>
            Enter your revenue and allowable expenses for a week, month or
            year and the calculator annualises them and shows your estimated
            profit. With the tax option ticked it also applies the{" "}
            <strong>{defaultYear.label}</strong> rates (or 2025/26 if
            selected) to show an illustrative post-tax figure.
          </p>

          <h3>Two halves, and only one of them travels</h3>
          <p>
            <strong>Profit is currency-neutral.</strong> Revenue minus
            allowable expenses is the same subtraction whatever the money is
            called, so you can run the profit side in{" "}
            <strong>GBP (£), USD ($) or EUR (€)</strong>. Nothing is converted
            and no exchange rate is used — only the symbol changes.
          </p>
          <p>
            <strong>The tax estimate is not.</strong> The personal allowance,
            the income tax bands and the Class 4 and Class 2 National
            Insurance thresholds are specific amounts of sterling set by UK
            law. They cannot be applied to another currency by changing the
            symbol in front of them, so selecting USD or EUR switches the UK
            tax estimate off and the calculator shows profit only. Switch back
            to GBP to see the tax figures — which are always displayed in
            pounds.
          </p>
          <h3>The illustrative tax estimate</h3>
          <ul>
            <li>
              <strong>Income tax</strong> — your profit less the{" "}
              {gbp0.format(defaultYear.personalAllowance)} personal allowance
              is taxed at the England, Wales &amp; Northern Ireland rates (
              {defaultYear.bands.ruk
                .map((b) => `${Math.round(b.rate * 100)}%`)
                .join(", ")}
              ). The allowance tapers away above{" "}
              {gbp0.format(defaultYear.paTaperThreshold)}.
            </li>
            <li>
              <strong>Class 4 National Insurance</strong> —{" "}
              {Math.round(defaultYear.class4.mainRate * 100)}% on profits
              between {gbp0.format(defaultYear.class4.lowerProfitsLimit)} and{" "}
              {gbp0.format(defaultYear.class4.upperProfitsLimit)}, then{" "}
              {Math.round(defaultYear.class4.upperRate * 100)}% above.
            </li>
            <li>
              <strong>Class 2 National Insurance</strong> — no longer
              compulsory. Profits at or above{" "}
              {gbp0.format(defaultYear.class2.smallProfitsThreshold)} earn an
              automatic NI credit; below that, voluntary contributions of{" "}
              £{defaultYear.class2.weeklyRate.toFixed(2)} a week are available
              to protect benefit entitlement.
            </li>
          </ul>

          <h3>What it deliberately leaves out</h3>
          <p>
            The estimate assumes self-employment is your only income. It does
            not model employment income alongside self-employment, the £1,000
            trading allowance (an alternative to claiming actual expenses),
            pension contributions, Scottish income tax rates on
            self-employment profits, VAT, payments on account or student loan
            repayments through Self Assessment. Your real Self Assessment
            calculation may differ substantially.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          Illustrative — not tax advice. The estimate assumes this is your
          only income and ignores many real-world factors. Check your actual
          position with{" "}
          <a
            href="https://www.gov.uk/self-employed-national-insurance-rates"
            rel="noopener noreferrer"
            target="_blank"
          >
            GOV.UK
          </a>{" "}
          or a qualified accountant before making decisions.
        </>
      }
    >
      <SelfEmployedCalculator />
    </ToolLayout>
  );
}
