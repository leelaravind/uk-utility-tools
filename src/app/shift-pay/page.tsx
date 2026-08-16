
import { getTool } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";
import { ToolLayout } from "@/components/ui";
import { ShiftPayCalculator } from "@/components/tools/shift-pay/ShiftPayCalculator";

export const metadata = pageMetadata({
  title:
    "Shift Pay Calculator — Night Shifts, Breaks & Overtime",
  description:
    "Work out estimated pay for any shift: overnight hours, unpaid breaks, night and weekend premiums, and overtime uplift. Free, private, no sign-up.",
  path: "/shift-pay",
});

const FAQS = [
  {
    question: "How is night shift pay calculated?",
    answer:
      "There is no separate legal night rate in the UK — night pay is your normal hourly rate plus whatever premium your contract offers (for example £2 extra per hour between 22:00 and 06:00). This calculator multiplies your paid hours by your base rate, then adds the premium for the minutes that fall inside your employer's night window. Night workers must still average at least the National Minimum Wage.",
  },
  {
    question: "Do unpaid breaks reduce my shift pay?",
    answer:
      "Yes. Unpaid break minutes are deducted from your elapsed time before pay is worked out, so an 8-hour shift with a 30-minute unpaid break is paid for 7 hours 30 minutes. Workers over 18 are entitled to a 20-minute rest break on shifts over 6 hours, but the law does not require that break to be paid — your contract decides.",
  },
  {
    question: "How does the calculator handle overnight shifts?",
    answer:
      "Turn on 'Overnight shift' and the finish time is treated as the following day, so 22:00 to 06:00 counts as 8 hours. Night premium windows that cross midnight (like 22:00–06:00) are also handled correctly, including shifts that only clip the early-morning part of the window.",
  },
  {
    question: "What is time and a half?",
    answer:
      "Time and a half means overtime paid at 1.5 times your normal hourly rate, so £12 per hour becomes £18 for overtime hours. In this calculator, hours beyond your overtime threshold earn your rate times the multiplier, and the uplift (the extra above base pay) is shown as its own line so you can see exactly what the overtime added.",
  },
  {
    question: "Is there a legal right to extra pay for weekends or nights?",
    answer:
      "No. UK law sets no automatic premium for weekend or night work — premiums come from your employment contract or a collective agreement. The only legal floor is the National Minimum Wage / National Living Wage across your average hourly pay. Check your contract for the premiums that apply to you, then enter them here.",
  },
  {
    question: "Is the result my take-home pay?",
    answer:
      "No — the result is estimated gross pay for the shift, before income tax, National Insurance, pension contributions and any other deductions. Use our salary calculator to estimate take-home pay from your total earnings.",
  },
];

export default function ShiftPayPage() {
  const tool = getTool("shift-pay")!;
  return (
    <ToolLayout
      tool={tool}
      faqs={FAQS}
      explanation={
        <>
          <h3>The basic maths</h3>
          <p>
            The calculator works on a minute-by-minute timeline. It takes the
            time between your start and finish (adding a day when the shift is
            overnight), subtracts your unpaid break, and multiplies the paid
            minutes by your hourly rate:
          </p>
          <p>
            <strong>base pay = (elapsed time − unpaid break) × hourly rate</strong>
          </p>
          <h3>Night premiums and overnight shifts</h3>
          <p>
            A night premium is extra pay per hour worked inside a night window
            — commonly 22:00 to 06:00, which is the default here and matches
            the definition of night time in the Working Time Regulations. The
            calculator measures exactly how many of your shift&apos;s minutes
            fall inside the window, even when the window wraps midnight, the
            shift wraps midnight, or both. An 18:00–02:00 shift against a
            22:00–06:00 window earns the premium on 4 hours only.
          </p>
          <h3>How unpaid breaks interact with the night premium</h3>
          <p>
            Employers rarely record whether your break fell inside or outside
            the night window, so this tool uses a simple proportional rule:
            break minutes reduce the premium-eligible minutes in proportion to
            the shift&apos;s night share. If half your shift is inside the
            window, half of your break is assumed to be too. Formally:
          </p>
          <p>
            <strong>
              eligible night minutes = night overlap × (paid minutes ÷ elapsed
              minutes)
            </strong>
          </p>
          <p>
            For a shift entirely inside the window this simply pays the premium
            on all paid hours. If your employer applies a different rule (for
            example deducting the break from day hours first), your payslip may
            differ slightly.
          </p>
          <h3>Weekend premium and overtime</h3>
          <p>
            Ticking &quot;weekend shift&quot; adds the weekend premium to every
            paid hour. Overtime applies to paid hours beyond your threshold:
            those hours earn rate × multiplier, and the calculator shows the
            uplift — the extra above base pay — as a separate line. Premiums
            are not multiplied by the overtime rate.
          </p>
          <h3>Worked example</h3>
          <p>
            A 22:00–06:00 shift with a 30-minute unpaid break at £12.50 per
            hour, with a £2 per hour night premium covering the whole shift:
          </p>
          <ul>
            <li>Elapsed time: 8h — unpaid break 30m — paid 7h 30m</li>
            <li>Base pay: 7.5 × £12.50 = £93.75</li>
            <li>Night premium: 7.5 × £2.00 = £15.00</li>
            <li>
              <strong>Estimated gross shift pay: £108.75</strong>
            </li>
          </ul>
        </>
      }
      disclaimer={
        <>
          All figures are estimates of gross pay for guidance only, before tax
          and other deductions. Premium, break and overtime rules are set by
          your contract or collective agreement — check with your employer or
          payslip for the rules that actually apply to you.
        </>
      }
    >
      <ShiftPayCalculator />
    </ToolLayout>
  );
}
