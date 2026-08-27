"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useRef, useState } from "react";

import { AI_CONTEXT_ENABLED } from "@/config/features";
import { OptimizeImagePanel } from "./OptimizeImagePanel";

/**
 * Image Tools for AI.
 *
 * Two modes were designed to sit here: "Optimize Image" (resize a picture
 * before sending it to a multimodal AI) and "AI Context" (extract meaning
 * locally and send compact text instead). They solve different problems, and
 * when both are available the UI says so explicitly.
 *
 * AI Context is currently behind `AI_CONTEXT_ENABLED`, which is off: its local
 * semantic vision is not operational, so it cannot reliably answer "what is
 * this image?". While the flag is off the mode selector is not rendered at all
 * and this island is simply the optimizer — no disabled tab, no "coming soon"
 * teaser, no way to reach an unfinished feature.
 *
 * PERFORMANCE CONTRACT: the AI Context panel is loaded with a dynamic import,
 * so its OCR client is fetched only if that mode is both enabled and opened.
 * Using the optimizer must never trigger an OCR or model download.
 */

const AiContextPanel = dynamic(
  () => import("./AiContextPanel").then((m) => m.AiContextPanel),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="rounded-field border border-border bg-surface-subtle p-4 text-sm text-muted"
      >
        Loading the AI Context tools…
      </p>
    ),
  },
);

export type ImageAiMode = "optimize" | "context";

const MODES: {
  id: ImageAiMode;
  label: string;
  blurb: string;
}[] = [
  {
    id: "optimize",
    label: "Optimize Image",
    blurb:
      "I still want to send the image itself to an AI, but I want an appropriately sized copy.",
  },
  {
    id: "context",
    label: "AI Context",
    blurb:
      "I want to extract useful meaning locally and send compact text instead of the original image.",
  },
];

export interface ImageAiIslandProps {
  /** Which mode this route opens on. Optimize is the fast, no-download default. */
  defaultMode?: ImageAiMode;
}

function PrivacyBadge() {
  return (
    <p className="flex items-start gap-2.5 rounded-field border border-accent-soft-border bg-accent-soft p-3.5 text-sm font-medium leading-relaxed text-accent-emphasis">
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
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span>
        Processed locally — your image is handled in your browser and is not
        uploaded to our servers or to any AI service.
      </span>
    </p>
  );
}

export function ImageAiIsland({ defaultMode = "optimize" }: ImageAiIslandProps) {
  const [mode, setMode] = useState<ImageAiMode>(defaultMode);
  const tabsId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Roving-tabindex arrow-key navigation, per the ARIA tabs pattern.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const keys: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        Home: -index,
        End: MODES.length - 1 - index,
      };
      const delta = keys[event.key];
      if (delta === undefined) return;
      event.preventDefault();
      const next = MODES[(index + delta + MODES.length) % MODES.length];
      setMode(next.id);
      tabRefs.current[next.id]?.focus();
    },
    [],
  );

  // Single-mode build: no selector, no reachable second mode.
  if (!AI_CONTEXT_ENABLED) {
    return (
      <div className="flex flex-col gap-6">
        <PrivacyBadge />
        <OptimizeImagePanel />
      </div>
    );
  }

  const active = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <div className="flex flex-col gap-6">
      <PrivacyBadge />

      <div>
        <div
          role="tablist"
          aria-label="Image tool mode"
          className="flex flex-wrap gap-2"
        >
          {MODES.map((item, index) => {
            const selected = item.id === mode;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setMode(item.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={[
                  "inline-flex h-11 items-center justify-center rounded-field border px-5 text-base font-medium transition-colors",
                  selected
                    ? "border-accent-soft-border bg-accent-solid text-accent-fg"
                    : "border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          {active.blurb}
        </p>
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel-${mode}`}
        aria-labelledby={`${tabsId}-tab-${mode}`}
        tabIndex={0}
      >
        {mode === "optimize" ? <OptimizeImagePanel /> : <AiContextPanel />}
      </div>
    </div>
  );
}
