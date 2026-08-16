import type { MetadataRoute } from "next";

import { SITE_URL, TOOLS } from "@/lib/registry";

// Required for output: 'export' — the sitemap route must be statically generated.
export const dynamic = "force-static";

const STATIC_PAGES = ["about", "privacy", "terms", "contact"] as const;

/**
 * Static sitemap — generated once at build time (output: 'export').
 * lastModified is the build date for every entry.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...TOOLS.map((tool) => ({
      url: `${SITE_URL}/${tool.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...STATIC_PAGES.map((page) => ({
      url: `${SITE_URL}/${page}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
