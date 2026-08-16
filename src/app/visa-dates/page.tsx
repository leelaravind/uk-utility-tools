
import { ToolLayout } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/registry";
import { VisaDatesTool } from "@/components/tools/visa-dates/VisaDatesTool";

export const metadata = pageMetadata({
  title:
    "Visa Date Calculator — Days Remaining, Countdown & Reminders",
  description:
    "Count the days remaining on a visa, see how much of the period has elapsed and download .ics calendar reminders. A date calculator only — not immigration advice.",
  path: "/visa-dates",
});

const FAQS = [
  {
    question: "Is this immigration advice?",
    answer:
      "No. This tool does simple, transparent date arithmetic on the dates you type in — nothing more. It does not know your visa type, conditions or history, and it cannot tell you when to apply, extend or leave. For anything that matters, check official UKVI guidance on GOV.UK or speak to a regulated immigration adviser (OISC-registered) or solicitor.",
  },
  {
    question: "Does the countdown include the expiry day itself?",
    answer:
      "The calculator treats the visa as valid up to and including the expiry date, and shows it as expired from the following day — the convention most UK visas follow, where permission ends at the end of the stated day. Your own document is the authority: always check the exact wording on your BRP, eVisa or decision letter.",
  },
  {
    question: "Why are the weeks and months labelled approximate?",
    answer:
      "Days are exact; weeks and months are conveniences. Weeks are the day count divided by 7 and rounded down, and months use the average month length of 30.44 days. Calendar months vary between 28 and 31 days, so 90 days is not exactly 3 months — which is why official processes count in days.",
  },
  {
    question: "What is an .ics file and how do I use it?",
    answer:
      "An .ics file is the standard calendar format that Google Calendar, Outlook and Apple Calendar all understand. Download the reminder, then open the file (or import it in your calendar app) and the all-day event is added. The file is generated on your device — no calendar account is connected and nothing is uploaded.",
  },
  {
    question: "Where do I check my real visa expiry date?",
    answer:
      "On your physical BRP card if you have one, or in your UKVI account for an eVisa — sign in via GOV.UK ('view and prove your immigration status') to see your current permission and its end date. If the date there differs from what you expected, rely on the official record, not on memory or this calculator.",
  },
  {
    question: "Is anything I enter stored?",
    answer:
      "No. The dates you enter are processed in your browser and are not uploaded, stored or logged. Refreshing the page clears them.",
  },
];

export default function VisaDatesPage() {
  return (
    <ToolLayout
      tool={getTool("visa-dates")!}
      explanation={
        <>
          <h3>How the countdown is calculated</h3>
          <p>
            Every date is interpreted as a whole calendar day, so the maths is
            exact and unaffected by time zones or daylight saving:
          </p>
          <ul>
            <li>
              <strong>Days remaining</strong> — whole days from today until the
              expiry date (0 once expired).
            </li>
            <li>
              <strong>Days used</strong> — whole days from the start date until
              today, never exceeding the total length of the visa.
            </li>
            <li>
              <strong>Percentage elapsed</strong> — days used divided by the
              total days from start to expiry, shown to one decimal place.
              Leap years (such as 2028) are handled correctly, so a full leap
              year counts as 366 days.
            </li>
            <li>
              <strong>Weeks and months</strong> — approximations for a quick
              sense of scale: days ÷ 7 for weeks and days ÷ 30.44 (the average
              month) for months.
            </li>
          </ul>
          <p>
            The visa is treated as valid through the whole of the expiry date
            and expired from the day after — check your own documents for the
            exact conditions that apply to you.
          </p>
          <h3>Calendar reminders</h3>
          <p>
            The download buttons generate a standard .ics calendar file on your
            device containing an all-day event — one for the expiry date
            itself, and optionally one for a reminder date you choose (many
            people set it around three months before expiry, since extension
            applications and document renewals take time to prepare). Open the
            file in Google Calendar, Outlook or Apple Calendar to add the
            event. Because the file is built locally, no calendar account is
            ever connected to this site.
          </p>
          <h3>Staying on the right side of the dates</h3>
          <p>
            Whatever this countdown shows, the official record wins: check your
            BRP or eVisa via your UKVI account on GOV.UK, note any conditions
            attached to your permission, and if you plan to extend or switch,
            read the official guidance early — some applications must be made
            before your current permission ends. This page cannot advise on any
            of that; it just keeps the arithmetic honest.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          Date calculator only — not immigration advice. It performs simple
          arithmetic on the dates you enter and knows nothing about your visa
          type or conditions. The dates you enter may differ from your actual
          permission: always check your BRP or eVisa and official UKVI guidance
          on GOV.UK, and consider regulated immigration advice before making
          any decisions.
        </>
      }
    >
      <VisaDatesTool />
    </ToolLayout>
  );
}
