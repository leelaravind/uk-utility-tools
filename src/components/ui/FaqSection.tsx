export interface FaqSectionProps {
  faqs: { question: string; answer: string }[];
}

/**
 * Server-renderable FAQ list using native <details>/<summary> — no JS needed.
 * JSON-LD is intentionally NOT rendered here; ToolLayout owns structured data.
 */
export function FaqSection({ faqs }: FaqSectionProps) {
  if (faqs.length === 0) return null;
  return (
    <section
      id="faqs"
      aria-labelledby="faqs-heading"
      className="mt-12 border-t border-border pt-8"
    >
      <h2
        id="faqs-heading"
        className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        Frequently asked questions
      </h2>
      <div className="mt-4 divide-y divide-border">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2.5 text-left text-base font-medium text-foreground [&::-webkit-details-marker]:hidden">
              {faq.question}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="pb-4 pr-8 text-base leading-relaxed text-muted">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
