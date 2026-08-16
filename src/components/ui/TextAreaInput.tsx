"use client";

import { Field, fieldDescribedBy } from "./Field";

export interface TextAreaInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export function TextAreaInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  rows = 4,
  maxLength,
}: TextAreaInputProps) {
  const invalid = Boolean(error);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={fieldDescribedBy(id, hint, error)}
        className={[
          "w-full resize-y rounded-field border bg-surface px-3 py-2.5 text-base leading-relaxed text-foreground",
          "transition-colors placeholder:text-faint",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid ? "border-danger" : "border-border-strong",
        ].join(" ")}
      />
    </Field>
  );
}
