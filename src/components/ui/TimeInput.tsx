"use client";

import { Field, controlClasses, fieldDescribedBy } from "./Field";

export interface TimeInputProps {
  id: string;
  label: string;
  /** HH:MM (24-hour), as produced by <input type="time">. */
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
}

export function TimeInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
}: TimeInputProps) {
  const invalid = Boolean(error);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={fieldDescribedBy(id, hint, error)}
        className={controlClasses(error)}
      />
    </Field>
  );
}
