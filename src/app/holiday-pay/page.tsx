import type { Metadata } from "next";

import { getTool } from "@/lib/registry";
import { ToolLayout } from "@/components/ui";
import { HolidayPayCalculator } from "@/components/tools/holiday-pay/HolidayPayCalculator";

export const metadata: Metadata = {
  title: "Holiday Pay Estimator — 5.6 Weeks Rule & 12.07% Accrual",
  description:
    "Estimate UK statutory holiday entitlement and its value: 5.6 weeks for regular hours (28-day cap) or 12.07% accrual for irregular and casual workers.",
  alternates: { canonical: "/holiday-pay" },
};

const FAQS = [
  {
    question: "How much paid holiday am I entitled to in the UK?",
    answer:
      "Almost all workers are legally entitled to 5.6 weeks of paid holiday a year, pro-rated to their working pattern. For a 5-day week that is 28 days; for a 3-day week it is 16.8 days. The statutory entitlement is capped at 28 days, so someone working 6 days a week still gets a maximum of 28 days. Contracts can — and often do — give more.",
  },
  {
    question: "How is the 12.07% holiday accrual worked out?",
    answer:
      "12.07% comes from dividing the 5.6 weeks of statutory holiday by the 46.4 working weeks that remain (52 − 5.6). For leave years starting on or after 1 April 2024, irregular-hours and part-year workers accrue holiday at 12.07% of the hours they work in each pay period, rounded to the nearest whole hour. Rolled-up holiday pay of 12.07% of period pay is also permitted for these workers.",
  },
  {
    question: "Do bank holidays count towards my 5.6 weeks?",
    answer:
      "They can. There is no separate legal right to paid bank holidays in the UK — employers may count them as part of your 5.6-week statutory entitlement or give them on top. Your contract decides, so a '25 days plus bank holidays' package actually exceeds the statutory minimum.",
  },
  {
    question: "How is holiday entitlement calculated for part-time workers?",
    answer:
      "Pro-rata: 5.6 × the days (or hours) you work each week. Working 2 days a week gives 11.2 days of statutory holiday; working 16 hours a week gives 89.6 holiday hours. Part-time workers must not be treated less favourably than full-time colleagues — the entitlement scales with the working pattern, not the job.",
  },
  {
    question: "What rate should holiday pay be paid at?",
    answer:
      "Holiday pay should reflect normal pay. For workers whose pay varies (overtime that is regularly worked, commission and similar), a week's pay is generally averaged over the previous 52 paid weeks. This estimator uses the single hourly rate you enter, so treat the output as a simple estimate rather than a payroll-grade figure.",
  },
  {
    question: "Am I an irregular-hours worker?",
    answer:
      "Broadly, you are an irregular-hours worker if the number of paid hours you work in each pay period is wholly or mostly variable under your contract — typical for zero-hours and many casual roles. Part-year workers have contracts requiring work for only part of the year with unpaid gaps of at least a week, such as term-time-only staff. Both groups use the 12.07% accrual method for leave years starting on or after 1 April 2024.",
  },
];

export default function HolidayPayPage() {
  const tool = getTool("holiday-pay")!;
  return (
    <ToolLayout
      tool={tool}
      faqs={FAQS}
      explanation={
        <>
          <h3>The 5.6 weeks rule (regular hours)</h3>
          <p>
            UK statutory holiday is <strong>5.6 weeks a year</strong>, scaled
            to your working pattern and capped at 28 days:
          </p>
          <ul>
            <li>
              <strong>Days:</strong> 5.6 × days worked per week — 5 days a
              week → 28 days; 2 days a week → 11.2 days.
            </li>
            <li>
              <strong>Hours:</strong> 5.6 × weekly hours — 37.5 hours a week
              → 210 holiday hours.
            </li>
            <li>
              <strong>The cap:</strong> entitlement never exceeds 28 days, so
              a 6-day-week worker gets 28 days (not 33.6).
            </li>
          </ul>
          <p>
            The estimator converts your entitlement to hours (capped days ×
            hours per working day) and values it at your hourly rate.
          </p>
          <h3>The 12.07% method (irregular or casual hours)</h3>
          <p>
            For irregular-hours and part-year workers, with leave years
            starting on or after 1 April 2024, holiday accrues at{" "}
            <strong>12.07% of hours worked in each pay period</strong>,
            rounded to the nearest hour. The figure comes from the statutory
            ratio 5.6 ÷ 46.4. The same percentage may be used for rolled-up
            holiday pay: 12.07% of your gross pay in the period.
          </p>
          <h3>Worked examples</h3>
          <ul>
            <li>
              Full-time, 40 hours over 5 days at £12/hour: 5.6 × 40 = 224
              holiday hours (28 days) ≈ £2,688 a year.
            </li>
            <li>
              Part-time, 16 hours over 2 days: 5.6 × 16 = 89.6 holiday hours
              (11.2 days).
            </li>
            <li>
              Casual worker paid £1,000 gross last month: 12.07% ≈ £120.70
              accrued holiday pay; 100 hours worked ≈ 12 accrued holiday
              hours.
            </li>
          </ul>
          <h3>What this estimator doesn&apos;t do</h3>
          <p>
            It assumes a single steady hourly rate, a full leave year and the
            statutory minimum. It doesn&apos;t average variable pay over 52
            weeks, handle mid-year starters and leavers, or apply contractual
            extras — so treat the results as approximate.
          </p>
        </>
      }
      disclaimer={
        <>
          Estimates only — not legal advice. Holiday entitlement and pay
          depend on your contract, your leave year, when you started, and how
          your pay varies. For your exact position, check your contract, use
          GOV.UK&apos;s official calculator, or speak to your employer or
          Acas.
        </>
      }
    >
      <HolidayPayCalculator />
    </ToolLayout>
  );
}
