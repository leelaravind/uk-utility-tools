import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

import { SITE_NAME } from "@/lib/registry";

export const metadata = pageMetadata({
  title:
    "Privacy Policy",
  description:
    "How UK Utility Tools handles your data: everything runs in your browser, nothing is uploaded, no accounts and no analytics. Plain-English privacy policy.",
  path: "/privacy",
});

const sectionHeading =
  "mt-10 text-xl font-semibold tracking-tight text-foreground sm:text-2xl";
const paragraph = "mt-3 text-base leading-relaxed text-muted";
const list = "mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Privacy policy
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        The short version: your data stays on your device. {SITE_NAME} has no
        accounts, no analytics scripts and no uploads. What you type into the
        tools never leaves your browser.
      </p>

      <h2 className={sectionHeading}>Everything runs in your browser</h2>
      <p className={paragraph}>
        The tools on this site are delivered as static pages. Once a page has
        loaded, the work happens locally on your device:
      </p>
      <ul className={list}>
        <li>
          <strong className="text-foreground">Calculators</strong> (pay,
          hours, tax estimates, debt payoff and the rest) run entirely in
          your browser. The numbers you type are never sent anywhere.
        </li>
        <li>
          <strong className="text-foreground">CV and job text</strong> pasted
          into the career tools is analysed on-device. Your CV is never
          uploaded to a server.
        </li>
        <li>
          <strong className="text-foreground">Images and PDFs</strong> are
          compressed, resized, merged and split on-device using code running
          in your browser. Your files are never uploaded.
        </li>
        <li>
          <strong className="text-foreground">Invoice details</strong> stay
          in your browser. Nothing you enter into the invoice generator is
          stored on a server.
        </li>
      </ul>

      <h2 className={sectionHeading}>No accounts, no tracking by us</h2>
      <ul className={list}>
        <li>No accounts and no sign-up — we never ask who you are.</li>
        <li>No analytics scripts in this version of the site.</li>
        <li>No fingerprinting.</li>
        <li>The application itself sets no cookies.</li>
        <li>
          The numbers, text and files you put into the tools are processed
          on your device and never sent to us or to advertisers.
        </li>
      </ul>

      <h2 className={sectionHeading}>Advertising</h2>
      <p className={paragraph}>
        To keep the tools free, the site loads the Google AdSense script
        (pagead2.googlesyndication.com). Loading that script means your
        browser makes a request to Google, which — like any web request —
        includes your IP address and user agent. If and when adverts are
        shown, Google may set cookies or use similar technologies to serve
        and measure ads; where consent is required (for example in the UK
        and EEA), a consent prompt will be shown before any personalised
        advertising cookies are used. Advertising never sees what you type
        into the tools — that stays on your device.
      </p>
      <p className={paragraph}>
        Third-party vendors, including Google, use cookies to serve ads
        based on a user&rsquo;s prior visits to this website or other
        websites. Google&rsquo;s use of advertising cookies enables it and
        its partners to serve ads to you based on your visits to this site
        and/or other sites on the internet.
      </p>
      <p className={paragraph}>
        You may opt out of personalised advertising by visiting{" "}
        <a
          href="https://adssettings.google.com"
          rel="noopener noreferrer"
          target="_blank"
          className="text-accent underline underline-offset-2"
        >
          Google Ads Settings
        </a>
        , and opt out of some other third-party vendors&rsquo; use of
        cookies for personalised advertising by visiting{" "}
        <a
          href="https://www.aboutads.info/choices"
          rel="noopener noreferrer"
          target="_blank"
          className="text-accent underline underline-offset-2"
        >
          www.aboutads.info/choices
        </a>
        .
      </p>

      <h2 className={sectionHeading}>Hosting and server logs</h2>
      <p className={paragraph}>
        The site is served through Cloudflare. Like any website, the hosting
        infrastructure receives standard web request information — such as
        your IP address and browser user agent — in order to deliver the
        pages. That information appears in ordinary server logs; we add no
        tracking of our own on top of it, and we do not use it to identify or
        profile visitors.
      </p>

      <h2 className={sectionHeading}>What we can&rsquo;t see</h2>
      <p className={paragraph}>
        Because the tools run on your device, we have no visibility of what
        you type or which files you process. We cannot see your salary
        figures, your CV, your invoices, your images or your PDFs — by
        design, that data never reaches us.
      </p>

      <h2 className={sectionHeading}>Changes to this policy</h2>
      <p className={paragraph}>
        If the way the site works changes — for example, if the site adds
        analytics or changes how advertising works — this page will be
        updated first, in the same plain language. The description above
        matches how the site actually works today.
      </p>

      <h2 className={sectionHeading}>Questions</h2>
      <p className={paragraph}>
        Anything unclear, or something on this page that doesn&rsquo;t match
        what you observe? Please{" "}
        <Link href="/contact" className="text-accent underline underline-offset-2">
          get in touch
        </Link>
        .
      </p>
    </div>
  );
}
