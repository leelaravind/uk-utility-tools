"use client";

/**
 * Small client-side helpers shared by the PDF tool tabs:
 * an accessible file picker, list move buttons and a download helper.
 * (All PDF maths lives in src/lib/files/pdfUtils.ts.)
 */

export interface LoadedPdf {
  /** Stable key for React lists. */
  id: number;
  file: File;
  pageCount: number;
  encrypted: boolean;
}

/** Trigger a browser download of PDF bytes. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  // Copy into a fresh ArrayBuffer-backed view so Blob typing is exact.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** "report.pdf" → "report"; empty names fall back to "document". */
export function fileStem(name: string): string {
  const stem = name.replace(/\.pdf$/i, "").trim();
  return stem === "" ? "document" : stem;
}

/** Return a new array with the item at `from` moved to `to` (clamped). */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(items.length - 1, to));
  if (from === target || from < 0 || from >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

export function PdfFilePicker({
  id,
  label,
  multiple,
  disabled,
  hint,
  onFiles,
}: {
  id: string;
  label: string;
  multiple?: boolean;
  disabled?: boolean;
  hint?: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Reset so choosing the same file again re-triggers onChange.
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
        className={[
          "w-full cursor-pointer rounded-field border border-dashed border-border-strong bg-surface p-2.5 text-sm text-muted",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          "file:mr-3 file:h-9 file:cursor-pointer file:rounded-field file:border-0 file:bg-accent-soft file:px-4 file:text-sm file:font-medium file:text-accent-emphasis",
        ].join(" ")}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm leading-snug text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Compact icon button for list rows (move up/down, remove, etc.). */
export function RowButton({
  label,
  glyph,
  onClick,
  disabled,
  danger,
}: {
  /** Full accessible label, e.g. "Move report.pdf up". */
  label: string;
  glyph: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-field border border-border-strong bg-surface text-base",
        "transition-colors hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-40",
        danger ? "text-danger" : "text-foreground",
      ].join(" ")}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium leading-snug text-danger">
      {message}
    </p>
  );
}

export function InlineSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="text-sm font-medium leading-snug text-success">
      {message}
    </p>
  );
}
