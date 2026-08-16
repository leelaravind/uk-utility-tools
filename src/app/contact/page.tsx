
import { SITE_NAME } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title:
    "Contact",
  description:
    "Get in touch with UK Utility Tools — report a bug, flag an out-of-date figure or suggest a new tool. No forms, no accounts: just email.",
  path: "/contact",
});

/**
 * Placeholder contact address for v1 — may change as the project settles
 * on its final domain setup.
 */
const CONTACT_EMAIL = "hello@itisyou.app";

const sectionHeading =
  "mt-10 text-xl font-semibold tracking-tight text-foreground sm:text-2xl";
const paragraph = "mt-3 text-base leading-relaxed text-muted";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Contact
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {SITE_NAME} has no accounts and no backend, so there is no contact
        form — just email.
      </p>

      <h2 className={sectionHeading}>Email</h2>
      <p className={paragraph}>
        You can reach us at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-accent underline underline-offset-2"
        >
          {CONTACT_EMAIL}
        </a>
        . This address may change as the project evolves — if it ever does,
        this page will always show the current one.
      </p>

      <h2 className={sectionHeading}>What to write in about</h2>
      <p className={paragraph}>
        Feedback and suggestions genuinely shape what gets built next. In
        particular, we&rsquo;d love to hear about:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted">
        <li>Bugs — anything that looks broken or behaves oddly.</li>
        <li>
          Out-of-date figures — for example a tax rate or threshold that has
          changed.
        </li>
        <li>
          Ideas for new tools — a calculator or utility you wish existed.
        </li>
        <li>Anything confusing — if a result needs a better explanation.</li>
      </ul>

      <h2 className={sectionHeading}>A note on privacy</h2>
      <p className={paragraph}>
        Please don&rsquo;t email sensitive personal information — we
        don&rsquo;t need it, and the tools never send us your data in the
        first place. A description of the problem and, if relevant, the
        numbers you entered is plenty.
      </p>
    </div>
  );
}
