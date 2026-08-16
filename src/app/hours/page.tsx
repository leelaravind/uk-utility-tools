import type { Metadata } from "next";

import { getTool } from "@/lib/registry";
import { ToolLayout } from "@/components/ui";
import { WorkingHoursCalculator } from "@/components/tools/hours/WorkingHoursCalculator";

export const metadata: Metadata = {
  title: "Working Hours Calculator — Timesheet, Breaks & Decimal Hours",
  description:
    "Add up hours between start and finish times, subtract unpaid breaks and convert to decimal hours. Includes a weekly timesheet mode with optional pay.",
  alternates: { canonical: "/hours" },
};

const FAQS = [
  {
    question: "How do I convert hours and minutes to decimal hours?",
    answer:
      "Divide the minutes by 60 and add them to the hours: 7 hours 30 minutes is 7 + 30÷60 = 7.5 decimal hours, and 7 hours 20 minutes is about 7.33. Payroll and timesheet systems usually want decimal hours, which is why this calculator shows both formats side by side.",
  },
  {
    question: "How does the calculator handle overnight shifts?",
    answer:
      "Tick 'Overnight' and the finish time is treated as the next day, so 22:00 to 06:00 counts as 8 hours rather than showing an error. Each row of the weekly timesheet has its own overnight setting, so you can mix day and night shifts in one week.",
  },
  {
    question: "Should breaks be deducted from my working hours?",
    answer:
      "Only unpaid breaks. Most UK workers over 18 get a 20-minute rest break on shifts over 6 hours, and it is commonly unpaid — but that depends on your contract. Enter the total unpaid break minutes per shift and the calculator subtracts them from the elapsed time to give paid time.",
  },
  {
    question: "What is the legal limit on weekly working hours in the UK?",
    answer:
      "Under the Working Time Regulations, average working time must not exceed 48 hours a week, normally averaged over 17 weeks, unless you have voluntarily opted out in writing. This calculator adds up the hours; if your weekly total is regularly above 48, it may be worth checking your working-time position.",
  },
  {
    question: "Can I use this as a timesheet calculator for payroll?",
    answer:
      "Yes — the weekly mode is a simple time card: one row per shift with start, finish and unpaid break, per-row paid time, and a weekly total in both hours:minutes and decimal hours. Add your hourly rate to see estimated gross pay for the week. Nothing is uploaded or stored — everything runs in your browser.",
  },
];

export default function HoursPage() {
  const tool = getTool("hours")!;
  return (
    <ToolLayout
      tool={tool}
      faqs={FAQS}
      explanation={
        <>
          <h3>How the hours are worked out</h3>
          <p>
            For each shift the calculator measures the time from start to
            finish (adding 24 hours when the shift is overnight), then
            subtracts the unpaid break:
          </p>
          <p>
            <strong>paid time = elapsed time − unpaid break</strong>
          </p>
          <p>
            The result is shown two ways: hours and minutes (7h 30m), and
            decimal hours rounded to two decimal places (7.50) — the format
            most payroll and invoicing systems expect.
          </p>
          <h3>Decimal hours conversion</h3>
          <p>Minutes convert to decimals by dividing by 60. Quick reference:</p>
          <ul>
            <li>15 minutes = 0.25 hours</li>
            <li>20 minutes ≈ 0.33 hours</li>
            <li>30 minutes = 0.50 hours</li>
            <li>45 minutes = 0.75 hours</li>
          </ul>
          <h3>Weekly timesheet mode</h3>
          <p>
            Switch to the weekly timesheet to log every shift in the week.
            Each row supports its own overnight flag and unpaid break, rows
            with no times are simply ignored, and the total is shown in both
            formats. Enter an hourly rate and the calculator also prices the
            week: total paid hours × rate, rounded to the nearest penny.
          </p>
          <h3>Worked example</h3>
          <ul>
            <li>Mon 09:00–17:00, 30m break → 7h 30m (7.50)</li>
            <li>Tue 22:00–06:00 overnight, 60m break → 7h 0m (7.00)</li>
            <li>
              <strong>Week total: 14h 30m = 14.50 decimal hours</strong> — at
              £10/hour that is £145.00 gross.
            </li>
          </ul>
        </>
      }
      disclaimer={
        <>
          Estimates for guidance only. Whether breaks are paid, and how hours
          are rounded for payroll, depends on your contract and your
          employer&apos;s policy — check your contract if the numbers matter.
        </>
      }
    >
      <WorkingHoursCalculator />
    </ToolLayout>
  );
}
