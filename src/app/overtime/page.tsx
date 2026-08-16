import type { Metadata } from "next";

import { getTool } from "@/lib/registry";
import { ToolLayout } from "@/components/ui";
import { OvertimeCalculator } from "@/components/tools/overtime/OvertimeCalculator";

export const metadata: Metadata = {
  title: "Overtime Pay Calculator — Time and a Half, Double Time & Custom Rates",
  description:
    "Calculate overtime pay with time and a half, double time, a custom multiplier or a specific overtime rate. See normal pay, overtime pay and the weekly total.",
  alternates: { canonical: "/overtime" },
};

const FAQS = [
  {
    question: "How do I calculate time and a half?",
    answer:
      "Multiply your normal hourly rate by 1.5, then by your overtime hours. On £12 per hour, time and a half is £18 per hour, so 5 overtime hours earn £90. This calculator does that automatically: choose the 1.5× multiplier, enter your standard and actual hours, and the split between normal and overtime pay is shown instantly.",
  },
  {
    question: "Is my employer legally required to pay extra for overtime?",
    answer:
      "No. UK law does not set a minimum overtime rate — many employers pay plain time, and some pay nothing beyond contracted salary. The only legal requirement is that your average hourly pay across all hours worked must not fall below the National Minimum Wage / National Living Wage. Your contract sets the actual overtime terms.",
  },
  {
    question: "What counts as overtime hours in this calculator?",
    answer:
      "Any hours you actually worked beyond your standard weekly hours. If your contract says 37.5 hours and you worked 42.5, the calculator treats 37.5 as normal hours and 5 as overtime. If you worked fewer hours than standard, overtime is simply zero.",
  },
  {
    question: "What is double time and when is it paid?",
    answer:
      "Double time is overtime at twice your normal rate — £12 per hour becomes £24. It is most common for bank holidays, Sundays in some sectors, or call-outs, but it is entirely a matter of contract or collective agreement, not law. Select the 2× option to model it.",
  },
  {
    question: "Can I enter a specific overtime rate instead of a multiplier?",
    answer:
      "Yes — switch to 'a specific overtime hourly rate' and type the exact rate from your contract. That is useful when overtime is a fixed enhanced rate rather than a multiple of base pay, or when different overtime bands make an average rate easier.",
  },
  {
    question: "Is the result before or after tax?",
    answer:
      "Before. The total is estimated gross pay for the week. Overtime is taxed like normal earnings through PAYE, so your take-home increase will be smaller than the gross figure — use our salary calculator to estimate the net effect.",
  },
];

export default function OvertimePage() {
  const tool = getTool("overtime")!;
  return (
    <ToolLayout
      tool={tool}
      faqs={FAQS}
      explanation={
        <>
          <h3>How the calculation works</h3>
          <p>
            The calculator splits your week into normal hours and overtime
            hours, then prices each part separately:
          </p>
          <ul>
            <li>
              <strong>Normal hours</strong> = the lower of hours worked and
              your standard weekly hours, paid at your standard rate.
            </li>
            <li>
              <strong>Overtime hours</strong> = anything you worked above the
              standard, paid at your standard rate × the multiplier (or at the
              specific overtime rate you enter).
            </li>
          </ul>
          <p>
            Money is worked out in pence and each line is rounded to the
            nearest penny, so the breakdown always adds up to the total.
          </p>
          <h3>Worked example</h3>
          <p>
            £15 per hour, 37.5 standard hours, 42.5 hours actually worked, at
            time and a half:
          </p>
          <ul>
            <li>Normal pay: 37.5 × £15.00 = £562.50</li>
            <li>Overtime: 5 hours × £22.50 (£15 × 1.5) = £112.50</li>
            <li>
              <strong>Estimated gross week: £675.00</strong>
            </li>
          </ul>
          <h3>Common overtime rates in the UK</h3>
          <p>
            Time and a quarter (1.25×), time and a half (1.5×) and double time
            (2×) are the usual contractual rates. None of them is required by
            law — the legal floor is only that your average pay per hour
            stays at or above the National Minimum Wage. Salaried staff often
            have no paid overtime at all; check your contract before relying
            on an estimate.
          </p>
        </>
      }
      disclaimer={
        <>
          Estimates of gross pay only, before tax and deductions. Overtime
          entitlement and rates are set by your employment contract — check
          your contract or ask your employer for the terms that apply to you.
        </>
      }
    >
      <OvertimeCalculator />
    </ToolLayout>
  );
}
