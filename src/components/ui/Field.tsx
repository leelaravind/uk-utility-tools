import type { ReactNode } from "react";

/**
 * Internal field wrapper: label, control, hint and error with correct
 * aria wiring. Input components compute their own aria-describedby via
 * `fieldDescribedBy` (hint id = `${id}-hint`, error id = `${id}-error`).
 */
export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** ids for aria-describedby, matching what <Field> renders. */
export function fieldDescribedBy(
  id: string,
  hint?: string,
  error?: string,
): string | undefined {
  const ids: string[] = [];
  if (hint) ids.push(`${id}-hint`);
  if (error) ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** Shared look for plain (non-affix) form controls. */
export function controlClasses(error?: string): string {
  return [
    "h-11 w-full rounded-field border bg-surface px-3 text-base text-foreground",
    "transition-colors placeholder:text-faint",
    "disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-danger" : "border-border-strong",
  ].join(" ");
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm leading-snug text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-sm font-medium leading-snug text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
