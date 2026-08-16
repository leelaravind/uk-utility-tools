"use client";

import { useMemo, useState } from "react";

import {
  CopyButton,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui";
import {
  composeAnswer,
  detectQuestionType,
  type AnswerResult,
  type Framework,
  type Tone,
} from "@/lib/career/jobAnswer";

const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] = [
  { value: "star", label: "STAR (Situation, Task, Action, Result)" },
  { value: "technical", label: "Technical (context, approach, trade-offs, outcome)" },
  { value: "concise", label: "Concise (three-sentence answer)" },
  { value: "motivation", label: "Motivation (company, role, fit)" },
];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "confident", label: "Confident" },
];

function frameworkLabel(f: Framework): string {
  return FRAMEWORK_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

export function JobAnswerTool() {
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [jobContext, setJobContext] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [framework, setFramework] = useState<Framework>("star");
  const [frameworkTouched, setFrameworkTouched] = useState(false);

  const detection = useMemo(
    () => (question.trim() ? detectQuestionType(question) : null),
    [question]
  );

  // Follow the suggested framework until the user picks one themselves.
  const effectiveFramework: Framework =
    !frameworkTouched && detection ? detection.suggestedFramework : framework;

  const result: AnswerResult | null = useMemo(() => {
    if (!question.trim()) return null;
    return composeAnswer({
      question,
      experienceNotes: notes,
      jobContext: jobContext.trim() || undefined,
      tone,
      framework: effectiveFramework,
    });
  }, [question, notes, jobContext, tone, effectiveFramework]);

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
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Structured drafting helper — templates, not AI. Nothing you type is
        uploaded; it all stays in your browser.
      </p>

      <TextInput
        id="ja-question"
        label="The application or interview question"
        value={question}
        onChange={setQuestion}
        placeholder="e.g. Tell me about a time you worked in a team"
        maxLength={300}
      />

      <TextAreaInput
        id="ja-notes"
        label="Your experience notes"
        value={notes}
        onChange={setNotes}
        rows={6}
        placeholder="e.g. Our team was two people down at Christmas. I kept same-day dispatch running. I retrained two temps. We hit 99% on-time."
        hint="Two to five short sentences about a real example — they are slotted straight into the framework. Gaps become [Add specifics] placeholders."
      />

      <TextInput
        id="ja-context"
        label="Company or role (optional)"
        value={jobContext}
        onChange={setJobContext}
        placeholder="e.g. Acme Logistics"
        hint="Used to personalise motivation and concise answers."
        maxLength={120}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          id="ja-tone"
          label="Tone"
          value={tone}
          onChange={(v) => setTone(v as Tone)}
          options={TONE_OPTIONS}
        />
        <SelectInput
          id="ja-framework"
          label="Answer framework"
          value={effectiveFramework}
          onChange={(v) => {
            setFramework(v as Framework);
            setFrameworkTouched(true);
          }}
          options={FRAMEWORK_OPTIONS}
          hint={
            detection
              ? `Suggested for this question: ${frameworkLabel(
                  detection.suggestedFramework
                )}`
              : "Pick the structure that fits the question."
          }
        />
      </div>

      {!result ? (
        <p className="rounded-field border border-border bg-surface-subtle p-4 text-sm text-muted">
          Type the question above (and ideally a few notes about a real
          example) — your structured draft appears automatically.
        </p>
      ) : (
        <div aria-live="polite" className="flex flex-col gap-6">
          <section aria-labelledby="draft-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="draft-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Your draft answer
              </h2>
              <CopyButton text={result.draft} label="Copy draft" />
            </div>
            <div className="mt-3 whitespace-pre-wrap rounded-card border border-accent-soft-border bg-accent-soft p-5 text-base leading-relaxed text-foreground">
              {result.draft}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              A scaffold, not a finished answer: replace every [Add specifics]
              placeholder, rewrite it in your own voice, and never submit it
              unedited.
            </p>
          </section>

          <section aria-labelledby="structure-heading">
            <h2
              id="structure-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              How this answer is structured
            </h2>
            <ol className="mt-3 flex flex-col gap-3">
              {result.structure.map((section, i) => (
                <li
                  key={section.heading}
                  className="rounded-field border border-border bg-surface p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {i + 1}. {section.heading}
                    {section.userContent ? (
                      <span className="ml-2 text-xs font-medium text-success">
                        uses your notes
                      </span>
                    ) : (
                      <span className="ml-2 text-xs font-medium text-danger">
                        needs your detail
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {section.guidance}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="tips-heading">
            <h2
              id="tips-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Tips for this question
            </h2>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted">
              {result.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
