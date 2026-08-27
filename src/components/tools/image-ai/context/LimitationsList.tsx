"use client";

/**
 * What this result cannot tell you.
 *
 * Shown next to the result rather than hidden behind a disclosure, because a
 * compact interpretation of an image is only safe to paste into an AI if the
 * person pasting it knows what was left out.
 */
export interface LimitationsListProps {
  limitations: string[];
}

export function LimitationsList({ limitations }: LimitationsListProps) {
  if (limitations.length === 0) return null;

  return (
    <section
      aria-labelledby="image-context-limitations"
      className="rounded-card border border-border bg-surface p-4 sm:p-5"
    >
      <h3
        id="image-context-limitations"
        className="text-sm font-semibold text-foreground"
      >
        Limitations of this result
      </h3>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted">
        {limitations.map((limitation, index) => (
          <li key={`${index}-${limitation.slice(0, 24)}`}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
