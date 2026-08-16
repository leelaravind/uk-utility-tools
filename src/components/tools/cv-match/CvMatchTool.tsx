"use client";

import { useMemo, useState } from "react";

import { TextAreaInput } from "@/components/ui";
import {
  analyseCvMatch,
  TOP_TERM_LIMIT,
  type CvMatchResult,
  type MatchTerm,
} from "@/lib/career/cvMatch";

function scoreLabel(score: number): string {
  if (score >= 75) return "Strong keyword match";
  if (score >= 50) return "Reasonable keyword match";
  if (score >= 25) return "Partial keyword match";
  return "Weak keyword match";
}

function TermChips({
  terms,
  matched,
}: {
  terms: MatchTerm[];
  matched: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {terms.map((t) => (
        <li
          key={t.term}
          className={
            matched
              ? "rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-emphasis"
              : "rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted"
          }
        >
          {t.term}
          {!matched && t.weight >= 5 ? (
            <span className="ml-1.5 text-xs font-medium text-danger">
              high priority
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CvMatchTool() {
  const [cvText, setCvText] = useState("");
  const [jdText, setJdText] = useState("");

  const ready = cvText.trim().length > 0 && jdText.trim().length > 0;

  const result: CvMatchResult | null = useMemo(() => {
    if (!ready) return null;
    return analyseCvMatch(cvText, jdText);
  }, [ready, cvText, jdText]);

  const topTermCount = result
    ? Math.min(
        TOP_TERM_LIMIT,
        result.matchedTerms.length + result.missingTerms.length
      )
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2.5 rounded-field border border-accent-soft-border bg-accent-soft p-3.5 text-sm font-medium leading-relaxed text-accent-emphasis">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Analysed on your device — your CV is never uploaded. Everything on this
        page runs locally in your browser.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextAreaInput
          id="cv-text"
          label="Your CV"
          value={cvText}
          onChange={setCvText}
          rows={12}
          placeholder="Paste the full text of your CV here…"
          hint="Include your skills section and work history for the best comparison."
        />
        <TextAreaInput
          id="jd-text"
          label="Job description"
          value={jdText}
          onChange={setJdText}
          rows={12}
          placeholder="Paste the job advert here…"
          hint="Include the requirements or person specification section."
        />
      </div>

      {!result ? (
        <p className="rounded-field border border-border bg-surface-subtle p-4 text-sm text-muted">
          Paste both your CV and the job description above — the match analysis
          appears automatically.
        </p>
      ) : (
        <div aria-live="polite" className="flex flex-col gap-6">
          <div className="rounded-card border border-accent-soft-border bg-accent-soft p-5 sm:p-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent-emphasis">
              Match analysis
            </p>
            <p className="text-sm font-medium text-muted">
              Estimated keyword match score
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-accent-emphasis tabular-nums">
              {result.score} / 100
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {scoreLabel(result.score)}
            </p>

            <div className="mt-4">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={result.score}
                aria-label="Keyword match score"
                className="h-2.5 w-full overflow-hidden rounded-full border border-accent-soft-border bg-surface"
              >
                <div
                  className="h-full rounded-full bg-accent-solid transition-all"
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            <dl className="mt-5 flex flex-col">
              <div className="flex items-baseline justify-between gap-4 border-t border-accent-soft-border py-2.5">
                <dt className="text-sm text-muted">Keywords found in your CV</dt>
                <dd className="text-right text-sm text-foreground tabular-nums sm:text-base">
                  {result.matchedTerms.length} of {topTermCount}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-accent-soft-border py-2.5">
                <dt className="text-sm text-muted">Hard requirements spotted</dt>
                <dd className="text-right text-sm text-foreground tabular-nums sm:text-base">
                  {result.hardRequirements.length}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              Score = weighted share of the top {TOP_TERM_LIMIT} job-description
              keywords that also appear in your CV (frequency + requirement
              lines + skills dictionary). It is an illustrative keyword check,
              not an ATS score or a prediction of success.
            </p>
          </div>

          {result.warnings.length > 0 ? (
            <div className="rounded-field border border-border bg-surface-subtle p-4">
              <h2 className="text-sm font-semibold text-foreground">
                Things to check
              </h2>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.matchedTerms.length > 0 ? (
            <section aria-labelledby="matched-heading">
              <h2
                id="matched-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Keywords already in your CV
              </h2>
              <div className="mt-3">
                <TermChips terms={result.matchedTerms} matched />
              </div>
            </section>
          ) : null}

          {result.missingTerms.length > 0 ? (
            <section aria-labelledby="missing-heading">
              <h2
                id="missing-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Missing keywords, highest priority first
              </h2>
              <p className="mt-1 text-sm text-muted">
                Only add a keyword if it is genuinely true of you — never
                invent skills.
              </p>
              <div className="mt-3">
                <TermChips terms={result.missingTerms} matched={false} />
              </div>
            </section>
          ) : null}

          {result.hardRequirements.length > 0 ? (
            <section aria-labelledby="hard-req-heading">
              <h2
                id="hard-req-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Hard requirements in the advert
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {result.hardRequirements.map((req) => (
                  <li
                    key={`${req.kind}-${req.text}`}
                    className="flex items-start justify-between gap-4 rounded-field border border-border bg-surface p-3"
                  >
                    <span className="text-sm text-foreground">{req.text}</span>
                    {req.metInCv ? (
                      <span className="shrink-0 text-sm font-medium text-success">
                        Mentioned in your CV
                      </span>
                    ) : (
                      <span className="shrink-0 text-sm font-medium text-danger">
                        Not found in your CV
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Detected with simple patterns (years of experience, degrees,
                licences, certifications) — always read the advert yourself.
              </p>
            </section>
          ) : null}

          {result.suggestions.length > 0 ? (
            <section aria-labelledby="suggestions-heading">
              <h2
                id="suggestions-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Suggestions
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {result.suggestions.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-sm font-semibold text-foreground">
                      {group.label}
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {group.terms.map((term) => (
                        <li
                          key={term}
                          className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted"
                        >
                          {term}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
