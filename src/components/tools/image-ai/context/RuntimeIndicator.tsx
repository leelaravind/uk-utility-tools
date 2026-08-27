"use client";

import {
  capabilityRows,
  tierDescription,
  tierLabel,
  type RuntimeCapabilities,
  type RuntimeTier,
} from "@/lib/imageAi/context/capabilities";

/**
 * Shows which local runtime the analysis will use, and why.
 *
 * The badge is never the only signal — the tier name is written out and the
 * detail panel lists the measured capabilities, so nothing is communicated by
 * colour alone.
 */
export interface RuntimeIndicatorProps {
  capabilities: RuntimeCapabilities;
  tier: RuntimeTier;
}

const TIER_CLASSES: Record<RuntimeTier, string> = {
  A: "border-accent-soft-border bg-accent-soft text-accent-emphasis",
  B: "border-border-strong bg-surface-subtle text-foreground",
  C: "border-border-strong bg-surface-subtle text-muted",
};

export function RuntimeIndicator({
  capabilities,
  tier,
}: RuntimeIndicatorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Runtime</span>
        <span
          className={[
            "inline-flex items-center rounded-field border px-2.5 py-1 text-sm font-medium",
            TIER_CLASSES[tier],
          ].join(" ")}
        >
          {tierLabel(tier)}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        {tierDescription(tier)}
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-accent">
          What did the browser report?
        </summary>
        <dl className="mt-2 flex flex-col">
          {capabilityRows(capabilities).map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-t border-border py-1.5"
            >
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-right text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
