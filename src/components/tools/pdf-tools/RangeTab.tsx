"use client";

import { useState } from "react";

import { Button, TextInput } from "@/components/ui";
import { formatPageList, parsePageRanges } from "@/lib/files/pageRanges";
import {
  extractPages,
  formatFileSize,
  loadPdfMeta,
  removePages,
} from "@/lib/files/pdfUtils";
import {
  InlineError,
  InlineSuccess,
  PdfFilePicker,
  downloadPdf,
  fileStem,
  type LoadedPdf,
} from "./shared";

let nextId = 1;

/**
 * Shared tab for "Split / Extract" and "Remove pages" — the only
 * difference is whether the typed pages are kept or removed.
 */
export function RangeTab({ mode }: { mode: "extract" | "remove" }) {
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const [rangeText, setRangeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed =
    loaded && rangeText.trim() !== ""
      ? parsePageRanges(rangeText, loaded.pageCount)
      : null;

  const removesEverything =
    mode === "remove" &&
    parsed?.ok === true &&
    loaded !== null &&
    parsed.pages.length >= loaded.pageCount;

  const rangeError = !parsed
    ? undefined
    : !parsed.ok
      ? parsed.message
      : removesEverything
        ? "That would remove every page — at least one page must be left in the PDF."
        : undefined;

  const ready = parsed?.ok === true && !removesEverything && !busy;

  async function pickFile(files: File[]) {
    const file = files[0];
    setBusy(true);
    setError(null);
    setSuccess(null);
    setLoaded(null);
    setRangeText("");
    const meta = await loadPdfMeta(file);
    if (meta.ok) {
      setLoaded({
        id: nextId++,
        file,
        pageCount: meta.value.pageCount,
        encrypted: meta.value.encrypted,
      });
    } else {
      setError(`${file.name}: ${meta.message}`);
    }
    setBusy(false);
  }

  async function run() {
    if (!loaded || parsed?.ok !== true) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result =
      mode === "extract"
        ? await extractPages(loaded.file, parsed.pages)
        : await removePages(loaded.file, parsed.pages);
    if (result.ok) {
      const suffix = mode === "extract" ? "extracted" : "trimmed";
      downloadPdf(result.value, `${fileStem(loaded.file.name)}-${suffix}.pdf`);
      setSuccess("Done — your download has started.");
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  const summary =
    parsed?.ok === true && loaded && !removesEverything
      ? mode === "extract"
        ? `Will extract ${parsed.pages.length} page${parsed.pages.length === 1 ? "" : "s"} (${formatPageList(parsed.pages)}) into a new PDF.`
        : `Will remove ${parsed.pages.length} page${parsed.pages.length === 1 ? "" : "s"} (${formatPageList(parsed.pages)}), keeping ${loaded.pageCount - parsed.pages.length} of ${loaded.pageCount}.`
      : null;

  return (
    <div className="flex flex-col gap-4">
      <PdfFilePicker
        id={`${mode}-file`}
        label="Choose a PDF"
        disabled={busy}
        onFiles={pickFile}
      />

      {loaded ? (
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{loaded.file.name}</span>{" "}
          — {loaded.pageCount} page{loaded.pageCount === 1 ? "" : "s"},{" "}
          {formatFileSize(loaded.file.size)}
          {loaded.encrypted
            ? ". This file has encryption — results may vary."
            : ""}
        </p>
      ) : null}

      {loaded ? (
        <TextInput
          id={`${mode}-ranges`}
          label={mode === "extract" ? "Pages to extract" : "Pages to remove"}
          value={rangeText}
          onChange={(v) => {
            setRangeText(v);
            setSuccess(null);
          }}
          placeholder="e.g. 1-3, 5, 9-12"
          hint={`Pages and ranges separated by commas. This PDF has pages 1–${loaded.pageCount}.`}
          error={rangeError}
        />
      ) : null}

      {summary ? <p className="text-sm text-muted">{summary}</p> : null}

      <InlineError message={error} />
      <InlineSuccess message={success} />

      <div>
        <Button onClick={run} disabled={!ready}>
          {busy
            ? "Working…"
            : mode === "extract"
              ? "Extract pages & download"
              : "Remove pages & download"}
        </Button>
      </div>
    </div>
  );
}
