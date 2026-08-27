"use client";

import { useCallback, useRef, type UIEvent } from "react";

import { Button } from "@/components/ui";

export type CompareMode = "side-by-side" | "toggle";
export type ComparePane = "original" | "optimised";

export interface ImageCompareProps {
  originalUrl: string;
  originalCaption: string;
  optimisedUrl: string;
  optimisedCaption: string;
  mode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
  pane: ComparePane;
  onPaneChange: (pane: ComparePane) => void;
  /** Percentage of the container width the image is drawn at, 100–800. */
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const ZOOM_MIN = 100;
const ZOOM_MAX = 800;

/**
 * Original vs optimised, either side by side or toggled in place, with a zoom
 * so small text can be checked before downloading. The two panes scroll
 * together, otherwise comparing the same corner of each is guesswork.
 */
export function ImageCompare({
  originalUrl,
  originalCaption,
  optimisedUrl,
  optimisedCaption,
  mode,
  onModeChange,
  pane,
  onPaneChange,
  zoom,
  onZoomChange,
}: ImageCompareProps) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncing = useRef(false);

  const syncScroll = useCallback(
    (from: "left" | "right") => (event: UIEvent<HTMLDivElement>) => {
      if (syncing.current) return;
      const target = from === "left" ? rightRef.current : leftRef.current;
      if (!target) return;
      syncing.current = true;
      target.scrollLeft = event.currentTarget.scrollLeft;
      target.scrollTop = event.currentTarget.scrollTop;
      // Released on the next frame so the mirrored scroll event is ignored.
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    },
    [],
  );

  const paneClasses =
    "h-64 w-full overflow-auto rounded-field border border-border bg-surface-subtle sm:h-80";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Comparison layout"
          className="flex flex-wrap gap-2"
        >
          <Button
            variant={mode === "side-by-side" ? "primary" : "secondary"}
            onClick={() => onModeChange("side-by-side")}
          >
            <span aria-hidden="true">▥</span> Side by side
          </Button>
          <Button
            variant={mode === "toggle" ? "primary" : "secondary"}
            onClick={() => onModeChange("toggle")}
          >
            <span aria-hidden="true">◨</span> Toggle
          </Button>
        </div>
        {mode === "toggle" ? (
          <Button
            variant="secondary"
            onClick={() =>
              onPaneChange(pane === "original" ? "optimised" : "original")
            }
          >
            Showing: {pane === "original" ? "Original" : "Optimised"} — switch
          </Button>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="ai-compare-zoom"
            className="text-sm font-medium text-foreground"
          >
            Zoom
          </label>
          <span className="text-sm tabular-nums text-muted">{zoom}%</span>
        </div>
        <input
          id="ai-compare-zoom"
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={25}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          aria-valuetext={`${zoom} per cent`}
          aria-describedby="ai-compare-zoom-hint"
          className="h-11 w-full cursor-pointer accent-accent-solid"
        />
        <p id="ai-compare-zoom-hint" className="text-sm leading-snug text-muted">
          Zoom in and scroll to check that small text is still readable in the
          optimised copy. Both panes scroll together.
        </p>
      </div>

      {mode === "side-by-side" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <figure className="min-w-0">
            <div
              ref={leftRef}
              onScroll={syncScroll("left")}
              className={paneClasses}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt="The original image"
                style={{ width: `${zoom}%`, maxWidth: "none" }}
                className="block"
              />
            </div>
            <figcaption className="mt-1.5 break-words text-sm text-muted">
              Original — {originalCaption}
            </figcaption>
          </figure>
          <figure className="min-w-0">
            <div
              ref={rightRef}
              onScroll={syncScroll("right")}
              className={paneClasses}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimisedUrl}
                alt="The optimised image"
                style={{ width: `${zoom}%`, maxWidth: "none" }}
                className="block"
              />
            </div>
            <figcaption className="mt-1.5 break-words text-sm text-muted">
              Optimised — {optimisedCaption}
            </figcaption>
          </figure>
        </div>
      ) : (
        <figure className="min-w-0">
          <div ref={leftRef} className={paneClasses}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pane === "original" ? originalUrl : optimisedUrl}
              alt={
                pane === "original" ? "The original image" : "The optimised image"
              }
              style={{ width: `${zoom}%`, maxWidth: "none" }}
              className="block"
            />
          </div>
          <figcaption
            aria-live="polite"
            className="mt-1.5 break-words text-sm text-muted"
          >
            {pane === "original"
              ? `Original — ${originalCaption}`
              : `Optimised — ${optimisedCaption}`}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
