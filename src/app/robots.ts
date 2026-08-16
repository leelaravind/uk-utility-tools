import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/registry";

// Required for output: 'export' — the robots route must be statically generated.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
