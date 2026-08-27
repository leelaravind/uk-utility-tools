"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button, SelectInput } from "@/components/ui";
import { describeClassification } from "@/lib/imageAi/context/classify";
import {
  detectCapabilities,
  selectTier,
  type RuntimeCapabilities,
  type RuntimeTier,
} from "@/lib/imageAi/context/capabilities";
import {
  DOWNLOAD_FILENAME,
  contextForCopy,
  serializeBalancedJson,
  serializeFormat,
} from "@/lib/imageAi/context/serialize";
import { formatBytes } from "@/lib/files/imageProcessing";
import type {
  AnalysisDocument,
  AnalysisMode,
  AnalysisProgress,
  OutputFormat,
} from "@/lib/imageAi/context/types";
import { JobGuard } from "@/lib/imageAi/context/workers/jobGuard";
import type {
  AnalysisWorkerClient,
  PreparedImage,
} from "@/lib/imageAi/context/analyzeInBrowser";
import type { OcrEngine } from "@/lib/imageAi/context/ocr/types";

import { AnalysisProgressBar } from "./context/AnalysisProgressBar";
import { CopyActions } from "./context/CopyActions";
import { ImageDropzone } from "./context/ImageDropzone";
import { LimitationsList } from "./context/LimitationsList";
import { PrivacyDetails } from "./context/PrivacyDetails";
import { ResultTabs } from "./context/ResultTabs";
import { RuntimeIndicator } from "./context/RuntimeIndicator";

/**
 * Image → AI Context.
 *
 * Converts an image into compact, AI-readable context entirely inside the
 * visitor's browser, then lets them copy it into the assistant of their choice.
 *
 * THREE CONTRACTS THIS COMPONENT KEEPS
 * ------------------------------------
 * 1. NOTHING LEAVES THE BROWSER. There is no fetch, XHR, beacon or socket in
 *    this component or anything it imports, other than the OCR engine
 *    downloading its own static WebAssembly and language files. The image, the
 *    recognised text and the generated context are never transmitted, logged
 *    or persisted, and there is no cloud fallback to reach for when local
 *    analysis is limited.
 *
 * 2. NOTHING HEAVY LOADS UNTIL THE VISITOR ASKS. The analysis module, the OCR
 *    engine and the worker are all behind `await import(...)`, triggered by a
 *    file being chosen or the analyse button being pressed. Opening the page —
 *    or the sibling Optimize panel — downloads none of it.
 *
 * 3. STALE RESULTS NEVER LAND. Every run takes a job id from a `JobGuard`;
 *    only the current job may write to state. Loading a second image while the
 *    first is still analysing cannot repaint the page with the first image's
 *    answer.
 *
 * Everything the image produced is untrusted text and is rendered through
 * React text nodes only. There is no `dangerouslySetInnerHTML` here.
 */

type AnalyzeModule = typeof import("@/lib/imageAi/context/analyzeInBrowser");
type StorageModule = typeof import("@/lib/imageAi/context/storage");

type Phase = "empty" | "ready" | "preparing" | "analysing" | "done";

const MODE_OPTIONS = [
  { value: "fast", label: "Fast — smaller working copy, quickest result" },
  { value: "balanced", label: "Balanced — recommended" },
  { value: "detailed", label: "Detailed — larger working copy, more text" },
];

const GENERIC_ERROR =
  "Sorry — that image could not be analysed in this browser. Try a different image.";

