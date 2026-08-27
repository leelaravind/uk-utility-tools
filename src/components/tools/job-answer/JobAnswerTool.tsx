"use client";

import { useCallback, useId, useRef, useState } from "react";

import {
  Button,
  CopyButton,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui";
import {
  ANSWER_LENGTHS,
  INDUSTRIES,
  SENIORITIES,
  type AnswerLength,
  type Framework,
  type Industry,
  type Seniority,
  type Tone,
} from "@/data/jobAnswers/types";
import type { AnswerResult } from "@/lib/career/jobAnswer/types";

/**
 * The answer engine and its content corpus are pulled in on first use with a
 * dynamic import, so none of it lands in this route's initial JavaScript — and
 * none of it reaches any other page on the site.
 */
type Engine = typeof import("@/lib/career/jobAnswer");

const RECENT_KEY = "itisyou-tools:job-answer:recent-blocks";
const RECENT_LIMIT = 80;

/** Remember which sentences were used recently so a rerun does not repeat them. */
function readRecentBlocks(): string[] {
  try {
    const raw = window.sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRecentBlocks(ids: string[]): void {
  try {
    window.sessionStorage.setItem(
      RECENT_KEY,
      JSON.stringify([...new Set(ids)].slice(0, RECENT_LIMIT)),
    );
  } catch {
    // Storage unavailable — repeat-avoidance simply does not persist.
  }
}

function titleCase(id: string): string {
  const words = id.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const INDUSTRY_OPTIONS = [
  { value: "auto", label: "Detect from the job details" },
  ...INDUSTRIES.map((id) => ({ value: id, label: titleCase(id) })),
];

const SENIORITY_OPTIONS = [
  { value: "auto", label: "Detect from the job title" },
  ...SENIORITIES.map((id) => ({ value: id, label: titleCase(id) })),
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "confident", label: "Confident" },
  { value: "conversational", label: "Conversational" },
  { value: "concise", label: "Concise" },
];

const LENGTH_OPTIONS = ANSWER_LENGTHS.map((value) => ({
  value,
  label:
    value === "short"
      ? "Short (about 60–110 words)"
      : value === "standard"
        ? "Standard (about 120–200 words)"
        : "Detailed (about 200–300 words)",
}));

const EXAMPLE_QUESTIONS = [
  "Tell me about yourself",
  "Why do you want to work here?",
  "Tell me about a time you solved a difficult problem",
  "Describe a time you disagreed with a colleague",
  "What is your greatest weakness?",
  "Give an example of when you worked under pressure",
  "Tell me about a time you led a team",
  "Describe a technical challenge you overcame",
];

export function JobAnswerTool() {
  const headingId = useId();

  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [industry, setIndustry] = useState<Industry | "auto">("auto");
  const [seniority, setSeniority] = useState<Seniority | "auto">("auto");
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<AnswerLength>("standard");
  const [framework, setFramework] = useState<Framework | "auto">("auto");

  const [result, setResult] = useState<AnswerResult | null>(null);
  const [variation, setVariation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<Engine | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const loadEngine = useCallback(async (): Promise<Engine> => {
    if (!engineRef.current) {
      engineRef.current = await import("@/lib/career/jobAnswer");
    }
    return engineRef.current;
  }, []);

  const build = useCallback(
    async (nextVariation: number) => {
      if (!question.trim()) {
        setError("Add the question you need to answer.");
        setResult(null);
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const engine = await loadEngine();
        const built = engine.buildAnswer({
          question,
          experienceNotes: notes,
          jobTitle,
          company,
          jobDescription,
          skills,
          industry,
          seniority,
          tone,
          length,
          framework,
          variation: nextVariation,
          avoidBlockIds: readRecentBlocks(),
        });
        setResult(built);
        setVariation(nextVariation);
        writeRecentBlocks([
          ...built.variants.flatMap((v) => v.blockIds),
          ...readRecentBlocks(),
        ]);
      } catch {
        setError(
          "Something went wrong building the draft. Try shortening the job description and generating again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [
      question,
      notes,
      jobTitle,
      company,
      jobDescription,
      skills,
      industry,
      seniority,
      tone,
      length,
      framework,
      loadEngine,
    ],
  );

  const starText = result?.star
    ? [
        `Situation: ${result.star.situation}`,
        `Task: ${result.star.task}`,
        `Action: ${result.star.action}`,
        `Result: ${result.star.result}`,
        result.star.reflection ? `Reflection: ${result.star.reflection}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

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
        <span>
          Answer Builder — a structured drafting tool, not an AI writer. It
          composes your own notes into a proven answer framework. Nothing you
          type is uploaded; it all stays in your browser.
        </span>
      </p>

      <TextInput
        id="ja-question"
        label="The application or interview question"
        value={question}
        onChange={setQuestion}
        placeholder="e.g. Tell me about a time you solved a difficult problem"
        maxLength={300}
      />

      <div>
        <p className="text-sm font-medium text-foreground">Common questions</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setQuestion(example)}
                className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-subtle"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <TextAreaInput
        id="ja-notes"
        label="Your experience notes"
        value={notes}
        onChange={setNotes}
        rows={6}
        placeholder="e.g. Our dispatch team was two people down before Christmas. I rebuilt the picking rota and retrained two temps. We kept same-day dispatch running and finished the month at 99% on time."
        hint="Two to five short factual sentences about a real example. Everything factual in the draft comes from here — the builder never invents a number, a team size or an achievement for you."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          id="ja-job-title"
          label="Job title (optional)"
          value={jobTitle}
          onChange={setJobTitle}
          placeholder="e.g. Logistics Coordinator"
          maxLength={120}
        />
        <TextInput
          id="ja-company"
          label="Company (optional)"
          value={company}
          onChange={setCompany}
          placeholder="e.g. Northgate Logistics"
          maxLength={120}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          id="ja-tone"
          label="Tone"
          value={tone}
          onChange={(v) => setTone(v as Tone)}
          options={TONE_OPTIONS}
        />
        <SelectInput
          id="ja-length"
          label="Answer length"
          value={length}
          onChange={(v) => setLength(v as AnswerLength)}
          options={LENGTH_OPTIONS}
        />
      </div>

      <details className="rounded-field border border-border bg-surface-subtle p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          More detail (optional) — job description, skills, industry, structure
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <TextAreaInput
            id="ja-jd"
            label="Job description"
            value={jobDescription}
            onChange={setJobDescription}
            rows={5}
            placeholder="Paste the advert or person specification."
            hint="Used only in your browser, to pick up the employer's own vocabulary, the industry and the skills they ask for."
          />
          <TextInput
            id="ja-skills"
            label="Relevant skills"
            value={skills}
            onChange={setSkills}
            placeholder="e.g. stakeholder management, SQL, rota planning"
            hint="Comma separated. These get priority over anything detected from the job description."
            maxLength={300}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput
              id="ja-industry"
              label="Industry"
              value={industry}
              onChange={(v) => setIndustry(v as Industry | "auto")}
              options={INDUSTRY_OPTIONS}
            />
            <SelectInput
              id="ja-seniority"
              label="Experience level"
              value={seniority}
              onChange={(v) => setSeniority(v as Seniority | "auto")}
              options={SENIORITY_OPTIONS}
            />
          </div>
          <SelectInput
            id="ja-framework"
            label="Answer structure"
            value={framework}
            onChange={(v) => setFramework(v as Framework | "auto")}
            options={[
              { value: "auto", label: "Choose automatically from the question" },
              { value: "star", label: "STAR (Situation, Task, Action, Result)" },
              { value: "car", label: "CAR (Challenge, Action, Result)" },
              { value: "direct", label: "Direct (claim, evidence, relevance)" },
              { value: "motivation", label: "Motivation (company, role, fit)" },
              { value: "technical", label: "Technical (context, approach, trade-offs, outcome)" },
              { value: "reflective", label: "Reflective (issue, correction, evidence of change)" },
            ]}
            hint="A structure that does not suit the question is ignored — STAR is never forced onto a 'why do you want to work here' answer."
          />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void build(0)} disabled={busy}>
          {busy ? "Building…" : "Build my answer"}
        </Button>
        {result ? (
          <Button variant="secondary" onClick={() => void build(variation + 1)} disabled={busy}>
            Another version
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-field border border-danger bg-surface p-4 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!result ? (
        <p className="rounded-field border border-border bg-surface-subtle p-4 text-sm text-muted">
          Add the question and a few notes about a real example, then choose
          <strong> Build my answer</strong>. You will get three drafts, a STAR
          breakdown where the question suits one, and a list of what still needs
          your own detail.
        </p>
      ) : (
        <div ref={resultsRef} aria-live="polite" className="flex flex-col gap-8">
          <section
            aria-labelledby={`${headingId}-detected`}
            className="rounded-card border border-border bg-surface p-4"
          >
            <h2
              id={`${headingId}-detected`}
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              What this question is asking
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              <strong className="text-foreground">{result.classification.label}</strong>{" "}
              — {result.classification.intent}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Structure used: {result.meta.framework.toUpperCase()}
              {result.classification.supportsStar
                ? " · a STAR breakdown suits this question"
                : " · STAR would not suit this question, so it is not used"}
              {result.context.industryInferred
                ? ` · industry detected as ${result.context.industryLabel.toLowerCase()}`
                : ""}
              {result.context.seniorityInferred
                ? ` · level detected as ${result.context.seniorityLabel.toLowerCase()}`
                : ""}
            </p>
          </section>

          {result.variants.map((variant) => (
            <section key={variant.id} aria-labelledby={`${headingId}-${variant.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={`${headingId}-${variant.id}`}
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  {variant.label}
                </h2>
                <CopyButton text={variant.text} label={`Copy ${variant.label.toLowerCase()}`} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {variant.summary} · {variant.wordCount} words
              </p>
              <div className="mt-3 whitespace-pre-wrap rounded-card border border-accent-soft-border bg-accent-soft p-5 text-base leading-relaxed text-foreground">
                {variant.text}
              </div>
            </section>
          ))}

          {result.star ? (
            <section aria-labelledby={`${headingId}-star`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={`${headingId}-star`}
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  STAR breakdown
                </h2>
                <CopyButton text={starText} label="Copy STAR" />
              </div>
              <dl className="mt-3 flex flex-col gap-3">
                {(
                  [
                    ["Situation", result.star.situation],
                    ["Task", result.star.task],
                    ["Action", result.star.action],
                    ["Result", result.star.result],
                    ...(result.star.reflection
                      ? ([["Reflection", result.star.reflection]] as [string, string][])
                      : []),
                  ] as [string, string][]
                ).map(([heading, body]) => (
                  <div key={heading} className="rounded-field border border-border bg-surface p-4">
                    <dt className="text-sm font-semibold text-foreground">{heading}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">{body}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {result.gaps.length > 0 ? (
            <section aria-labelledby={`${headingId}-gaps`}>
              <h2
                id={`${headingId}-gaps`}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                What would make this answer stronger
              </h2>
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted">
                {result.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.usedUserFacts.length > 0 ? (
            <section aria-labelledby={`${headingId}-facts`}>
              <h2
                id={`${headingId}-facts`}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Your own facts, kept intact
              </h2>
              <p className="mt-1 text-xs text-muted">
                These came from your notes and were used word for word. Nothing
                else in the draft claims anything about you.
              </p>
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted">
                {result.usedUserFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby={`${headingId}-tips`}>
            <h2
              id={`${headingId}-tips`}
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
