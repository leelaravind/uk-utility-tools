"use client";

/**
 * Mode 1 — Optimize Image.
 *
 * Self-contained panel: it owns its own file input, state and preview. Every
 * byte stays on the device — the image is decoded, cropped, resized and
 * encoded with canvas APIs, and there is no fetch, upload, beacon or socket
 * anywhere in this feature.
 *
 * The estimates come from the frozen provider profiles in
 * `@/config/imageProviders`, and every comparison runs BOTH sizes through the
 * provider's own resize first (see `compareForProvider`). That is what stops
 * the panel claiming a saving on an image the provider was going to shrink
 * anyway.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  CheckboxInput,
  NumberInput,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import {
  DEFAULT_PROFILE_ID,
  VISION_PROVIDER_PROFILES,
  getProfile,
  type VisionProviderProfile,
} from "@/config/imageProviders";
import {
  ImageToolError,
  buildOutputFilename,
  formatBytes,
  loadImage,
  percentSaved,
  releaseImage,
  type LoadedImage,
  type OutputFormat,
} from "@/lib/files/imageProcessing";
import {
  FULL_RECT,
  applyCrop,
  cropTokenImpact,
  describeCrop,
  detectUniformMargins,
  isFullRect,
  toNormalisedRect,
  type NormalisedRect,
  type PixelRect,
} from "@/lib/imageAi/crop";
import {
  CONTENT_PRESETS,
  RESIZE_PRESETS,
  compareForProvider,
  describeFormat,
  describeMegapixels,
  formatDimensions,
  formatReductionPercent,
  formatTokens,
  getContentPreset,
  getResizePreset,
  planOptimisation,
  providerEffectiveSize,
  suggestContentPreset,
  type ContentPresetId,
  type OptimisationPlan,
  type ResizePresetId,
} from "@/lib/imageAi/optimize";

import { HowItWorks } from "./optimize/HowItWorks";
import {
  ImageCompare,
  type CompareMode,
  type ComparePane,
} from "./optimize/ImageCompare";
import { ProviderPicker } from "./optimize/ProviderPicker";
import { renderOptimised, sampleForMargins } from "./optimize/pipeline";

/* ------------------------------------------------------------------ */
/* Types and small helpers                                             */
/* ------------------------------------------------------------------ */

interface OriginalState {
  file: File;
  loaded: LoadedImage;
  url: string;
}

interface ResultState {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number;
  filename: string;
  /** Identifies the settings this preview was produced from. */
  key: string;
}

interface CropDraft {
  x: string;
  y: string;
  width: string;
  height: string;
}

const FORMAT_OPTIONS = [
  { value: "image/webp", label: "WebP — smallest at the same quality" },
  { value: "image/jpeg", label: "JPG — widest compatibility" },
  { value: "image/png", label: "PNG — lossless, keeps transparency" },
];

const RESIZE_OPTIONS = RESIZE_PRESETS.map((p) => ({
  value: p.id,
  label: p.label,
}));

const CONTENT_OPTIONS = CONTENT_PRESETS.map((p) => ({
  value: p.id,
  label: p.label,
}));

const FALLBACK_PROFILE: VisionProviderProfile =
  getProfile(DEFAULT_PROFILE_ID) ?? VISION_PROVIDER_PROFILES[0];

function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function draftFromRect(rect: PixelRect): CropDraft {
  return {
    x: String(rect.x),
    y: String(rect.y),
    width: String(rect.width),
    height: String(rect.height),
  };
}

function parseCropDraft(draft: CropDraft): PixelRect | null {
  const x = parseInteger(draft.x);
  const y = parseInteger(draft.y);
  const width = parseInteger(draft.width);
  const height = parseInteger(draft.height);
  if (x === null || y === null || width === null || height === null) return null;
  if (width < 1 || height < 1) return null;
  return { x, y, width, height };
}

function planKey(plan: OptimisationPlan, rect: PixelRect): string {
  return [
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    plan.width,
    plan.height,
    plan.format,
    plan.quality.toFixed(3),
    plan.preferSharpDownscale,
  ].join("|");
}

/* ------------------------------------------------------------------ */
/* Presentational bits                                                 */
/* ------------------------------------------------------------------ */

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="break-words text-right text-sm text-foreground tabular-nums sm:text-base">
        {value}
      </dd>
    </div>
  );
}