export function AiContextPanel() {
  const fileInputId = useId();
  const modeId = useId();

  const [phase, setPhase] = useState<Phase>("empty");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [document_, setDocument] = useState<AnalysisDocument | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("balanced");
  const [tab, setTab] = useState<OutputFormat>("compact");
  const [fileError, setFileError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  // Capabilities are measured once, on the client, from feature detection
  // only — no user-agent string is consulted anywhere in this feature. This
  // panel is loaded with `ssr: false`, so the lazy initialiser runs in the
  // browser and there is no hydration mismatch to avoid.
  const [runtime] = useState<{
    capabilities: RuntimeCapabilities;
    tier: RuntimeTier;
  }>(() => {
    const capabilities = detectCapabilities();
    return { capabilities, tier: selectTier(capabilities) };
  });
  const [storageLabel, setStorageLabel] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const analyzeModuleRef = useRef<AnalyzeModule | null>(null);
  const storageModuleRef = useRef<StorageModule | null>(null);
  const ocrRef = useRef<{ engine: OcrEngine | null; reason?: string } | null>(null);
  const clientRef = useRef<AnalysisWorkerClient | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const guardRef = useRef(new JobGuard());
  const previewUrlRef = useRef<string | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const loadAnalyzeModule = useCallback(async (): Promise<AnalyzeModule> => {
    if (!analyzeModuleRef.current) {
      analyzeModuleRef.current = await import(
        "@/lib/imageAi/context/analyzeInBrowser"
      );
    }
    return analyzeModuleRef.current;
  }, []);

  const loadStorageModule = useCallback(async (): Promise<StorageModule> => {
    if (!storageModuleRef.current) {
      storageModuleRef.current = await import("@/lib/imageAi/context/storage");
    }
    return storageModuleRef.current;
  }, []);

  const refreshStorage = useCallback(async () => {
    try {
      const storage = await loadStorageModule();
      const usage = await storage.readStorageUsage();
      setStorageLabel(
        usage.unknown
          ? "Not reported by this browser"
          : storage.formatStorageSize(usage.bytes),
      );
    } catch {
      setStorageLabel("Not reported by this browser");
    }
  }, [loadStorageModule]);

  useEffect(() => {
    void refreshStorage();
  }, [refreshStorage]);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  /** Stop whatever is running and make sure its result can never land. */
  const cancelRun = useCallback(() => {
    guardRef.current.cancel();
    abortRef.current?.abort();
    abortRef.current = null;
    ocrRef.current?.engine?.cancel();
    setProgress(null);
    setPhase((current) =>
      current === "analysing" || current === "preparing" ? "ready" : current,
    );
  }, []);

  // Release everything on unmount: object URL, OCR worker, analysis worker.
  useEffect(() => {
    const guard = guardRef.current;
    return () => {
      guard.cancel();
      abortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      void ocrRef.current?.engine?.dispose();
      clientRef.current?.dispose();
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      cancelRun();
      setFileError(null);
      setRunError(null);
      setDocument(null);
      setPhase("preparing");
      // Choosing a second file while the first is still decoding must not let
      // the first one land afterwards.
      const jobId = guardRef.current.start();
      try {
        const analyzer = await loadAnalyzeModule();
        const next = await analyzer.prepareImage(file);
        if (!guardRef.current.isCurrent(jobId)) {
          URL.revokeObjectURL(next.previewUrl);
          return;
        }
        releasePreview();
        previewUrlRef.current = next.previewUrl;
        setPrepared(next);
        setPhase("ready");
      } catch (error) {
        if (!guardRef.current.isCurrent(jobId)) return;
        releasePreview();
        setPrepared(null);
        setPhase("empty");
        setFileError(
          error instanceof Error && error.message
            ? error.message
            : "That file could not be read as an image.",
        );
      }
    },
    [cancelRun, loadAnalyzeModule, releasePreview],
  );

  // Clipboard paste, so a screenshot can go straight from Print Screen to here.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      // Indexed access rather than iteration: DataTransferItemList is
      // array-like and is not iterable in every browser.
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file && file.type.startsWith("image/")) {
          event.preventDefault();
          void handleFile(file);
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const analyse = useCallback(async () => {
    if (!prepared || !runtime) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const jobId = guardRef.current.start();

    setRunError(null);
    setProgress(null);
    setPhase("analysing");

    try {
      const analyzer = await loadAnalyzeModule();

      // The OCR engine and the analysis worker are created once and reused, so
      // a second image does not repeat the WebAssembly start-up cost.
      if (!ocrRef.current) {
        ocrRef.current = await analyzer.createOcrEngineIfSupported(
          runtime.capabilities,
        );
      }
      if (!clientRef.current) {
        clientRef.current = analyzer.createAnalysisClient();
      }

      const result = await analyzer.analyzePreparedImage(prepared, {
        mode,
        signal: controller.signal,
        ocrEngine: ocrRef.current.engine,
        ocrUnavailableReason: ocrRef.current.reason,
        analysisClient: clientRef.current,
        onProgress: (update) => {
          if (guardRef.current.isCurrent(jobId)) setProgress(update);
        },
      });

      // The guard is the only thing standing between a superseded run and the
      // visitor's screen.
      if (!guardRef.current.isCurrent(jobId)) return;

      setDocument(result);
      setTab("compact");
      setPhase("done");
      setProgress(null);
      void refreshStorage();
      // Move focus to the result so keyboard users are not left at the button.
      window.requestAnimationFrame(() => resultHeadingRef.current?.focus());
    } catch (error) {
      if (!guardRef.current.isCurrent(jobId)) return;
      const name = error instanceof Error ? error.name : "";
      if (name === "AnalysisCancelledError" || controller.signal.aborted) {
        setPhase("ready");
        setProgress(null);
        return;
      }
      setPhase("ready");
      setProgress(null);
      setRunError(
        error instanceof Error && error.message && error.message.length < 200
          ? error.message
          : GENERIC_ERROR,
      );
    }
  }, [loadAnalyzeModule, mode, prepared, refreshStorage, runtime]);

  const reset = useCallback(() => {
    cancelRun();
    releasePreview();
    setPrepared(null);
    setDocument(null);
    setProgress(null);
    setFileError(null);
    setRunError(null);
    setPhase("empty");
  }, [cancelRun, releasePreview]);

  const clearModels = useCallback(async () => {
    setClearing(true);
    setClearMessage(null);
    try {
      const storage = await loadStorageModule();
      const removed = await storage.clearLocalModels();
      setClearMessage(
        removed > 0
          ? `Cleared ${removed} cached engine ${removed === 1 ? "store" : "stores"}. The next analysis will download them again.`
          : "There was nothing cached to clear.",
      );
      // A cleared cache means the next run starts cold.
      await ocrRef.current?.engine?.dispose();
      ocrRef.current = null;
    } catch {
      setClearMessage(
        "This browser did not allow the cached engine files to be cleared.",
      );
    } finally {
      setClearing(false);
      void refreshStorage();
    }
  }, [loadStorageModule, refreshStorage]);

  const download = useCallback(() => {
    if (!document_) return;
    const blob = new Blob([serializeBalancedJson(document_)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = DOWNLOAD_FILENAME;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoking synchronously can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [document_]);

  const busy = phase === "analysing" || phase === "preparing";
  const content = document_ ? serializeFormat(document_, tab) : "";
  const context = document_ ? contextForCopy(document_) : "";
  const detected = document_
    ? describeClassification(document_.classification)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <ImageDropzone
        inputId={fileInputId}
        onFile={(file) => void handleFile(file)}
        disabled={busy}
        error={fileError}
      />

      {prepared ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={prepared.previewUrl}
              alt={
                detected
                  ? `Preview of the image you selected. ${detected}.`
                  : "Preview of the image you selected."
              }
              className="max-h-72 w-full rounded-card border border-border bg-surface-subtle object-contain"
            />
            <p className="text-sm text-muted">
              {prepared.width}×{prepared.height}px ·{" "}
              {formatBytes(prepared.sizeBytes)} · {prepared.mime}
            </p>
            {prepared.warnings.map((warning) => (
              <p key={warning} className="text-sm leading-relaxed text-muted">
                {warning}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {runtime ? (
              <RuntimeIndicator
                capabilities={runtime.capabilities}
                tier={runtime.tier}
              />
            ) : null}

            <SelectInput
              id={modeId}
              label="Processing mode"
              value={mode}
              onChange={(value) => setMode(value as AnalysisMode)}
              options={MODE_OPTIONS}
              hint="Modes change how much local work is done. None of them sends your image anywhere."
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void analyse()} disabled={busy}>
                {phase === "done" ? "Analyse again" : "Analyse image"}
              </Button>
              <Button variant="secondary" onClick={reset} disabled={busy}>
                Clear image
              </Button>
            </div>

            <p className="text-sm leading-relaxed text-muted">
              Detected type:{" "}
              <span className="text-foreground">
                {detected ?? "Not analysed yet"}
              </span>
            </p>

            {runError ? (
              <p
                role="alert"
                className="text-sm font-medium leading-snug text-danger"
              >
                {runError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <AnalysisProgressBar
        progress={progress}
        onCancel={cancelRun}
        busy={busy}
      />

      {document_ ? (
        <section aria-labelledby="image-context-result" className="flex flex-col gap-4">
          <h3
            id="image-context-result"
            ref={resultHeadingRef}
            tabIndex={-1}
            className="text-base font-semibold text-foreground outline-none"
          >
            AI context for this image
          </h3>

          <ResultTabs
            active={tab}
            onChange={setTab}
            content={content}
            emptyMessage={
              tab === "raw-ocr"
                ? "No text was recognised in this image."
                : "Nothing to show for this view."
            }
          />

          <CopyActions
            context={context}
            displayed={content}
            onDownload={download}
          />

          <LimitationsList limitations={document_.limitations} />
        </section>
      ) : null}

      <PrivacyDetails
        storageLabel={storageLabel}
        onClearModels={() => void clearModels()}
        clearing={clearing}
        clearMessage={clearMessage}
      />
    </div>
  );
}
