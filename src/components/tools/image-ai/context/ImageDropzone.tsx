"use client";

import { useState } from "react";

/**
 * Image chooser: drag-and-drop, file picker and clipboard paste.
 *
 * The whole area is a <label> wrapping a real <input type="file">, so keyboard
 * and screen-reader users get the native picker with no extra work and the
 * drag target and the button are the same control rather than two paths that
 * can drift apart.
 */
export interface ImageDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Shown beneath the drop area, in the danger colour. */
  error?: string | null;
  inputId: string;
}

export function ImageDropzone({
  onFile,
  disabled,
  error,
  inputId,
}: ImageDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={[
          "flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          disabled ? "cursor-not-allowed opacity-60" : "",
          dragOver
            ? "border-accent bg-accent-soft"
            : "border-border-strong bg-surface hover:bg-surface-subtle",
        ].join(" ")}
      >
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset so choosing the same file twice still fires a change.
            event.target.value = "";
            if (file) onFile(file);
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
          Drag an image here, or choose a file
        </span>
        <span className="text-sm text-muted">
          PNG, JPEG or WebP, up to 20 MB. You can also paste a screenshot with
          Ctrl+V.
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-sm font-medium leading-snug text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
