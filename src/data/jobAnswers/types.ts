/**
 * Job Answer corpus — shared type contract.
 *
 * FROZEN CONTRACT. Every file in `src/data/jobAnswers/` conforms to these
 * types, and the composer in `src/lib/career/jobAnswer/` only ever reads them.
 * Contributors add content by appending blocks to the themed files; nobody
 * edits one giant file, and nothing here contains a hard-coded finished answer.
 *
 * Nothing in this system calls a model. Blocks are human-written sentence
 * scaffolds; the composer picks, fills and orders them deterministically.
 */

/* ------------------------------------------------------------------ */
/* Axes                                                                */
/* ------------------------------------------------------------------ */

export const QUESTION_CATEGORIES = [
  "tell-me-about-yourself",
  "why-this-job",
  "why-this-company",
  "why-hire-you",
  "strengths",
  "weakness",
  "challenge",
  "conflict",
  "failure",
  "success",
  "leadership",
  "teamwork",
  "communication",
  "problem-solving",
  "technical-challenge",
  "pressure",
  "deadlines",
  "prioritisation",
  "ambiguity",
  "stakeholder",
  "learning-quickly",
  "initiative",
  "innovation",
  "adaptability",
  "feedback",
  "career-goals",
  "motivation",
  "values-culture",
  "graduate",
  "internship",
  "technical-role",
  "management-role",
  "behavioural",
  "competency",
  "general",
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

/** Answer structures the composer knows how to assemble. */
export const FRAMEWORKS = [
  "star", // Situation, Task, Action, Result (+ reflection)
  "car", // Challenge, Action, Result — tighter behavioural variant
  "direct", // Claim, evidence, relevance — strengths and short form boxes
  "motivation", // Company, role, fit — "why us / why this job"
  "technical", // Context, approach, trade-offs, outcome
  "reflective", // Situation, honest assessment, correction, evidence of change
] as const;

export type Framework = (typeof FRAMEWORKS)[number];

export const TONES = [
  "professional",
  "confident",
  "conversational",
  "concise",
] as const;

export type Tone = (typeof TONES)[number];

export const ANSWER_LENGTHS = ["short", "standard", "detailed"] as const;
export type AnswerLength = (typeof ANSWER_LENGTHS)[number];

export const SENIORITIES = [
  "student",
  "graduate",
  "junior",
  "mid",
  "senior",
  "lead",
  "manager",
  "executive",
] as const;

export type Seniority = (typeof SENIORITIES)[number];

export const INDUSTRIES = [
  "technology",
  "finance",
  "healthcare",
  "retail",
  "hospitality",
  "education",
  "public-sector",
  "logistics",
  "manufacturing",
  "construction",
  "creative",
  "sales",
  "customer-service",
  "legal",
  "engineering",
  "science",
  "nonprofit",
  "general",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

/**
 * Where a block sits in an assembled answer. One block fills one slot.
 */
export const BLOCK_ROLES = [
  "opening",
  "situation",
  "task",
  "action",
  "result",
  "reflection",
  "transition",
  "closing",
  "motivation-company",
  "motivation-role",
  "motivation-fit",
  "claim",
  "evidence",
  "relevance",
  "weakness-frame",
  "weakness-correction",
  "goal-frame",
  "technical-context",
  "technical-approach",
  "technical-tradeoff",
  "technical-outcome",
] as const;

export type BlockRole = (typeof BLOCK_ROLES)[number];

/* ------------------------------------------------------------------ */
/* Template variables                                                  */
/* ------------------------------------------------------------------ */

/**
 * Variables a block may interpolate, written in the text as `{role}`.
 *
 * CRITICAL SAFETY RULE: every value comes from something the visitor typed or
 * chose. There is no variable for an invented metric, team size, percentage or
 * revenue figure, and there never will be — unsupplied detail becomes a
 * bracketed prompt asking for the visitor's own real number, never a
 * plausible-sounding fake one.
 */
export const TEMPLATE_VARS = [
  "role", // job title being applied for
  "company", // employer name
  "industry", // human-readable industry label
  "seniority", // human-readable seniority label
  "skill", // one selected relevant skill
  "skills", // relevant skills, joined naturally
  "experience", // a sentence of the visitor's own experience notes
  "achievement", // the visitor's own stated achievement
  "topic", // subject of the question, derived from the question text
] as const;

export type TemplateVar = (typeof TEMPLATE_VARS)[number];

/* ------------------------------------------------------------------ */
/* Content blocks                                                      */
/* ------------------------------------------------------------------ */

/**
 * One reusable sentence (or short group of sentences) that can fill one slot
 * of one answer.
 *
 * Tag arrays are FILTERS, and an absent or empty array means "no restriction
 * on this axis". A block is eligible when every present filter matches the
 * request, and every variable in `requires` has a real value.
 */
export interface ContentBlock {
  /** Stable unique id, e.g. "sit-tech-deadline-01". Used for repeat-avoidance. */
  id: string;
  role: BlockRole;
  /**
   * The sentence. May contain `{var}` placeholders from TEMPLATE_VARS, and
   * `[[prompt text]]` markers which render as a visible bracketed request for
   * the visitor's own detail.
   */
  text: string;
  categories?: QuestionCategory[];
  frameworks?: Framework[];
  industries?: Industry[];
  seniority?: Seniority[];
  tones?: Tone[];
  lengths?: AnswerLength[];
  /** Variables that must have a real value before this block may be used. */
  requires?: TemplateVar[];
  /** Block ids that must not appear in the same answer. */
  conflictsWith?: string[];
  /** Selection weight; higher is picked more often. Defaults to 1. */
  weight?: number;
}

/* ------------------------------------------------------------------ */
/* Question taxonomy                                                   */
/* ------------------------------------------------------------------ */

export interface CategoryDefinition {
  id: QuestionCategory;
  /** Display name, e.g. "Tell me about a challenge". */
  label: string;
  /** One-line description of what the interviewer is really assessing. */
  intent: string;
  /** Regular expressions matched (case-insensitively) against the question. */
  patterns: RegExp[];
  /** Extra confidence for a category when these words appear. */
  keywords?: string[];
  /** Framework used unless the visitor overrides it. */
  defaultFramework: Framework;
  /** Frameworks that make sense for this category, best first. */
  allowedFrameworks: Framework[];
  /** Whether a Situation/Task/Action/Result breakdown is meaningful here. */
  supportsStar: boolean;
  /** Question-specific coaching shown beside the draft. */
  tips: string[];
  /** Example questions used for the picker and for tests. */
  examples: string[];
}

/* ------------------------------------------------------------------ */
/* Reference vocabularies                                              */
/* ------------------------------------------------------------------ */

export interface IndustryDefinition {
  id: Industry;
  label: string;
  /** Words in a job description or role title that indicate this industry. */
  signals: string[];
  /** Outcome vocabulary that is credible in this industry, e.g. "throughput". */
  outcomeWords: string[];
}

export interface RoleDefinition {
  id: string;
  label: string;
  industries: Industry[];
  seniority: Seniority[];
  /** Words in a job title that indicate this role. */
  signals: string[];
}

export interface SkillDefinition {
  id: string;
  label: string;
  /** Words that indicate this skill in a job description. */
  signals: string[];
  industries?: Industry[];
}

/* ------------------------------------------------------------------ */
/* Helpers for corpus files                                            */
/* ------------------------------------------------------------------ */

/** Identity helper that gives corpus files full type checking inline. */
export function blocks(list: ContentBlock[]): ContentBlock[] {
  return list;
}
