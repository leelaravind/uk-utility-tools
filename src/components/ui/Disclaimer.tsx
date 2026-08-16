import type { ReactNode } from "react";

export interface DisclaimerProps {
  /** Heading for the note box. Defaults to "Disclaimer". */
  title?: string;
  children: ReactNode;
}

/** Subtle bordered note box for caveats and "not advice" statements. */
export function Disclaimer({ title = "Disclaimer", children }: DisclaimerProps) {
  return (
    <aside className="rounded-card border border-border bg-surface-subtle p-4 sm:p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-muted">{children}</div>
    </aside>
  );
}
