"use client";

import { Field, controlClasses, fieldDescribedBy } from "./Field";

export interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  maxLength,
}: TextInputProps) {
  const invalid = Boolean(error);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={fieldDescribedBy(id, hint, error)}
        className={controlClasses(error)}
      />
    </Field>
  );
}
