"use client";

import { useState } from "react";

import { MergeTab } from "./MergeTab";
import { RangeTab } from "./RangeTab";
import { ReorderTab } from "./ReorderTab";

type TabId = "merge" | "extract" | "remove" | "reorder";

const TABS: { id: TabId; label: string }[] = [
  { id: "merge", label: "Merge" },
  { id: "extract", label: "Split / Extract" },
  { id: "remove", label: "Remove pages" },
  { id: "reorder", label: "Reorder" },
];

export function PdfToolsIsland() {
  const [tab, setTab] = useState<TabId>("merge");

  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2.5 rounded-card border border-accent-soft-border bg-accent-soft p-4 text-sm leading-relaxed text-accent-emphasis">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          <strong className="font-semibold">
            Your PDF stays on your device
          </strong>{" "}
          — files are never uploaded. All processing happens in your browser.
        </span>
      </p>

      <div
        role="group"
        aria-label="Choose a PDF operation"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              "inline-flex h-11 items-center justify-center rounded-field border px-4 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-transparent bg-accent-solid text-accent-fg"
                : "border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-card border border-border bg-surface-subtle p-4 sm:p-5">
        {/* Tabs stay mounted so loaded files survive switching between them. */}
        <div hidden={tab !== "merge"}>
          <MergeTab />
        </div>
        <div hidden={tab !== "extract"}>
          <RangeTab mode="extract" />
        </div>
        <div hidden={tab !== "remove"}>
          <RangeTab mode="remove" />
        </div>
        <div hidden={tab !== "reorder"}>
          <ReorderTab />
        </div>
      </div>
    </div>
  );
}