/**
 * One of the three savings measurements. Before and after are stacked rather
 * than joined with an arrow so a long pair of values still fits on a narrow
 * phone without pushing the page sideways.
 */
function MetricTile({
  label,
  before,
  after,
  detail,
}: {
  label: string;
  before: string;
  after: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-card border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <dl className="mt-2 flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-sm text-muted">Before</dt>
          <dd className="min-w-0 break-words text-right text-sm text-foreground tabular-nums">
            {before}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-sm text-muted">After</dt>
          <dd className="min-w-0 break-words text-right text-base font-semibold text-foreground tabular-nums">
            {after}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-sm leading-snug text-muted">{detail}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function OptimizeImagePanel() {
  const [original, setOriginal] = useState<OriginalState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const [profileId, setProfileId] = useState<string>(DEFAULT_PROFILE_ID);
  const [resizePreset, setResizePreset] =
    useState<ResizePresetId>("recommended");
  const [contentPreset, setContentPreset] = useState<ContentPresetId>("auto");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [allowUpscale, setAllowUpscale] = useState(false);
  const [format, setFormat] = useState<OutputFormat>(
    getContentPreset("auto").format,
  );
  const [quality, setQuality] = useState(
    Math.round(getContentPreset("auto").quality * 100),
  );

  const [crop, setCrop] = useState<NormalisedRect>(FULL_RECT);
  const [cropDraft, setCropDraft] = useState<CropDraft>({
    x: "",
    y: "",
    width: "",
    height: "",
  });
  const [proposedCrop, setProposedCrop] = useState<NormalisedRect | null>(null);
  const [revertCrop, setRevertCrop] = useState<NormalisedRect | null>(null);
  const [trimMessage, setTrimMessage] = useState<string | null>(null);

  const [compareMode, setCompareMode] = useState<CompareMode>("side-by-side");
  const [comparePane, setComparePane] = useState<ComparePane>("optimised");
  const [zoom, setZoom] = useState(100);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const profile = getProfile(profileId) ?? FALLBACK_PROFILE;

  /* --- lifecycle: free memory ------------------------------------- */

  useEffect(() => {
    if (!original) return;
    return () => {
      URL.revokeObjectURL(original.url);
      releaseImage(original.loaded);
    };
  }, [original]);

  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  /* --- derived ----------------------------------------------------- */

  const sourceWidth = original?.loaded.width ?? 0;
  const sourceHeight = original?.loaded.height ?? 0;

  const cropPixels = useMemo<PixelRect | null>(
    () => (original ? applyCrop(crop, sourceWidth, sourceHeight) : null),
    [original, crop, sourceWidth, sourceHeight],
  );

  const plan = useMemo<OptimisationPlan | null>(() => {
    if (!cropPixels) return null;
    return planOptimisation({
      sourceWidth: cropPixels.width,
      sourceHeight: cropPixels.height,
      profile,
      resizePreset,
      contentPreset,
      customWidth: parseInteger(customWidth) ?? undefined,
      customHeight: parseInteger(customHeight) ?? undefined,
      lockAspect,
      allowUpscale,
      format,
      quality: quality / 100,
    });
  }, [
    cropPixels,
    profile,
    resizePreset,
    contentPreset,
    customWidth,
    customHeight,
    lockAspect,
    allowUpscale,
    format,
    quality,
  ]);

  const currentKey = plan && cropPixels ? planKey(plan, cropPixels) : "";
  const stale = result !== null && result.key !== currentKey;

  const originalEffective = original
    ? providerEffectiveSize(profile, sourceWidth, sourceHeight)
    : null;

  const comparison = useMemo(() => {
    if (!original || !result) return null;
    return compareForProvider(
      sourceWidth,
      sourceHeight,
      result.width,
      result.height,
      profile,
    );
  }, [original, result, sourceWidth, sourceHeight, profile]);

  const proposalImpact = useMemo(() => {
    if (!original || !proposedCrop) return null;
    return cropTokenImpact(sourceWidth, sourceHeight, proposedCrop, profile);
  }, [original, proposedCrop, sourceWidth, sourceHeight, profile]);

  /* --- crop plumbing ----------------------------------------------- */

  /**
   * Custom width/height are relative to the CROPPED image, so they follow the
   * crop. Leaving a stale figure behind would silently read as a request to
   * enlarge the image back to its uncropped size.
   */
  const syncCustomToCrop = useCallback((rect: PixelRect) => {
    setCustomWidth(String(rect.width));
    setCustomHeight(String(rect.height));
  }, []);

  const commitCrop = useCallback(
    (rect: NormalisedRect) => {
      setCrop(rect);
      if (original) {
        const pixels = applyCrop(rect, sourceWidth, sourceHeight);
        setCropDraft(draftFromRect(pixels));
        syncCustomToCrop(pixels);
      }
    },
    [original, sourceWidth, sourceHeight, syncCustomToCrop],
  );

  function updateCropField(field: keyof CropDraft, value: string) {
    const next = { ...cropDraft, [field]: value };
    setCropDraft(next);
    const parsed = parseCropDraft(next);
    if (parsed && original) {
      const normalised = toNormalisedRect(parsed, sourceWidth, sourceHeight);
      setCrop(normalised);
      syncCustomToCrop(applyCrop(normalised, sourceWidth, sourceHeight));
    }
  }

  function changeResizePreset(next: ResizePresetId) {
    // Switching to Custom starts from whatever size is currently planned,
    // rather than from an empty box.
    if (next === "custom" && plan) {
      setCustomWidth(String(plan.width));
      setCustomHeight(String(plan.height));
    }
    setResizePreset(next);
  }

  function resetCrop() {
    commitCrop(FULL_RECT);
    setProposedCrop(null);
    setRevertCrop(null);
    setTrimMessage(null);
  }

  const cropDraftInvalid = parseCropDraft(cropDraft) === null;

  /* --- file intake -------------------------------------------------- */

  const applyContentPreset = useCallback((id: ContentPresetId) => {
    const preset = getContentPreset(id);
    setContentPreset(id);
    setFormat(preset.format);
    setQuality(Math.round(preset.quality * 100));
  }, []);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setFileError(null);
      setProcessError(null);
      setTrimMessage(null);
      setBusy(true);
      setStatus("Reading image…");
      try {
        const loaded = await loadImage(file);
        setResult(null);
        setProposedCrop(null);
        setRevertCrop(null);
        setCrop(FULL_RECT);
        setCropDraft(
          draftFromRect({
            x: 0,
            y: 0,
            width: loaded.width,
            height: loaded.height,
          }),
        );
        setCustomWidth(String(loaded.width));
        setCustomHeight(String(loaded.height));
        applyContentPreset(suggestContentPreset(file.type));
        setOriginal({ file, loaded, url: URL.createObjectURL(file) });
        setStatus(
          `Loaded ${loaded.width} by ${loaded.height} pixels, ${formatBytes(file.size)}.`,
        );
      } catch (e) {
        setFileError(
          e instanceof ImageToolError
            ? e.message
            : "Sorry — that image couldn't be read. Try JPG, PNG or WebP.",
        );
        setStatus("");
      } finally {
        setBusy(false);
      }
    },
    [applyContentPreset],
  );

  // Clipboard paste, equivalent to dropping or browsing for a file.
  const handleFileRef = useRef(handleFile);
  useEffect(() => {
    handleFileRef.current = handleFile;
  }, [handleFile]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void handleFileRef.current(file);
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  /* --- the work ----------------------------------------------------- */

  async function optimise() {
    if (!original || !plan || !cropPixels || busy) return;
    setProcessError(null);
    setBusy(true);
    setStatus("Optimising image on your device…");
    try {
      const blob = await renderOptimised({
        loaded: original.loaded,
        crop,
        width: plan.width,
        height: plan.height,
        format: plan.format,
        quality: plan.quality,
        preferSharpDownscale: plan.preferSharpDownscale,
      });
      setResult({
        blob,
        url: URL.createObjectURL(blob),
        width: plan.width,
        height: plan.height,
        format: plan.format,
        quality: plan.quality,
        filename: buildOutputFilename(
          original.file.name,
          plan.format,
          "-ai-optimized",
        ),
        key: planKey(plan, cropPixels),
      });
      setStatus(
        `Optimised: ${plan.width} by ${plan.height} pixels, ${formatBytes(blob.size)}.`,
      );
    } catch (e) {
      setResult(null);
      setProcessError(
        e instanceof ImageToolError
          ? e.message
          : "Sorry — that image couldn't be optimised. Try a different format or a smaller size.",
      );
      setStatus("Optimisation failed.");
    } finally {
      setBusy(false);
    }
  }

  // Give the visitor something to look at as soon as an image lands, without
  // re-running on every slider nudge afterwards.
  const optimiseRef = useRef(optimise);
  useEffect(() => {
    optimiseRef.current = optimise;
  });
  useEffect(() => {
    if (original) void optimiseRef.current();
  }, [original]);

  async function proposeTrim() {
    if (!original || busy) return;
    setBusy(true);
    setTrimMessage(null);
    setStatus("Looking for blank margins…");
    // Announce the outcome as well as showing it, so the result of the scan
    // is never left as a stale "looking…" for a screen-reader user.
    const report = (message: string) => {
      setTrimMessage(message);
      setStatus(message);
    };

    try {
      const sample = await sampleForMargins(original.loaded);
      if (!sample) {
        report(
          "Your browser wouldn't let us read this image's pixels, so margins can't be detected. You can still crop by hand.",
        );
        return;
      }
      const detected = detectUniformMargins(
        sample.sampler,
        sample.width,
        sample.height,
      );
      if (!detected || isFullRect(detected)) {
        setProposedCrop(null);
        report(
          "No clear blank margin found, so nothing has been changed. This tool only suggests a trim when it is confident.",
        );
        return;
      }
      setProposedCrop(detected);
      setStatus(
        `Suggested crop ready to review: ${describeCrop(detected, sourceWidth, sourceHeight)}.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function acceptProposal() {
    if (!proposedCrop) return;
    setRevertCrop(crop);
    commitCrop(proposedCrop);
    setProposedCrop(null);
    const message =
      "Blank margins trimmed. Use Undo trim to put them back, then re-optimise.";
    setTrimMessage(message);
    setStatus(message);
  }

  function undoTrim() {
    if (!revertCrop) return;
    commitCrop(revertCrop);
    setRevertCrop(null);
    const message = "Trim undone — the previous crop is back.";
    setTrimMessage(message);
    setStatus(message);
  }

  function reset() {
    setOriginal(null);
    setResult(null);
    setProposedCrop(null);
    setRevertCrop(null);
    setCrop(FULL_RECT);
    setCropDraft({ x: "", y: "", width: "", height: "" });
    setCustomWidth("");
    setCustomHeight("");
    setFileError(null);
    setProcessError(null);
    setTrimMessage(null);
    setStatus("");
  }

  /* --- render ------------------------------------------------------- */

  const selectedResize = getResizePreset(resizePreset);
  const selectedContent = getContentPreset(contentPreset);
  const byteSaving =
    original && result ? percentSaved(original.file.size, result.blob.size) : 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <p className="flex items-start gap-2.5 rounded-field border border-accent-soft-border bg-accent-soft px-4 py-3 text-sm font-medium text-accent-emphasis">
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
          Your image is processed entirely in this browser tab. Nothing is
          uploaded, and no filename, dimension or estimate is sent anywhere.
        </span>
      </p>

      {/* Live region for busy/progress announcements. */}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {/* --- 1. Choose an image --- */}
      <div>
        <label
          htmlFor="ai-optimize-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={[
            "flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
            dragOver
              ? "border-accent bg-accent-soft"
              : "border-border-strong bg-surface hover:bg-surface-subtle",
          ].join(" ")}
        >
          <input
            id="ai-optimize-file"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void handleFile(file);
            }}
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-8 text-muted"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span className="text-base font-medium text-foreground">
            {original
              ? "Drop a different image, or press Enter to browse"
              : "Drop an image here, or press Enter to browse"}
          </span>
          <span className="text-sm text-muted">
            You can also paste an image with Ctrl+V. JPG, PNG or WebP, up to 80 MB.
          </span>
        </label>
        {fileError ? (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {fileError}
          </p>
        ) : null}
      </div>

      {original && plan && cropPixels ? (
        <>
          {/* --- 2. Original --- */}
          <section
            aria-labelledby="ai-original-heading"
            className="flex min-w-0 flex-col gap-4"
          >
            <h2
              id="ai-original-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Original
            </h2>
            <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-start">
              {/* Plain <img>: the source is a local object URL, never a remote asset. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={original.url}
                alt={`Preview of ${original.file.name}`}
                className="max-h-28 w-auto max-w-[10rem] shrink-0 rounded-field border border-border object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-foreground">
                  {original.file.name}
                </p>
                <dl className="mt-2 flex flex-col">
                  <StatRow
                    label="Dimensions"
                    value={formatDimensions(sourceWidth, sourceHeight)}
                  />
                  <StatRow
                    label="Megapixels"
                    value={describeMegapixels(sourceWidth, sourceHeight)}
                  />
                  <StatRow
                    label="File size"
                    value={formatBytes(original.file.size)}
                  />
                  <StatRow
                    label="Format"
                    value={describeFormat(original.file.type)}
                  />
                  <StatRow
                    label={`Estimated visual tokens (${profile.providerLabel} ${profile.modelTier})`}
                    value={
                      originalEffective
                        ? formatTokens(originalEffective.visualTokens)
                        : "Not available"
                    }
                  />
                </dl>
                {originalEffective?.resized ? (
                  <p className="mt-2 rounded-field border border-border bg-surface-subtle px-3 py-2 text-sm leading-relaxed text-foreground">
                    {profile.providerLabel} would resize this to{" "}
                    {formatDimensions(
                      originalEffective.width,
                      originalEffective.height,
                    )}{" "}
                    itself before counting tokens, so the estimate above is
                    already based on that smaller size — not on the full{" "}
                    {describeMegapixels(sourceWidth, sourceHeight)}.
                  </p>
                ) : null}
                <div className="mt-2">
                  <Button variant="ghost" onClick={reset}>
                    Remove image
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* --- 3. Provider --- */}
          <section
            aria-labelledby="ai-provider-heading"
            className="flex min-w-0 flex-col gap-4"
          >
            <h2
              id="ai-provider-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Where you will send it
            </h2>
            <ProviderPicker
              value={profileId}
              onChange={setProfileId}
              profile={profile}
            />
          </section>

          {/* --- 4. Settings --- */}
          <section
            aria-labelledby="ai-settings-heading"
            className="flex min-w-0 flex-col gap-4"
          >
            <h2
              id="ai-settings-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Size and format
            </h2>

            <SelectInput
              id="ai-resize-preset"
              label="Target size"
              value={resizePreset}
              onChange={(v) => changeResizePreset(v as ResizePresetId)}
              options={RESIZE_OPTIONS}
              hint={selectedResize.description}
            />

            {resizePreset === "custom" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberInput
                    id="ai-custom-width"
                    label="Width"
                    value={customWidth}
                    onChange={setCustomWidth}
                    suffix="px"
                    inputMode="numeric"
                    placeholder={String(cropPixels.width)}
                  />
                  <NumberInput
                    id="ai-custom-height"
                    label="Height"
                    value={customHeight}
                    onChange={setCustomHeight}
                    suffix="px"
                    inputMode="numeric"
                    placeholder={String(cropPixels.height)}
                  />
                </div>
                <CheckboxInput
                  id="ai-lock-aspect"
                  label="Lock aspect ratio"
                  checked={lockAspect}
                  onChange={setLockAspect}
                  hint="Keeps the image from being stretched. With both boxes filled in, the image is fitted inside them."
                />
                <CheckboxInput
                  id="ai-allow-upscale"
                  label="Allow enlarging beyond the original size"
                  checked={allowUpscale}
                  onChange={setAllowUpscale}
                  hint="Off by default. Enlarging adds pixels but no detail, and raises the visual-token estimate."
                />
              </>
            ) : null}

            <SelectInput
              id="ai-content-preset"
              label="What is in the image"
              value={contentPreset}
              onChange={(v) => applyContentPreset(v as ContentPresetId)}
              options={CONTENT_OPTIONS}
              hint={selectedContent.description}
            />

            <SelectInput
              id="ai-format"
              label="Output format"
              value={format}
              onChange={(v) => setFormat(v as OutputFormat)}
              options={FORMAT_OPTIONS}
            />

            {format === "image/png" ? (
              <p className="text-sm leading-snug text-muted">
                PNG is lossless, so there is no quality setting. File size
                depends on the dimensions and on how much detail the image
                contains.
              </p>
            ) : (
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="ai-quality"
                    className="text-sm font-medium text-foreground"
                  >
                    Quality
                  </label>
                  <span className="text-sm tabular-nums text-muted">
                    {quality}%
                  </span>
                </div>
                <input
                  id="ai-quality"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-valuetext={`${quality} per cent`}
                  aria-describedby="ai-quality-hint"
                  className="h-11 w-full cursor-pointer accent-accent-solid"
                />
                <p id="ai-quality-hint" className="text-sm leading-snug text-muted">
                  Quality changes the file size and how long the upload takes.
                  It does not change the visual-token estimate — only the pixel
                  dimensions do that.
                </p>
              </div>
            )}
          </section>

          {/* --- 5. Crop --- */}
          <section
            aria-labelledby="ai-crop-heading"
            className="flex min-w-0 flex-col gap-4"
          >
            <h2
              id="ai-crop-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Crop
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              Cropping happens before the resize. Removing parts of the image
              the model does not need is usually the biggest single reduction
              available, because it takes away pixels rather than just
              compressing them.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput
                id="ai-crop-x"
                label="Crop left edge"
                value={cropDraft.x}
                onChange={(v) => updateCropField("x", v)}
                suffix="px"
                inputMode="numeric"
              />
              <NumberInput
                id="ai-crop-y"
                label="Crop top edge"
                value={cropDraft.y}
                onChange={(v) => updateCropField("y", v)}
                suffix="px"
                inputMode="numeric"
              />
              <NumberInput
                id="ai-crop-width"
                label="Crop width"
                value={cropDraft.width}
                onChange={(v) => updateCropField("width", v)}
                suffix="px"
                inputMode="numeric"
              />
              <NumberInput
                id="ai-crop-height"
                label="Crop height"
                value={cropDraft.height}
                onChange={(v) => updateCropField("height", v)}
                suffix="px"
                inputMode="numeric"
                error={
                  cropDraftInvalid
                    ? "Enter whole numbers of pixels. Width and height must be at least 1."
                    : undefined
                }
              />
            </div>

            <p className="text-sm text-muted">
              Current crop: {describeCrop(crop, sourceWidth, sourceHeight)}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={proposeTrim} disabled={busy}>
                Find blank margins
              </Button>
              {!isFullRect(crop) ? (
                <Button variant="secondary" onClick={resetCrop} disabled={busy}>
                  Reset crop
                </Button>
              ) : null}
              {revertCrop ? (
                <Button variant="ghost" onClick={undoTrim} disabled={busy}>
                  Undo trim
                </Button>
              ) : null}
            </div>

            {proposedCrop ? (
              <div
                role="region"
                aria-label="Suggested crop"
                className="flex flex-col gap-3 rounded-card border border-accent-soft-border bg-accent-soft p-4"
              >
                <p className="text-sm font-semibold text-accent-emphasis">
                  Suggested crop — not applied yet
                </p>
                <p className="break-words text-sm leading-relaxed text-foreground">
                  {describeCrop(proposedCrop, sourceWidth, sourceHeight)}
                </p>
                {proposalImpact ? (
                  <p className="text-sm leading-relaxed text-foreground">
                    Estimated visual tokens after this crop:{" "}
                    {proposalImpact.cropped
                      ? `${formatTokens(proposalImpact.cropped.visualTokens)} (${formatReductionPercent(
                          proposalImpact.tokenReductionPercent,
                        )})`
                      : "not available for this provider"}
                    .{proposalImpact.note ? ` ${proposalImpact.note}` : ""}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={acceptProposal}>Apply this crop</Button>
                  <Button
                    variant="secondary"
                    onClick={() => setProposedCrop(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ) : null}

            {trimMessage ? (
              <p role="status" className="text-sm leading-relaxed text-muted">
                {trimMessage}
              </p>
            ) : null}
          </section>

          {/* --- 6. Run --- */}
          <section
            aria-labelledby="ai-run-heading"
            className="flex min-w-0 flex-col gap-3"
          >
            <h2 id="ai-run-heading" className="sr-only">
              Optimise
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={optimise} disabled={busy || cropDraftInvalid}>
                {busy ? "Working…" : result ? "Re-optimise" : "Optimise image"}
              </Button>
              {busy ? (
                <span className="text-sm text-muted">
                  Working on your device…
                </span>
              ) : null}
              {stale && !busy ? (
                <span className="text-sm font-medium text-foreground">
                  Settings have changed — re-optimise to update the preview.
                </span>
              ) : null}
            </div>
            {plan.notes.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-muted">
                {plan.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
            {processError ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {processError}
              </p>
            ) : null}
          </section>

          {/* --- 7. Result --- */}
          {result ? (
            <section
              aria-labelledby="ai-result-heading"
              className="flex min-w-0 flex-col gap-4"
            >
              <h2
                id="ai-result-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Optimised
              </h2>

              <ResultCard
                live
                title="Optimised image"
                primary={{
                  label:
                    comparison?.optimised != null
                      ? `Estimated visual tokens (${profile.providerLabel} ${profile.modelTier})`
                      : "Optimised file size",
                  value:
                    comparison?.optimised != null
                      ? formatTokens(comparison.optimised.visualTokens)
                      : formatBytes(result.blob.size),
                }}
                rows={[
                  {
                    label: "Dimensions",
                    value: formatDimensions(result.width, result.height),
                  },
                  {
                    label: "Megapixels",
                    value: describeMegapixels(result.width, result.height),
                  },
                  {
                    label: "File size",
                    value: formatBytes(result.blob.size),
                  },
                  {
                    label: "Format",
                    value: describeFormat(result.format),
                  },
                  {
                    label: "Quality",
                    value:
                      result.format === "image/png"
                        ? "Lossless"
                        : `${Math.round(result.quality * 100)}%`,
                  },
                ]}
                footnote={comparison?.note}
                actions={
                  <a
                    href={result.url}
                    download={result.filename}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-accent-solid px-5 text-base font-medium text-accent-fg transition-colors hover:bg-accent-solid-hover"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="size-4"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                    Download optimised image
                  </a>
                }
              >
                <p className="mt-3 break-words text-xs text-muted">
                  Saves as {result.filename}
                </p>
              </ResultCard>

              {/* --- three separate metrics, never conflated --- */}
              <div>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  What changed
                </h3>
                <p className="mb-3 text-sm leading-relaxed text-muted">
                  These are three different measurements. They usually do not
                  move together, and a change in one does not imply a change in
                  the others.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricTile
                    label="Dimensions"
                    before={`${formatDimensions(sourceWidth, sourceHeight)} · ${describeMegapixels(sourceWidth, sourceHeight)}`}
                    after={`${formatDimensions(result.width, result.height)} · ${describeMegapixels(result.width, result.height)}`}
                    detail="How many pixels the image actually contains, after any crop."
                  />
                  <MetricTile
                    label="File size"
                    before={formatBytes(original.file.size)}
                    after={formatBytes(result.blob.size)}
                    detail={
                      byteSaving > 0
                        ? `${byteSaving}% fewer bytes to upload. Format and quality drive this figure, not the token estimate.`
                        : byteSaving === 0
                          ? "Roughly the same number of bytes to upload."
                          : `${Math.abs(byteSaving)}% more bytes than the original — try a lower quality, or WebP.`
                    }
                  />
                  <MetricTile
                    label={`Estimated visual tokens (${profile.providerLabel} ${profile.modelTier})`}
                    before={
                      comparison?.original
                        ? formatTokens(comparison.original.visualTokens)
                        : "Not available"
                    }
                    after={
                      comparison?.optimised
                        ? formatTokens(comparison.optimised.visualTokens)
                        : "Not available"
                    }
                    detail={
                      comparison?.tokenReductionPercent != null
                        ? `${formatReductionPercent(comparison.tokenReductionPercent)}. Both figures are what ${profile.providerLabel} would actually process after its own resize — not a count of raw pixels.`
                        : `${profile.providerLabel} does not publish an image-token rule, so no figure is shown rather than a guess.`
                    }
                  />
                </div>
              </div>

              {/* --- side by side --- */}
              <div>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  Compare
                </h3>
                <ImageCompare
                  originalUrl={original.url}
                  originalCaption={`${formatDimensions(sourceWidth, sourceHeight)}, ${formatBytes(original.file.size)}`}
                  optimisedUrl={result.url}
                  optimisedCaption={`${formatDimensions(result.width, result.height)}, ${formatBytes(result.blob.size)}`}
                  mode={compareMode}
                  onModeChange={setCompareMode}
                  pane={comparePane}
                  onPaneChange={setComparePane}
                  zoom={zoom}
                  onZoomChange={setZoom}
                />
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <HowItWorks />
    </div>
  );
}
