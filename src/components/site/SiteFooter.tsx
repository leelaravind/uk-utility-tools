import Link from "next/link";

import { SITE_NAME } from "@/lib/registry";

const FOOTER_LINK_CLASSES =
  "inline-flex items-center py-2 text-sm text-muted transition-colors hover:text-foreground";

/** Server component — site footer with nav and the privacy statement. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            <li>
              <Link href="/" className={FOOTER_LINK_CLASSES}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" className={FOOTER_LINK_CLASSES}>
                About
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={FOOTER_LINK_CLASSES}>
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={FOOTER_LINK_CLASSES}>
                Terms
              </Link>
            </li>
            <li>
              <Link href="/contact" className={FOOTER_LINK_CLASSES}>
                Contact
              </Link>
            </li>
            <li>
              <a href="/sitemap.xml" className={FOOTER_LINK_CLASSES}>
                Sitemap
              </a>
            </li>
          </ul>
        </nav>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
          Your data stays on your device — every tool runs entirely in your
          browser. Nothing you type is uploaded or stored on a server.
        </p>
        <p className="mt-3 text-sm text-faint">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
