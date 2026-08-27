"use client";

import { useCallback, useId, useRef } from "react";

import type { OutputFormat } from "@/lib/imageAi/context/types";

/**
 * The four result views.
 *
 * Every view renders through a React text node inside <pre>. That is the whole
 * XSS story for this tool: recognised text can contain markup, script tags and
 * instructions, and none of it is ever interpreted, because it is never
 * inserted as HTML. There is no `dangerouslySetInnerHTML` anywhere in this
 * feature and there must never be one.
 */
export interface ResultTabsProps {
  active: OutputFormat;
  onChange: (format: OutputFormat) => void;
  /** Already-serialised text for the active tab. */
  content: string;
  /** Shown instead of the content when the active view has nothing in it. */
  emptyMessage?: string;
}

const TABS: { id: OutputFormat; label: string; hint: string }[] = [
  {
    id: "compact",
    label: "Compact",
    hint: "Smallest useful representation. This is the default to paste.",
  },
  {
    id: "balanced",
    label: "Structured JSON",
    hint: "The documented itisyou.image-context/1 schema.",
  },
  {
    id: "detailed",
    label: "Detailed",
    hint: "Adds confidence, classification evidence and processing details.",
  },
  {
    id: "raw-ocr",
    label: "Raw OCR",
    hint: "Exactly what text recognition read, in reading order.",
  },
];

export function ResultTabs({
  active,
  onChange,
  content,
  emptyMessage,
}: ResultTabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const deltas: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        Home: -index,
        End: TABS.length - 1 - index,
      };
      const delta = deltas[event.key];
      if (delta === undefined) return;
      event.preventDefault();
      const next = TABS[(index + delta + TABS.length) % TABS.length];
      onChange(next.id);
      tabRefs.current[next.id]?.focus();
    },
    [onChange],
  );

  const activeTab = TABS.find((tab) => tab.id === active) ?? TABS[0];

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Result format"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={[
                "inline-flex h-10 items-center justify-center rounded-field border px-4 text-sm font-medium transition-colors",
                selected
                  ? "border-accent-soft-border bg-accent-solid text-accent-fg"
                  : "border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <p className="text-sm leading-relaxed text-muted">{activeTab.hint}</p>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        className="max-h-96 overflow-auto rounded-card border border-border bg-surface-subtle p-4"
      >
        {content.length > 0 ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
            {content}
          </pre>
        ) : (
          <p className="text-sm text-muted">
            {emptyMessage ?? "Nothing to show for this view."}
          </p>
        )}
      </div>
    </div>
  );
}
