import type { Metadata } from "next";

import { SITE_NAME } from "@/lib/registry";

/**
 * Standard per-page metadata: unique title/description, canonical URL and
 * page-specific Open Graph / Twitter tags (relative URLs resolve against
 * metadataBase set in the root layout).
 *
 * Next.js replaces the whole `openGraph` object when a page defines one, so
 * every page must build its own — otherwise social shares fall back to the
 * site-generic homepage card.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  /** Route path beginning with "/", e.g. "/salary". */
  path: string;
}): Metadata {
  const { title, description, path } = opts;
  const fullTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_GB",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}
