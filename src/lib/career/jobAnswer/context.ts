/**
 * Turn raw form input into the structured context the composer selects on.
 *
 * Everything here is derived from what the visitor typed. Nothing is invented:
 * if a fact is not in their notes it does not appear in the context, and the
 * composer will ask for it with a bracketed prompt instead.
 */

import type {
  Corpus,
} from "@/data/jobAnswers";
import type {
  Industry,
  Seniority,
} from "@/data/jobAnswers/types";

import type { AnswerContext, AnswerRequest, DetectedSkill } from "./types";

/**
 * Job descriptions get pasted at any length. We only ever scan a bounded
 * prefix so a 200-page paste cannot lock up the main thread.
 */
export const MAX_SCAN_CHARS = 20000;
const MAX_NOTE_SENTENCES = 24;
const MAX_SKILLS = 8;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strip control characters and collapse whitespace. React handles escaping. */
export function sanitiseText(input: string | undefined, limit = MAX_SCAN_CHARS): string {
  if (!input) return "";
  return input
    // Control characters become spaces (tab, newline and carriage
    // return are kept — the sentence splitter relies on them).
    .replace(CONTROL_CHARS, " ")
    .slice(0, limit)
    .trim();
}

/** Split free text into trimmed sentences, also breaking on new lines. */
export function splitSentences(text: string): string[] {
  const cleaned = sanitiseText(text);
  if (!cleaned) return [];
  const matches = cleaned.match(/[^.!?\n\r]+[.!?]?/g);
  if (!matches) return [];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^a-z0-9]/gi, "").length > 2)
    .slice(0, MAX_NOTE_SENTENCES);
}

/** Does this sentence already carry a figure the visitor supplied? */
export function hasMeasurable(sentence: string): boolean {
  return (
    /\d/.test(sentence) ||
    /\b(half|double|tripled|doubled|quarter|third)\b/i.test(sentence)
  );
}

/** Ensure a sentence reads as a sentence when dropped into a paragraph. */
export function tidySentence(sentence: string): string {
  const trimmed = sentence.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

/* ------------------------------------------------------------------ */
/* Seniority                                                           */
/* ------------------------------------------------------------------ */

const SENIORITY_SIGNALS: { seniority: Seniority; signals: string[] }[] = [
  { seniority: "executive", signals: ["chief", "ceo", "cto", "cfo", "coo", "vp ", "vice president", "executive director", "partner"] },
  { seniority: "manager", signals: ["manager", "head of", "director", "supervisor", "team leader", "team lead"] },
  { seniority: "lead", signals: ["lead ", " lead", "principal", "staff engineer", "tech lead"] },
  { seniority: "senior", signals: ["senior", "snr", "sr.", "sr "] },
  { seniority: "student", signals: ["intern", "internship", "placement", "work experience", "student"] },
  { seniority: "graduate", signals: ["graduate", "grad scheme", "trainee", "apprentice", "entry level", "entry-level"] },
  { seniority: "junior", signals: ["junior", "assistant", "associate", "jr "] },
];

export function detectSeniority(jobTitle: string): Seniority | undefined {
  const t = ` ${jobTitle.toLowerCase()} `;
  for (const { seniority, signals } of SENIORITY_SIGNALS) {
    if (signals.some((s) => t.includes(s))) return seniority;
  }
  return undefined;
}

const SENIORITY_LABELS: Record<Seniority, string> = {
  student: "Student / intern",
  graduate: "Graduate",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead / principal",
  manager: "Manager",
  executive: "Executive",
};

export function seniorityLabel(seniority: Seniority): string {
  return SENIORITY_LABELS[seniority];
}

/* ------------------------------------------------------------------ */
/* Industry, role, skills                                              */
/* ------------------------------------------------------------------ */

export function detectIndustry(
  haystack: string,
  corpus: Corpus,
): Industry | undefined {
  const text = haystack.toLowerCase();
  let best: { industry: Industry; hits: number } | undefined;
  for (const definition of corpus.industries) {
    if (definition.id === "general") continue;
    let hits = 0;
    for (const signal of definition.signals) {
      if (signal && text.includes(signal.toLowerCase())) hits += 1;
    }
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { industry: definition.id, hits };
    }
  }
  return best?.industry;
}

