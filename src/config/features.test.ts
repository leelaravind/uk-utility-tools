import { describe, expect, it } from "vitest";

import { AI_CONTEXT_ENABLED, IMAGE_OPTIMIZER_ENABLED } from "./features";
import {
  ALL_TOOLS_INCLUDING_DEVELOPMENT,
  TOOLS,
  getRelatedTools,
  getTool,
} from "@/lib/registry";
import { searchTools } from "@/lib/search";

/**
 * These tests pin the public surface of a feature flag.
 *
 * The point is not to test that `false === false`. It is that every public
 * discovery path — catalogue, search, related links, sitemap source — derives
 * from `TOOLS`, so asserting against `TOOLS` proves a disabled tool cannot leak
 * through any of them. If someone later re-exports the raw array or adds a
 * discovery path that bypasses `TOOLS`, these fail.
 */

const AI_CONTEXT_SLUG = "image-context";

describe("feature flags", () => {
  it("keeps the flags boolean so either state is a one-line change", () => {
    expect(typeof AI_CONTEXT_ENABLED).toBe("boolean");
    expect(typeof IMAGE_OPTIMIZER_ENABLED).toBe("boolean");
  });

  it("never deletes a disabled tool's definition", () => {
    // Disabling must hide, not destroy. The metadata has to survive so the
    // feature can be restored by flipping the flag alone.
    const preserved = ALL_TOOLS_INCLUDING_DEVELOPMENT.find(
      (t) => t.slug === AI_CONTEXT_SLUG,
    );
    expect(preserved).toBeDefined();
    expect(preserved?.title.length).toBeGreaterThan(0);
    expect(preserved?.keywords.length).toBeGreaterThan(0);
  });
});

describe("AI Context public exposure", () => {
  it("matches the flag exactly", () => {
    const inCatalogue = TOOLS.some((t) => t.slug === AI_CONTEXT_SLUG);
    expect(inCatalogue).toBe(AI_CONTEXT_ENABLED);
  });

  it("is not resolvable through the public lookup while disabled", () => {
    if (AI_CONTEXT_ENABLED) return;
    expect(getTool(AI_CONTEXT_SLUG)).toBeUndefined();
  });

  it("is not reachable through instant search while disabled", () => {
    if (AI_CONTEXT_ENABLED) return;
    for (const query of [
      "image context",
      "ai context",
      "screenshot to ai",
      "image to json",
      "ocr",
    ]) {
      const hits = searchTools(query, TOOLS).map((t) => t.slug);
      expect(hits, query).not.toContain(AI_CONTEXT_SLUG);
    }
  });

  it("is not reachable through related-tool links while disabled", () => {
    if (AI_CONTEXT_ENABLED) return;
    for (const tool of TOOLS) {
      const related = getRelatedTools(tool).map((t) => t.slug);
      expect(related, tool.slug).not.toContain(AI_CONTEXT_SLUG);
    }
  });

  it("leaves no dangling related-tool reference anywhere", () => {
    // A tool may *list* a hidden slug in `related`; it must simply not resolve.
    for (const tool of TOOLS) {
      for (const resolved of getRelatedTools(tool)) {
        expect(TOOLS).toContain(resolved);
      }
    }
  });
});

describe("Image Optimizer public exposure", () => {
  it("stays public and does not depend on AI Context", () => {
    const optimizer = TOOLS.find((t) => t.slug === "image-ai-optimizer");
    expect(optimizer).toBeDefined();
    expect(optimizer?.featured).toBe(true);
    expect(optimizer?.popular).toBe(true);
  });

  it("is the featured tool on the landing page", () => {
    const featured = TOOLS.filter((t) => t.featured);
    expect(featured).toHaveLength(1);
    expect(featured[0].slug).toBe("image-ai-optimizer");
  });
});
