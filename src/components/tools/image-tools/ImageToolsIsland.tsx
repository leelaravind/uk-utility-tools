"use client";

import { useEffect, useState } from "react";

import {
  Button,
  CheckboxInput,
  NumberInput,
  ResultCard,
  SelectInput,
} from "@/components/ui";
import {
  ImageToolError,
  MAX_DIMENSION_PX,
  buildOutputFilename,
  compressToTarget,
  computeTargetDimensions,
  formatBytes,
  loadImage,
  percentSaved,
  processImage,
  releaseImage,
  type LoadedImage,
  type OutputFormat,
} from "@/lib/files/imageProcessing";

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
  filename: string;
  note: string | null;
}

const FORMAT_OPTIONS = [
  { value: "image/jpeg", label: "JPG — smallest for photos" },
  { value: "image/webp", label: "WebP — modern, very small" },
  { value: "image/png", label: "PNG — lossless, keeps transparency" },
];

const FORMAT_LABELS: Record<OutputFormat, string> = {
  "image/jpeg": "JPG",
  "image/webp": "WebP",
  "image/png": "PNG",
};

function defaultFormatFor(mimeType: string): OutputFormat {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function parseDimension(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return n > 0 ? n : null;
}

export function ImageToolsIsland() {
  const [original, setOriginal] = useState<OriginalState | null>(null);
  const [widthStr, setWidthStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(80);
  const [targetKbStr, setTargetKbStr] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Release object URLs and decoded bitmaps when replaced or on unmount.
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

  const dimensionError = (value: string): string | undefined => {
    if (value.trim() === "") return undefined;
    const n = parseDimension(value);
    if (n === null || n > MAX_DIMENSION_PX) {
      return `Enter a whole number of pixels between 1 and ${MAX_DIMENSION_PX.toLocaleString("en-GB")}.`;
    }
    return undefined;
  };

  const widthError = dimensionError(widthStr);
  const heightError = dimensionError(heightStr);

  let targetError: string | undefined;
  if (targetKbStr.trim() !== "") {
    const n = Number.parseFloat(targetKbStr.trim());
    if (!Number.isFinite(n) || n <= 0 || !/^\d+(\.\d+)?$/.test(targetKbStr.trim())) {
      targetError = "Enter a target size in KB, e.g. 200.";
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    setFileError(null);
    setProcessError(null);
    setBusy(true);
    try {
      const loaded = await loadImage(file);
      setOriginal({ file, loaded, url: URL.createObjectURL(file) });
      setResult(null);
      setWidthStr(String(loaded.width));
      setHeightStr(String(loaded.height));
      setFormat(defaultFormatFor(file.type));
    } catch (e) {
      setFileError(
        e instanceof ImageToolError
          ? e.message
          : "Sorry — that image couldn't be read. Try JPG, PNG or WebP.",
      );
    } finally {
      setBusy(false);
    }
  }

  function onWidthChange(value: string) {
    setWidthStr(value);
    if (lockAspect && original) {
      const n = parseDimension(value);
      if (n !== null) {
        setHeightStr(
          String(
            Math.max(
              1,
              Math.round((n / original.loaded.width) * original.loaded.height),
            ),
          ),
        );
      }
    }
  }

  function onHeightChange(value: string) {
    setHeightStr(value);
    if (lockAspect && original) {
      const n = parseDimension(value);
      if (n !== null) {
        setWidthStr(
          String(
            Math.max(
              1,
              Math.round((n / original.loaded.height) * original.loaded.width),
            ),
          ),
        );
      }
    }
  }

  function onLockAspectChange(checked: boolean) {
    setLockAspect(checked);
    if (checked && original) {
      const n = parseDimension(widthStr);
      if (n !== null) {
        setHeightStr(
          String(
            Math.max(
              1,
              Math.round((n / original.loaded.width) * original.loaded.height),
            ),
          ),
        );
      }
    }
  }

  async function process() {
    if (!original || busy) return;
    if (widthError || heightError || targetError) return;
    setProcessError(null);
    setBusy(true);
    try {
      const dims = computeTargetDimensions(
        original.loaded.width,
        original.loaded.height,
        {
          width: parseDimension(widthStr) ?? undefined,
          height: parseDimension(heightStr) ?? undefined,
          lockAspect,
          maxDimension: MAX_DIMENSION_PX,
        },
      );

      const targetKb =
        format !== "image/png" && targetKbStr.trim() !== ""
          ? Number.parseFloat(targetKbStr.trim())
          : null;

      let blob: Blob;
      let note: string | null = null;
      if (targetKb !== null && Number.isFinite(targetKb) && targetKb > 0) {
        const out = await compressToTarget(
          original.loaded.source,
          { width: dims.width, height: dims.height, format },
          targetKb * 1024,
        );
        blob = out.blob;
        if (!out.withinTarget) {
          note = `Couldn't get under ${targetKb} KB at these dimensions — this is the smallest achievable (${formatBytes(blob.size)}). Try smaller dimensions.`;
        }
      } else {
        blob = await processImage(original.loaded.source, {
          width: dims.width,
          height: dims.height,
          format,
          quality: quality / 100,
        });
      }

      const filename = buildOutputFilename(
        original.file.name,
        format,
        `-${dims.width}x${dims.height}`,
      );
      setResult({
        blob,
        url: URL.createObjectURL(blob),
        width: dims.width,
        height: dims.height,
        filename,
        note,
      });
    } catch (e) {
      setProcessError(
        e instanceof ImageToolError
          ? e.message
          : "Sorry — the image couldn't be processed. Try a different format.",
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setOriginal(null);
    setResult(null);
    setWidthStr("");
    setHeightStr("");
    setTargetKbStr("");
    setFileError(null);
    setProcessError(null);
  }

  const saved = result ? percentSaved(original?.file.size ?? 0, result.blob.size) : 0;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-center gap-2.5 rounded-field border border-accent-soft-border bg-accent-soft px-4 py-3 text-sm font-medium text-accent-emphasis">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4 shrink-0"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Your image stays on your device — nothing is uploaded.
      </p>

      <div>
        <label
          htmlFor="image-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
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
            id="image-file"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              handleFile(file);
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
            {original ? "Drop a different image, or browse" : "Drop an image here, or browse"}
          </span>
          <span className="text-sm text-muted">
            JPG, PNG or WebP — up to 80 MB
          </span>
        </label>
        {fileError ? (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {fileError}
          </p>
        ) : null}
      </div>

      {original ? (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-4">
            {/* Plain <img> is intentional: the source is a local object URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={original.url}
              alt={`Preview of ${original.file.name}`}
              className="max-h-28 w-auto max-w-[10rem] rounded-field border border-border object-contain"
            />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-foreground">
                {original.file.name}
              </p>
              <p className="mt-1 text-muted">
                {original.loaded.width.toLocaleString("en-GB")} ×{" "}
                {original.loaded.height.toLocaleString("en-GB")}px ·{" "}
                {formatBytes(original.file.size)}
              </p>
              <div className="mt-2">
                <Button variant="ghost" onClick={reset}>
                  Remove image
                </Button>
              </div>
            </div>
          </div>

          <section aria-labelledby="resize-options-heading" className="flex flex-col gap-4">
            <h2
              id="resize-options-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Resize &amp; compress
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput
                id="img-width"
                label="Width"
                value={widthStr}
                onChange={onWidthChange}
                suffix="px"
                inputMode="numeric"
                error={widthError}
                placeholder={String(original.loaded.width)}
              />
              <NumberInput
                id="img-height"
                label="Height"
                value={heightStr}
                onChange={onHeightChange}
                suffix="px"
                inputMode="numeric"
                error={heightError}
                placeholder={String(original.loaded.height)}
              />
            </div>

            <CheckboxInput
              id="img-lock-aspect"
              label="Lock aspect ratio"
              checked={lockAspect}
              onChange={onLockAspectChange}
              hint="Changing one dimension updates the other so the image isn't stretched."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput
                id="img-format"
                label="Output format"
                value={format}
                onChange={(v) => setFormat(v as OutputFormat)}
                options={FORMAT_OPTIONS}
              />
              {format !== "image/png" ? (
                <NumberInput
                  id="img-target-kb"
                  label="Target file size (optional)"
                  value={targetKbStr}
                  onChange={setTargetKbStr}
                  suffix="KB"
                  inputMode="numeric"
                  error={targetError}
                  hint="We'll find the best quality that fits, overriding the slider."
                  placeholder="e.g. 200"
                />
              ) : null}
            </div>

            {format !== "image/png" ? (
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <label
                    htmlFor="img-quality"
                    className="text-sm font-medium text-foreground"
                  >
                    Quality
                  </label>
                  <span className="text-sm tabular-nums text-muted">
                    {quality}%
                  </span>
                </div>
                <input
                  id="img-quality"
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-valuetext={`${quality} per cent`}
                  className="h-11 w-full cursor-pointer accent-accent-solid"
                />
                <p className="text-sm leading-snug text-muted">
                  Lower quality means a smaller file. 70–85% usually looks
                  identical to the original.
                </p>
              </div>
            ) : (
              <p className="text-sm leading-snug text-muted">
                PNG is lossless, so there&apos;s no quality setting — file size
                depends on dimensions and image content.
              </p>
            )}

            <div>
              <Button
                onClick={process}
                disabled={busy || Boolean(widthError || heightError || targetError)}
              >
                {busy ? "Processing…" : "Process image"}
              </Button>
            </div>
            {processError ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {processError}
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      {result && original ? (
        <section aria-labelledby="image-result-heading" className="flex flex-col gap-4">
          <h2
            id="image-result-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Result
          </h2>
          <ResultCard
            live
            title="Processed image"
            primary={{ label: "New file size", value: formatBytes(result.blob.size) }}
            rows={[
              {
                label: "Dimensions",
                value: `${result.width.toLocaleString("en-GB")} × ${result.height.toLocaleString("en-GB")}px`,
              },
              { label: "Format", value: FORMAT_LABELS[format] },
              {
                label: "Original size",
                value: formatBytes(original.file.size),
              },
              {
                label: "Space saved",
                value: saved >= 0 ? `${saved}%` : "0% (larger than original)",
                strong: true,
              },
            ]}
            footnote={
              result.note ??
              (saved < 0
                ? "The processed file is larger than the original — try a lower quality, smaller dimensions or the JPG/WebP format."
                : undefined)
            }
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
                Download {FORMAT_LABELS[format]}
              </a>
            }
          >
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="Preview of the processed image"
                className="max-h-64 w-auto max-w-full rounded-field border border-border bg-surface object-contain"
              />
            </div>
          </ResultCard>
        </section>
      ) : null}
    </div>
  );
}
