import type { Metadata } from "next";

import {
  CATEGORIES,
  SITE_TAGLINE,
  getPopularTools,
  getToolsByCategory,
} from "@/lib/registry";
import { ToolSearch } from "@/components/search/ToolSearch";
import { ToolCard } from "@/components/ui/ToolCard";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const popular = getPopularTools();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
      {/* Hero */}
      <section className="pb-10 pt-14 text-center sm:pb-14 sm:pt-20">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {SITE_TAGLINE}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted">
          Free calculators and utilities for work, money, documents and
          everyday life — built for the UK.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-4 text-accent"
          >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
          Private by design — your data never leaves your device.
        </p>
        <div className="mt-8">
          <ToolSearch />
        </div>
      </section>

      {/* Popular tools */}
      <section aria-labelledby="popular-heading" className="py-8">
        <h2
          id="popular-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Popular tools
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* One section per category, in registry order */}
      {CATEGORIES.map((category) => {
        const tools = getToolsByCategory(category.id);
        if (tools.length === 0) return null;
        return (
          <section
            key={category.id}
            id={category.id}
            aria-labelledby={`${category.id}-heading`}
            className="scroll-mt-8 py-8"
          >
            <h2
              id={`${category.id}-heading`}
              className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {category.name}
            </h2>
            <p className="mt-1 text-muted">{category.description}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