export function detectRole(
  jobTitle: string,
  corpus: Corpus,
): { id: string; label: string } | undefined {
  const title = jobTitle.toLowerCase();
  if (!title.trim()) return undefined;
  let best: { id: string; label: string; length: number } | undefined;
  for (const definition of corpus.roles) {
    for (const signal of definition.signals) {
      const s = signal.toLowerCase();
      if (s && title.includes(s) && (!best || s.length > best.length)) {
        best = { id: definition.id, label: definition.label, length: s.length };
      }
    }
  }
  return best ? { id: best.id, label: best.label } : undefined;
}

export function detectSkills(
  explicitSkills: string,
  jobDescription: string,
  corpus: Corpus,
): DetectedSkill[] {
  const found: DetectedSkill[] = [];
  const seen = new Set<string>();

  // The visitor's own list wins — those are the skills they want foregrounded.
  for (const raw of explicitSkills.split(/[,\n;]+/)) {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label || label.length > 60) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    const known = corpus.skills.find(
      (s) =>
        s.label.toLowerCase() === key ||
        s.signals.some((sig) => sig.toLowerCase() === key),
    );
    seen.add(key);
    found.push({ id: known?.id ?? key.replace(/\s+/g, "-"), label: known?.label ?? label });
    if (found.length >= MAX_SKILLS) return found;
  }

  // Then top up from the job description's own vocabulary.
  const jd = jobDescription.toLowerCase();
  if (jd) {
    for (const definition of corpus.skills) {
      if (found.length >= MAX_SKILLS) break;
      if (seen.has(definition.label.toLowerCase())) continue;
      const hit = definition.signals.some((sig) => {
        const s = sig.toLowerCase();
        return s.length >= 3 && jd.includes(s);
      });
      if (hit) {
        seen.add(definition.label.toLowerCase());
        found.push({ id: definition.id, label: definition.label });
      }
    }
  }

  return found;
}

/* ------------------------------------------------------------------ */
/* Topic                                                               */
/* ------------------------------------------------------------------ */

/**
 * Prefixes we know how to strip, and what the remainder looks like once the
 * prefix is gone. `verb` means the remainder starts with a verb and must be
 * turned into a gerund before it can be dropped into a sentence, so that
 * "…you solved a difficult problem" becomes "solving a difficult problem"
 * rather than the ungrammatical "centred on solved a difficult problem".
 */
