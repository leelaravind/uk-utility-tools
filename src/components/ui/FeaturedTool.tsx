import Link from "next/link";

import type { Tool } from "@/lib/registry";
import { ToolIcon } from "./ToolIcon";

export interface FeaturedToolProps {
  tool: Tool;
  /** Short label on the badge, e.g. "Most useful". */
  badge?: string;
  /**
   * Longer pitch shown instead of the registry description. The registry
   * description is written for a small card; the hero slot has room to say
   * more about why this tool is worth opening.
   */
  pitch?: string;
  /** Call-to-action label. */
  cta?: string;
}

/**
 * The single highlighted tool at the top of the landing page.
 *
 * Deliberately a different shape from `ToolCard` — full width, larger type and
 * an explicit call to action — so it reads as a recommendation rather than
 * just the first item in a grid.
 */
export function FeaturedTool({
  tool,
  badge = "Most useful",
  pitch,
  cta = "Open the tool",
}: FeaturedToolProps) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group block rounded-card border border-accent-soft-border bg-accent-soft p-5 shadow-card transition-[border-color,box-shadow] hover:shadow-pop sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-field bg-surface text-accent shadow-card sm:size-14"
        >
          <ToolIcon icon={tool.icon} className="size-6 sm:size-7" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-solid px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-fg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5"
            >
              <path d="M12 3l2.35 5.76 6.15.45-4.73 3.99 1.5 6.05L12 16.9l-5.27 2.35 1.5-6.05L3.5 9.21l6.15-.45z" />
            </svg>
            {badge}
          </span>

          <h2 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-2xl">
            {tool.title}
          </h2>

          <p className="text-base leading-relaxed text-muted">
            {pitch ?? tool.description}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-field bg-accent-solid px-5 text-base font-medium text-accent-fg transition-colors group-hover:bg-accent-solid-hover"
        >
          {cta}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
