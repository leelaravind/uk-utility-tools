"use client";

import { Button } from "@/components/ui";
import { ocrAssetNote } from "@/lib/imageAi/context/ocr/assets";
import { SEMANTIC_VISION_UNAVAILABLE_REASON } from "@/lib/imageAi/context/vision/modelManifest";

/**
 * The "Local processing" indicator and its disclosure.
 *
 * The wording here is the honest version, not the marketing version. It says
 * what stays on the device, what is downloaded, and what this build cannot do.
 * Claims such as "100% private" or "identical to ChatGPT vision" are not made
 * anywhere, because neither is defensible.
 */
export interface PrivacyDetailsProps {
  /** Human-readable storage figure, or null while unknown. */
  storageLabel: string | null;
  onClearModels: () => void;
  clearing: boolean;
  /** Result of the last clear, shown once. */
  clearMessage: string | null;
}

export function PrivacyDetails({
  storageLabel,
  onClearModels,
  clearing,
  clearMessage,
}: PrivacyDetailsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-subtle p-4 sm:p-5">
      <p className="flex items-start gap-2.5 text-sm font-medium leading-relaxed text-accent-emphasis">
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
        <span>Local processing</span>
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer text-accent">
          What does local mean?
        </summary>
        <div className="mt-2 flex flex-col gap-2 leading-relaxed text-muted">
          <p>
            Your image is read by your own browser. It is not uploaded to this
            site, and it is not sent to ChatGPT, Claude, Gemini, Grok, or any
            other AI service. Neither is anything derived from it — the
            recognised text, the generated context and the clipboard output all
            stay on your device.
          </p>
          <p>
            There is no cloud fallback in this tool. If your browser cannot run
            part of the analysis, the result is smaller and says so; it is never
            completed somewhere else.
          </p>
          <p>{ocrAssetNote()}</p>
          <p>
            Nothing about the image is stored. The image, the recognised text
            and the generated context are held in memory only and disappear when
            you clear the image or close the tab. Only the downloaded engine
            files are cached, so a second image does not repeat the download.
          </p>
          <p>{SEMANTIC_VISION_UNAVAILABLE_REASON}</p>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm text-muted">
          Local model storage:{" "}
          <span className="text-foreground">
            {storageLabel ?? "Checking…"}
          </span>
        </p>
        <Button variant="secondary" onClick={onClearModels} disabled={clearing}>
          {clearing ? "Clearing…" : "Clear local models"}
        </Button>
      </div>

      {clearMessage ? (
        <p aria-live="polite" className="text-sm text-muted">
          {clearMessage}
        </p>
      ) : null}
    </div>
  );
}
