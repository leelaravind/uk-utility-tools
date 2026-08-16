import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

import { SITE_NAME } from "@/lib/registry";

export const metadata = pageMetadata({
  title:
    "About",
  description:
    "What UK Utility Tools is: free, privacy-first calculators and browser utilities for work, money, documents and everyday tasks. No accounts, no uploads.",
  path: "/about",
});

const sectionHeading =
  "mt-10 text-xl font-semibold tracking-tight text-foreground sm:text-2xl";
const paragraph = "mt-3 text-base leading-relaxed text-muted";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        About {SITE_NAME}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        A collection of straightforward calculators and browser utilities —
        free to use, with no account, no sign-up and no uploads.
      </p>

      <h2 className={sectionHeading}>What this site is</h2>
      <p className={paragraph}>
        {SITE_NAME} is a set of simple, focused tools: pay and hours
        calculators, money estimators, CV and job application helpers, PDF
        and image utilities, QR codes, invoices and a few creator helpers.
        Each tool does one job, explains how the maths is done, and works on
        a phone as well as a desktop.
      </p>
      <p className={paragraph}>
        Everything is built for the UK first: salary estimates use UK tax
        concepts, holiday pay follows the UK&rsquo;s 5.6-week statutory
        approach, and the wording is plain UK English. All figures are
        estimates for guidance — not financial, legal or immigration advice.
      </p>

      <h2 className={sectionHeading}>Who it&rsquo;s for</h2>
      <p className={paragraph}>
        Shift workers checking what a night shift is worth. Freelancers and
        sole traders estimating profit or putting together an invoice. Job
        hunters comparing a CV against a job description. Anyone who needs to
        merge a PDF, shrink an image or make a QR code without handing their
        files to a random website.
      </p>

      <h2 className={sectionHeading}>Privacy first, by design</h2>
      <p className={paragraph}>
        The tools run entirely in your browser. Calculations happen on your
        device; CVs, job descriptions, images, PDFs and invoice details are
        processed locally and never uploaded. There are no accounts, no
        analytics scripts and no advertising cookies. The full detail is in
        our{" "}
        <Link href="/privacy" className="text-accent underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>

      <h2 className={sectionHeading}>Get in touch</h2>
      <p className={paragraph}>
        Found a bug, spotted an out-of-date figure, or have an idea for a new
        tool? See the{" "}
        <Link href="/contact" className="text-accent underline underline-offset-2">
          contact page
        </Link>{" "}
        — feedback genuinely shapes what gets built next.
      </p>
    </div>
  );
}
