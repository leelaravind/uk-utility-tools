
import { CreditCardCalculator } from "@/components/tools/credit-card/CreditCardCalculator";
import { pageMetadata } from "@/lib/seo";
import { ToolLayout } from "@/components/ui";
import { getTool } from "@/lib/registry";

export const metadata = pageMetadata({
  title:
    "Credit Card Payoff Calculator — How Long to Clear a Balance & Total Interest",
  description:
    "See how long a credit card balance takes to clear, the total interest you'd pay, and the monthly payment needed to be debt-free by a target date.",
  path: "/credit-card",
});

const FAQS = [
  {
    question: "How does the calculator work out the interest?",
    answer:
      "It uses a simple monthly model: each month the balance is charged interest at the APR divided by 12, your payment is subtracted, and the process repeats until the balance reaches zero. Real card issuers usually compound interest daily on your statement balance, so treat the result as a close illustration rather than an exact match to your statements.",
  },
  {
    question: "Why does paying only the minimum take so long?",
    answer:
      "Minimum payments are typically a small percentage of the balance, so most of each payment goes on interest rather than reducing what you owe. As the balance falls the minimum payment often falls too, stretching repayment over many years. Fixing your payment at today's amount — or anything higher — dramatically shortens the payoff time and cuts the total interest.",
  },
  {
    question: "What happens if my payment is less than the monthly interest?",
    answer:
      "The balance grows instead of shrinking and would never be cleared. The calculator detects this and shows the minimum monthly amount you would need just to clear the balance within 50 years — in practice you would want to pay considerably more, or look at options such as a 0% balance transfer.",
  },
  {
    question: "Does the calculator handle 0% interest cards?",
    answer:
      "Yes — with a 0% APR the maths is exact: months to clear is simply the balance divided by your monthly payment, with a smaller final payment for any remainder, and total interest is £0. This is useful for planning repayments within a 0% balance-transfer promotional window.",
  },
  {
    question: "Is extra spending on the card included?",
    answer:
      "No. The projection assumes you stop adding new purchases and make the same payment every month. New spending, cash withdrawals, fees or a change in your APR would all extend the payoff time, so treat the result as a best-case plan for the balance you have today.",
  },
];

export default function CreditCardPage() {
  const tool = getTool("credit-card")!;

  return (
    <ToolLayout
      tool={tool}
      explanation={
        <>
          <p>
            The calculator has two modes. <strong>How long to clear it</strong>{" "}
            takes your balance, APR and a fixed monthly payment and simulates
            month by month until the balance reaches zero — showing the months
            needed, the projected payoff date, the total interest and a full
            amortisation schedule. <strong>Payment for a target date</strong>{" "}
            works backwards: tell it how many months you want, and it solves
            for the monthly payment using the standard annuity formula, then
            verifies the answer by running the same simulation.
          </p>

          <h3>The monthly interest model</h3>
          <p>
            Each month, interest is added at the monthly rate (APR ÷ 12), then
            your payment is subtracted:
          </p>
          <ul>
            <li>monthly rate = APR ÷ 12 (24% APR → 2% a month)</li>
            <li>interest this month = balance × monthly rate</li>
            <li>new balance = balance + interest − payment</li>
          </ul>
          <p>
            All arithmetic is done in whole pence, and the final month&apos;s
            payment is reduced to exactly clear the balance. Card issuers
            usually compound interest daily and apply payments on statement
            dates, so real statements will differ slightly — the shape and
            scale of the answer, though, will be very close.
          </p>

          <h3>The minimum payment trap</h3>
          <p>
            If your payment only just covers the interest, almost nothing
            comes off the balance. For example, £2,500 at 24.9% APR accrues
            about £51 of interest in the first month — a £60 payment would
            leave you in debt for decades, while £150 a month clears it in
            under two years. Small increases in the monthly payment have an
            outsized effect on both the payoff time and the total interest
            paid.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          Illustrative estimate only. Your card issuer may calculate interest
          differently — most UK cards compound daily, charge fees, and require
          a minimum payment that changes each month. This tool is not debt
          advice; if you are struggling with debt, free help is available from
          services such as{" "}
          <a
            href="https://www.moneyhelper.org.uk"
            rel="noopener noreferrer"
            target="_blank"
          >
            MoneyHelper
          </a>
          .
        </>
      }
    >
      <CreditCardCalculator />
    </ToolLayout>
  );
}