const QUESTION_PREFIXES: { pattern: RegExp; verb: boolean }[] = [
  { pattern: /^tell me about a time (?:when |that )?(?:you |you'?ve )?/i, verb: true },
  { pattern: /^tell us about a time (?:when |that )?(?:you |you'?ve )?/i, verb: true },
  { pattern: /^describe a (?:time|situation|occasion) (?:when |where |that )?(?:you |you'?ve )?/i, verb: true },
  { pattern: /^give (?:me |us )?an example of (?:a time )?(?:when |where )?(?:you |you'?ve )?/i, verb: true },
  { pattern: /^walk me through (?:a time )?(?:when )?(?:you )?/i, verb: true },
  { pattern: /^when have you /i, verb: true },
  { pattern: /^how (?:do|did|would) you /i, verb: true },
  { pattern: /^what (?:is|are|was|were) /i, verb: false },
];

/** Past tenses too irregular for the -ed rule below. */
const IRREGULAR_GERUNDS: Record<string, string> = {
  led: "leading",
  took: "taking",
  made: "making",
  went: "going",
  ran: "running",
  built: "building",
  met: "meeting",
  gave: "giving",
  dealt: "dealing",
  overcame: "overcoming",
  had: "having",
  kept: "keeping",
  held: "holding",
  won: "winning",
  lost: "losing",
  found: "finding",
  brought: "bringing",
  taught: "teaching",
  spoke: "speaking",
  wrote: "writing",
  chose: "choosing",
  put: "putting",
  set: "setting",
  sent: "sending",
  told: "telling",
  thought: "thinking",
  understood: "understanding",
  came: "coming",
  saw: "seeing",
  got: "getting",
  became: "becoming",
  began: "beginning",
  broke: "breaking",
  drove: "driving",
  fell: "falling",
  felt: "feeling",
  grew: "growing",
  left: "leaving",
  paid: "paying",
  rose: "rising",
  spent: "spending",
  stood: "standing",
  wound: "winding",
};

/** Turn the leading verb of a phrase into its -ing form. */
export function toGerund(phrase: string): string {
  const [first, ...rest] = phrase.split(/\s+/);
  if (!first) return phrase;
  const lower = first.toLowerCase();
  const tail = rest.length > 0 ? ` ${rest.join(" ")}` : "";

  const irregular = IRREGULAR_GERUNDS[lower];
  if (irregular) return `${irregular}${tail}`;

  // Already a gerund.
  if (/ing$/.test(lower)) return `${lower}${tail}`;

  let stem = lower;
  if (/ied$/.test(stem)) stem = `${stem.slice(0, -3)}y`;
  else if (/eed$/.test(stem)) stem = stem.slice(0, -1);
  else if (/ed$/.test(stem)) stem = stem.slice(0, -2);

  if (/e$/.test(stem) && !/ee$/.test(stem)) stem = stem.slice(0, -1);
  return `${stem}ing${tail}`;
}

/**
 * Reduce the question to its subject as a phrase that can be dropped straight
 * into a sentence, e.g. "Tell me about a time you handled a difficult
 * customer" → "handling a difficult customer". Used so scaffolding sentences
 * echo the question rather than restate it word for word.
 *
 * Returns undefined when the question does not match a prefix we understand.
 * A missing topic simply makes topic-using blocks ineligible, which is far
 * better than splicing a broken phrase into an answer someone will submit.
 */
export function extractTopic(question: string): string | undefined {
  const cleaned = sanitiseText(question, 300).replace(/[?.!]+\s*$/, "");
  if (!cleaned) return undefined;

  let text: string | undefined;
  let isVerbPhrase = false;
  for (const { pattern, verb } of QUESTION_PREFIXES) {
    const stripped = cleaned.replace(pattern, "");
    if (stripped !== cleaned) {
      text = stripped.trim();
      isVerbPhrase = verb;
      break;
    }
  }
  if (!text) return undefined;

  const words = text.split(/\s+/);
  if (words.length > 12) text = words.slice(0, 12).join(" ");
  // Only useful if it still reads as a phrase.
  if (text.replace(/[^a-z]/gi, "").length < 6) return undefined;

  const lowered = text.charAt(0).toLowerCase() + text.slice(1);
  return isVerbPhrase ? toGerund(lowered) : lowered;
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export function buildContext(
  request: AnswerRequest,
  corpus: Corpus,
): AnswerContext {
  const jobTitle = sanitiseText(request.jobTitle, 160);
  const company = sanitiseText(request.company, 120);
  const jobDescription = sanitiseText(request.jobDescription);
  const notes = sanitiseText(request.experienceNotes);

  const detectedRole = detectRole(jobTitle, corpus);

  const requestedIndustry =
    request.industry && request.industry !== "auto" ? request.industry : undefined;
  const inferredIndustry = detectIndustry(
    `${jobTitle} ${jobDescription} ${detectedRole?.label ?? ""}`,
    corpus,
  );
  const industry: Industry = requestedIndustry ?? inferredIndustry ?? "general";
  const industryDefinition =
    corpus.industries.find((i) => i.id === industry) ??
    corpus.industries.find((i) => i.id === "general");

  const requestedSeniority =
    request.seniority && request.seniority !== "auto" ? request.seniority : undefined;
  const inferredSeniority = detectSeniority(jobTitle);
  const seniority: Seniority = requestedSeniority ?? inferredSeniority ?? "mid";

  const userSentences = splitSentences(notes);

  return {
    role: jobTitle || detectedRole?.label || undefined,
    roleId: detectedRole?.id,
    company: company || undefined,
    industry,
    industryLabel: industryDefinition?.label ?? "General",
    industryInferred: !requestedIndustry && Boolean(inferredIndustry),
    seniority,
    seniorityLabel: seniorityLabel(seniority),
    seniorityInferred: !requestedSeniority && Boolean(inferredSeniority),
    skills: detectSkills(sanitiseText(request.skills, 400), jobDescription, corpus),
    outcomeWords: industryDefinition?.outcomeWords ?? [],
    userSentences,
    measurableSentences: userSentences.filter(hasMeasurable),
    topic: extractTopic(request.question),
  };
}
