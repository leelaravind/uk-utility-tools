"use client";

export interface CheckboxInputProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export function CheckboxInput({
  id,
  label,
  checked,
  onChange,
  hint,
}: CheckboxInputProps) {
  return (
    <div className="flex min-h-11 w-full items-start gap-3 py-1.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-border-strong accent-accent-solid"
      />
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={id}
          className="cursor-pointer text-base font-medium leading-6 text-foreground"
        >
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-sm leading-snug text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
