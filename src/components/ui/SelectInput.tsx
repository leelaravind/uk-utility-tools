"use client";

import { Field, fieldDescribedBy } from "./Field";

export interface SelectInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
}

export function SelectInput({
  id,
  label,
  value,
  onChange,
  options,
  hint,
  error,
}: SelectInputProps) {
  const invalid = Boolean(error);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="relative w-full">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={fieldDescribedBy(id, hint, error)}
          className={[
            "h-11 w-full cursor-pointer appearance-none rounded-field border bg-surface pl-3 pr-10 text-base text-foreground",
            "transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            invalid ? "border-danger" : "border-border-strong",
          ].join(" ")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </Field>
  );
}
