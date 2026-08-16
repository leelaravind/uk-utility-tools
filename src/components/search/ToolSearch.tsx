"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TOOLS } from "@/lib/registry";
import { searchTools } from "@/lib/search";
import { ToolCard } from "@/components/ui/ToolCard";

/**
 * Instant search island for the landing page. Results render below the box
 * as the user types; Enter opens the top result.
 */
export function ToolSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const results = useMemo(() => searchTools(query, TOOLS), [query]);
  const trimmed = query.trim();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results.length > 0) {
      router.push(`/${results[0].slug}`);
    }
  }

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="relative mx-auto w-full max-w-xl"
      >
        <label htmlFor="tool-search" className="sr-only">
          Search tools
        </label>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="tool-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${TOOLS.length} free tools…`}
          autoComplete="off"
          aria-controls="tool-search-results"
          className="h-12 w-full rounded-card border border-border-strong bg-surface pl-11 pr-4 text-base text-foreground shadow-card transition-colors placeholder:text-faint"
        />
      </form>

      <p aria-live="polite" role="status" className="sr-only">
        {trimmed
          ? results.length > 0
            ? `${results.length} ${results.length === 1 ? "tool" : "tools"} found. Press Enter to open ${results[0].title}.`
            : "No tools found."
          : ""}
      </p>

      <div id="tool-search-results" className="mx-auto mt-5 w-full max-w-3xl">
        {trimmed ? (
          results.length > 0 ? (
            <ul className="grid gap-3 text-left sm:grid-cols-2">
              {results.map((tool) => (
                <li key={tool.slug}>
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              No tools match “{trimmed}”. Try “pay”, “pdf” or “qr”.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
