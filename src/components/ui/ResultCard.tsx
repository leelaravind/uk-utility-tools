import type { ReactNode } from "react";

export interface ResultCardProps {
  title?: string;
  primary: { label: string; value: string };
  rows?: { label: string; value: string; strong?: boolean }[];
  footnote?: string;
  actions?: ReactNode;
  children?: ReactNode;
  /** Announce updates to screen readers (sets aria-live="polite"). */
  live?: boolean;
}

/** The visually prominent result panel: accent-tinted, large primary value. */
export function ResultCard({
  title,
  primary,
  rows,
  footnote,
  actions,
  children,
  live,
}: ResultCardProps) {
  return (
    <div
      aria-live={live ? "polite" : undefined}
      className="rounded-card border border-accent-soft-border bg-accent-soft p-5 sm:p-6"
    >
      {title ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent-emphasis">
          {title}
        </p>
      ) : null}

      <p className="text-sm font-medium text-muted">{primary.label}</p>
      <p className="mt-1 break-words text-4xl font-semibold tracking-tight text-accent-emphasis tabular-nums">
        {primary.value}
      </p>

      {rows && rows.length > 0 ? (
        <dl className="mt-5 flex flex-col">
          {rows.map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className={[
                "flex items-baseline justify-between gap-4 border-t border-accent-soft-border py-2.5",
                row.strong ? "font-semibold text-foreground" : "",
              ].join(" ")}
            >
              <dt
                className={
                  row.strong ? "text-sm sm:text-base" : "text-sm text-muted"
                }
              >
                {row.label}
              </dt>
              <dd
                className={[
                  "text-right tabular-nums",
                  row.strong
                    ? "text-base text-foreground"
                    : "text-sm text-foreground sm:text-base",
                ].join(" ")}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children}

      {actions ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}

      {footnote ? (
        <p className="mt-4 text-xs leading-relaxed text-muted">{footnote}</p>
      ) : null}
    </div>
  );
}
