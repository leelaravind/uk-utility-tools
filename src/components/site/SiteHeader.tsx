import Link from "next/link";

import { SITE_NAME } from "@/lib/registry";

const NAV_LINK_CLASSES =
  "inline-flex h-11 items-center rounded-field px-3.5 text-sm font-medium text-muted transition-colors hover:bg-surface-subtle hover:text-foreground";

/** Server component — minimal site header with wordmark and nav. */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-field text-base font-semibold tracking-tight text-foreground"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-accent-solid text-accent-fg"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </span>
          {SITE_NAME}
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            <li>
              <Link href="/" className={NAV_LINK_CLASSES}>
                Tools
              </Link>
            </li>
            <li>
              <Link href="/about" className={NAV_LINK_CLASSES}>
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
