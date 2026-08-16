"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { formatFileSize, loadPdfMeta, mergePdfs } from "@/lib/files/pdfUtils";
import {
  InlineError,
  InlineSuccess,
  PdfFilePicker,
  RowButton,
  downloadPdf,
  moveItem,
  type LoadedPdf,
} from "./shared";

let nextId = 1;

export function MergeTab() {
  const [files, setFiles] = useState<LoadedPdf[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  async function addFiles(picked: File[]) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const problems: string[] = [];
    const loaded: LoadedPdf[] = [];
    for (const file of picked) {
      const meta = await loadPdfMeta(file);
      if (meta.ok) {
        loaded.push({
          id: nextId++,
          file,
          pageCount: meta.value.pageCount,
          encrypted: meta.value.encrypted,
        });
      } else {
        problems.push(`${file.name}: ${meta.message}`);
      }
    }
    if (loaded.length > 0) setFiles((prev) => [...prev, ...loaded]);
    if (problems.length > 0) setError(problems.join(" "));
    setBusy(false);
  }

  async function merge() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await mergePdfs(files.map((f) => f.file));
    if (result.ok) {
      downloadPdf(result.value, "merged.pdf");
      setSuccess(
        `Merged ${files.length} files (${totalPages} pages) — your download has started.`,
      );
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <PdfFilePicker
        id="merge-files"
        label="Add PDF files to merge"
        multiple
        disabled={busy}
        hint="Pick two or more PDFs. You can add more files afterwards and change the order below."
        onFiles={addFiles}
      />

      {files.length > 0 ? (
        <ol className="flex flex-col gap-2" aria-label="Files to merge, in order">
          {files.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-field border border-border bg-surface px-3 py-2"
            >
              <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted">
                {index + 1}.
              </span>
              <span className="min-w-0 flex-1 basis-40">
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.file.name}
                </span>
                <span className="block text-xs text-muted">
                  {item.pageCount} page{item.pageCount === 1 ? "" : "s"} ·{" "}
                  {formatFileSize(item.file.size)}
                  {item.encrypted ? " · has encryption — may not merge cleanly" : ""}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <RowButton
                  label={`Move ${item.file.name} up`}
                  glyph="↑"
                  disabled={busy || index === 0}
                  onClick={() => setFiles((prev) => moveItem(prev, index, index - 1))}
                />
                <RowButton
                  label={`Move ${item.file.name} down`}
                  glyph="↓"
                  disabled={busy || index === files.length - 1}
                  onClick={() => setFiles((prev) => moveItem(prev, index, index + 1))}
                />
                <RowButton
                  label={`Remove ${item.file.name} from the list`}
                  glyph="✕"
                  danger
                  disabled={busy}
                  onClick={() =>
                    setFiles((prev) => prev.filter((f) => f.id !== item.id))
                  }
                />
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <InlineError message={error} />
      <InlineSuccess message={success} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={merge}
          disabled={busy || files.length < 2}
        >
          {busy ? "Working…" : "Merge & download PDF"}
        </Button>
        {files.length === 1 ? (
          <p className="text-sm text-muted">Add at least one more PDF to merge.</p>
        ) : null}
        {files.length >= 2 ? (
          <p className="text-sm text-muted">
            {files.length} files · {totalPages} pages in total
          </p>
        ) : null}
      </div>
    </div>
  );
}
