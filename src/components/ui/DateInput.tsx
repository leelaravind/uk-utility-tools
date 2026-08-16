"use client";

import { Field, controlClasses, fieldDescribedBy } from "./Field";

export interface DateInputProps {
  id: string;
  label: string;
  /** YYYY-MM-DD, as produced by <input type="date">. */
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
}

export function DateInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
}: DateInputProps) {
  const invalid = Boolean(error);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={fieldDescribedBy(id, hint, error)}
        className={controlClasses(error)}
      />
    </Field>
  );
}
