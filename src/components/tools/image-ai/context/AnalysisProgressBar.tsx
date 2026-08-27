"use client";

import { Button } from "@/components/ui";
import type { AnalysisProgress } from "@/lib/imageAi/context/types";

/**
 * Progress with a cancel control.
 *
 * Two things this deliberately does NOT do: show a bare spinner for a long
 * download, and blur the difference between fetching engine assets and
 * actually analysing the image. The first run of a session downloads a
 * WebAssembly engine and language data, which is materially slower than every
 * later run, and saying so is the difference between "slow" and "broken".
 */
export interface AnalysisProgressBarProps {
  progress: AnalysisProgress | null;
  onCancel: () => void;
  /** True while a job is genuinely in flight. */
  busy: boolean;
}

export function AnalysisProgressBar({
  progress,
  onCancel,
  busy,
}: AnalysisProgressBarProps) {
  if (!busy) return null;

  const indeterminate = !progress || progress.progress < 0;
  const percent = indeterminate
    ? 0
    : Math.min(100, Math.max(0, Math.round(progress.progress * 100)));
  const label = progress?.label ?? "Working";
  const kindNote =
    progress?.kind === "model"
      ? "Downloading the local engine. This only happens the first time; later images reuse the cached copy."
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="text-sm font-medium text-foreground"
        >
          {label}
          {indeterminate ? "…" : ` — ${percent}%`}
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : percent}
        className="h-2 w-full overflow-hidden rounded-field bg-border"
      >
        <div
          className="h-full rounded-field bg-accent-solid transition-[width] motion-reduce:transition-none"
          style={{ width: indeterminate ? "35%" : `${percent}%` }}
        />
      </div>

      {kindNote ? (
        <p className="text-sm leading-relaxed text-muted">{kindNote}</p>
      ) : null}
    </div>
  );
}
