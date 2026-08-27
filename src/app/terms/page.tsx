import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

import { SITE_NAME } from "@/lib/registry";

export const metadata = pageMetadata({
  title:
    "Terms of Use",
  description:
    "Terms of use for ITISYOU Tools: all results are estimates for guidance only, not financial, tax, legal or immigration advice. Free service provided as-is.",
  path: "/terms",
});

const sectionHeading =
  "mt-10 text-xl font-semibold tracking-tight text-foreground sm:text-2xl";
const paragraph = "mt-3 text-base leading-relaxed text-muted";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Terms of use
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {SITE_NAME} is a free collection of calculators and utilities. By
        using the site you accept these terms — they are short and written in
        plain words.
      </p>

      <h2 className={sectionHeading}>Everything is an estimate</h2>
      <p className={paragraph}>
        Every result on this site is an estimate or an illustration produced
        from the numbers and text you enter, using simplified assumptions.
        Results are for general guidance only. Always verify anything
        important against an authoritative source before acting on it.
      </p>

      <h2 className={sectionHeading}>Financial tools</h2>
      <p className={paragraph}>
        Pay, debt and money calculators are illustrative. They are not
        financial advice and no result constitutes a recommendation. For
        decisions about borrowing, repayments or your finances, consider
        speaking to a regulated financial adviser.
      </p>

      <h2 className={sectionHeading}>Tax estimates</h2>
      <p className={paragraph}>
        Tax and take-home pay figures are estimates based on published rates
        and thresholds at the time the site was last updated. Tax rules
        change, and individual circumstances (tax codes, benefits in kind,
        other income) can change the outcome significantly. Check{" "}
        <a
          href="https://www.gov.uk"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2"
        >
          GOV.UK
        </a>{" "}
        or speak to an accountant before relying on any figure.
      </p>

      <h2 className={sectionHeading}>Employment tools</h2>
      <p className={paragraph}>
        Shift pay, working hours, overtime and holiday pay tools are general
        calculators, not legal advice. Your actual entitlements depend on
        your employment contract and current UK employment law — check your
        contract and, if in doubt, an organisation such as Acas.
      </p>

      <h2 className={sectionHeading}>Immigration-related dates</h2>
      <p className={paragraph}>
        The visa date tool is a date calculator only — it counts days between
        dates you enter. It is not immigration advice and it knows nothing
        about your visa conditions. Always check your documents and{" "}
        <a
          href="https://www.gov.uk/browse/visas-immigration"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2"
        >
          UKVI guidance
        </a>{" "}
        for anything that matters.
      </p>

      <h2 className={sectionHeading}>Documents</h2>
      <p className={paragraph}>
        The invoice generator produces a document from the details you enter.
        It is your responsibility to check that your invoices meet your legal
        and tax obligations — including VAT rules if you are VAT-registered —
        before sending them.
      </p>

      <h2 className={sectionHeading}>Liability</h2>
      <p className={paragraph}>
        In plain words: this is a free service provided &ldquo;as is&rdquo;,
        without warranties of any kind. We work to keep the tools accurate
        and available, but we do not guarantee either, and we are not liable
        for losses arising from your use of the site or reliance on its
        results. Nothing in these terms excludes liability that cannot be
        excluded under UK law.
      </p>

      <h2 className={sectionHeading}>Changes</h2>
      <p className={paragraph}>
        We may update the tools and these terms over time. Significant
        changes will be reflected on this page. If you have questions,{" "}
        <Link href="/contact" className="text-accent underline underline-offset-2">
          contact us
        </Link>
        .
      </p>
    </div>
  );
}
