"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { formatFileSize, loadPdfMeta, reorderPages } from "@/lib/files/pdfUtils";
import {
  InlineError,
  InlineSuccess,
  PdfFilePicker,
  RowButton,
  downloadPdf,
  fileStem,
  moveItem,
  type LoadedPdf,
} from "./shared";

let nextId = 1;

export function ReorderTab() {
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changed =
    order.length > 0 && order.some((page, index) => page !== index + 1);

  async function pickFile(files: File[]) {
    const file = files[0];
    setBusy(true);
    setError(null);
    setSuccess(null);
    setLoaded(null);
    setOrder([]);
    const meta = await loadPdfMeta(file);
    if (meta.ok) {
      setLoaded({
        id: nextId++,
        file,
        pageCount: meta.value.pageCount,
        encrypted: meta.value.encrypted,
      });
      setOrder(Array.from({ length: meta.value.pageCount }, (_, i) => i + 1));
    } else {
      setError(`${file.name}: ${meta.message}`);
    }
    setBusy(false);
  }

  async function download() {
    if (!loaded) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await reorderPages(loaded.file, order);
    if (result.ok) {
      downloadPdf(result.value, `${fileStem(loaded.file.name)}-reordered.pdf`);
      setSuccess("Done — your download has started.");
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <PdfFilePicker
        id="reorder-file"
        label="Choose a PDF"
        disabled={busy}
        onFiles={pickFile}
      />

      {loaded ? (
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{loaded.file.name}</span>{" "}
          — {loaded.pageCount} page{loaded.pageCount === 1 ? "" : "s"},{" "}
          {formatFileSize(loaded.file.size)}. Use the buttons to move pages into
          the order you want, then download.
        </p>
      ) : null}

      {order.length > 0 ? (
        <ol
          className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1"
          aria-label="New page order"
        >
          {order.map((page, index) => (
            <li
              key={page}
              className="flex flex-wrap items-center gap-2 rounded-field border border-border bg-surface px-3 py-2"
            >
              <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-muted">
                {index + 1}.
              </span>
              <span className="min-w-0 flex-1 basis-24 text-sm font-medium text-foreground">
                Page {page}
                {page !== index + 1 ? (
                  <span className="ml-2 text-xs font-normal text-accent">
                    moved
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-1.5">
                <RowButton
                  label={`Move page ${page} to the top`}
                  glyph="⤒"
                  disabled={busy || index === 0}
                  onClick={() => setOrder((prev) => moveItem(prev, index, 0))}
                />
                <RowButton
                  label={`Move page ${page} up one place`}
                  glyph="↑"
                  disabled={busy || index === 0}
                  onClick={() => setOrder((prev) => moveItem(prev, index, index - 1))}
                />
                <RowButton
                  label={`Move page ${page} down one place`}
                  glyph="↓"
                  disabled={busy || index === order.length - 1}
                  onClick={() => setOrder((prev) => moveItem(prev, index, index + 1))}
                />
                <RowButton
                  label={`Move page ${page} to the bottom`}
                  glyph="⤓"
                  disabled={busy || index === order.length - 1}
                  onClick={() =>
                    setOrder((prev) => moveItem(prev, index, prev.length - 1))
                  }
                />
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <InlineError message={error} />
      <InlineSuccess message={success} />

      {loaded ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={download} disabled={busy || order.length === 0}>
            {busy ? "Working…" : "Download reordered PDF"}
          </Button>
          {!changed ? (
            <p className="text-sm text-muted">
              Pages are still in their original order.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
