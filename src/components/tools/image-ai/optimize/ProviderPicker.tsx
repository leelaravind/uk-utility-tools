"use client";

import { useSyncExternalStore } from "react";

import { SelectInput } from "@/components/ui";
import {
  VISION_PROVIDER_PROFILES,
  isProfileStale,
  type VisionProviderProfile,
} from "@/config/imageProviders";

export interface ProviderPickerProps {
  value: string;
  onChange: (id: string) => void;
  profile: VisionProviderProfile;
}

const OPTIONS = VISION_PROVIDER_PROFILES.map((p) => ({
  value: p.id,
  label: `${p.providerLabel} — ${p.modelTier}`,
}));

/** Stable no-op subscription: the answer only needs settling once, on mount. */
function subscribeToNothing(): () => void {
  return () => {};
}

function formatVerified(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Provider and model-tier picker, plus the provenance of whatever number the
 * tool is about to show: how it is worked out, when it was last checked, and
 * where it came from. A provider with no published rule says so instead of
 * showing a figure.
 */
export function ProviderPicker({ value, onChange, profile }: ProviderPickerProps) {
  // The clock is an external system: the page is exported statically, so
  // "is this profile stale?" has to be answered by the visitor's browser and
  // not baked in at build time. The server snapshot deliberately says "not
  // stale" so the prerendered HTML and the first client render agree.
  const stale = useSyncExternalStore(
    subscribeToNothing,
    () => isProfileStale(profile, new Date()),
    () => false,
  );

  return (
    <div className="flex flex-col gap-3">
      <SelectInput
        id="ai-provider"
        label="AI provider and model tier"
        value={value}
        onChange={onChange}
        options={OPTIONS}
        hint={`Which models this covers: ${profile.models}.`}
      />

      {profile.support === "varies" && profile.unsupportedNote ? (
        <p className="rounded-field border border-border bg-surface-subtle px-4 py-3 text-sm leading-relaxed text-foreground">
          {profile.unsupportedNote}
        </p>
      ) : null}

      {stale ? (
        <p
          role="status"
          className="rounded-field border border-danger px-4 py-3 text-sm font-medium leading-relaxed text-danger"
        >
          Estimate may be outdated — provider rules change. Check the provider&apos;s
          own documentation before relying on this figure.
        </p>
      ) : null}

      <details className="rounded-field border border-border bg-surface-subtle px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          How this estimate is worked out
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {profile.calculationMethod}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Last checked against the provider&apos;s documentation on{" "}
          <span className="font-medium text-foreground">
            {formatVerified(profile.lastVerified)}
          </span>
          .{" "}
          <a
            href={profile.source}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words font-medium text-accent underline underline-offset-2"
          >
            {profile.providerLabel} image documentation
          </a>
        </p>
      </details>
    </div>
  );
}
