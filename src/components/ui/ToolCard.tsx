import Link from "next/link";

import type { Tool } from "@/lib/registry";
import { ToolIcon } from "./ToolIcon";

export interface ToolCardProps {
  tool: Tool;
  /** Use the shortTitle for tighter grids (e.g. related tools). */
  compact?: boolean;
}

/** Small linked tool card: icon, title, description. */
export function ToolCard({ tool, compact }: ToolCardProps) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group flex items-start gap-3.5 rounded-card border border-border bg-surface p-4 shadow-card transition-[border-color,box-shadow] hover:border-accent-soft-border hover:shadow-pop"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent"
      >
        <ToolIcon icon={tool.icon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
          {compact ? tool.shortTitle : tool.title}
        </span>
        <span className="line-clamp-2 text-sm leading-snug text-muted">
          {tool.description}
        </span>
      </span>
    </Link>
  );
}
