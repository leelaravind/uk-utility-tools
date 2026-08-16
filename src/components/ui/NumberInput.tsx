"use client";

import { Field, fieldDescribedBy } from "./Field";

export interface NumberInputProps {
  id: string;
  label: string;
  /** Raw string — users type freely; parsing happens in calculation code. */
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  /** Advisory only — not enforced by the input (free-typing text field). */
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  min,
  max,
  step,
  prefix,
  suffix,
  placeholder,
  inputMode = "decimal",
}: NumberInputProps) {
  // min/max/step are accepted for API compatibility; validation lives in the
  // tool's calculation code, keeping typing completely unrestricted.
  void min;
  void max;
  void step;

  const invalid = Boolean(error);

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div
        className={[
          "field-affix flex h-11 w-full items-center rounded-field border bg-surface transition-colors",
          invalid ? "border-danger" : "border-border-strong",
        ].join(" ")}
      >
        {prefix ? (
          <span
            aria-hidden="true"
            className="select-none pl-3 text-base text-muted"
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={fieldDescribedBy(id, hint, error)}
          className={[
            "h-full w-full min-w-0 flex-1 rounded-field bg-transparent text-base text-foreground placeholder:text-faint",
            prefix ? "pl-2" : "pl-3",
            suffix ? "pr-2" : "pr-3",
          ].join(" ")}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="select-none pr-3 text-base text-muted"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
