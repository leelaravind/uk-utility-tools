/**
 * Public types for the Job Application Answer Builder.
 *
 * The builder is a deterministic composer over a tagged content corpus. It is
 * NOT an AI model and never contacts one: no request leaves the browser, and
 * the UI must never describe the output as AI-generated.
 */

import type {
  AnswerLength,
  Framework,
  Industry,
  QuestionCategory,
  Seniority,
  Tone,
} from "@/data/jobAnswers/types";

export type {
  AnswerLength,
  Framework,
  Industry,
  QuestionCategory,
  Seniority,
  Tone,
};

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

export interface AnswerRequest {
  /** The application or interview question, in the employer's words. */
  question: string;
  /** The visitor's own notes about a real example. The only source of facts. */
  experienceNotes: string;
  /** Job title being applied for. */
  jobTitle?: string;
  /** Employer name. */
  company?: string;
  /** Pasted job description — mined for vocabulary, industry and skills. */
  jobDescription?: string;
  /** Comma/newline separated skills the visitor wants to foreground. */
  skills?: string;
  /** "auto" derives the industry from the job title and description. */
  industry?: Industry | "auto";
  /** "auto" derives seniority from the job title. */
  seniority?: Seniority | "auto";
  tone: Tone;
  length: AnswerLength;
  /** "auto" uses the framework suggested by the question classifier. */
  framework?: Framework | "auto";
  /**
   * Bumped by the UI each time the visitor asks for another draft. Same
   * request + same number always yields the same answer.
   */
  variation?: number;
  /** Block ids used in recent drafts, avoided where an alternative exists. */
  avoidBlockIds?: string[];
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

export interface CategoryScore {
  category: QuestionCategory;
  label: string;
  score: number;
}

export interface Classification {
  category: QuestionCategory;
  label: string;
  /** What the interviewer is really assessing. */
  intent: string;
  /** 0–1. Low confidence means the question did not match anything specific. */
  confidence: number;
  /** Whether a Situation/Task/Action/Result breakdown is meaningful here. */
  supportsStar: boolean;
  /** True for competency/behavioural style questions. */
  behavioural: boolean;
  /** Framework the classifier recommends. */
  suggestedFramework: Framework;
  allowedFrameworks: Framework[];
  /** Runners-up, best first — used to explain the choice in the UI. */
  alternatives: CategoryScore[];
  tips: string[];
}

/* ------------------------------------------------------------------ */
/* Derived context                                                     */
/* ------------------------------------------------------------------ */

export interface DetectedSkill {
  id: string;
  label: string;
}

export interface AnswerContext {
  role?: string;
  roleId?: string;
  company?: string;
  industry: Industry;
  industryLabel: string;
  /** True when the industry was inferred rather than chosen. */
  industryInferred: boolean;
  seniority: Seniority;
  seniorityLabel: string;
  seniorityInferred: boolean;
  skills: DetectedSkill[];
  /** Outcome vocabulary credible in this industry — suggestions only. */
  outcomeWords: string[];
  /** The visitor's notes, split into sentences. */
  userSentences: string[];
  /** Sentences that already contain a figure — always preserved verbatim. */
  measurableSentences: string[];
  /** Subject of the question, e.g. "working to a tight deadline". */
  topic?: string;
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

export interface StarBreakdown {
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection?: string;
}

export type VariantId = "primary" | "concise" | "alternative";

export interface AnswerVariant {
  id: VariantId;
  /** Heading shown above the variant, e.g. "Best answer". */
  label: string;
  /** One line explaining how this variant differs. */
  summary: string;
  text: string;
  wordCount: number;
  framework: Framework;
  length: AnswerLength;
  /** Corpus block ids used — fed back in to avoid immediate repeats. */
  blockIds: string[];
}

export interface AnswerResult {
  classification: Classification;
  context: AnswerContext;
  variants: AnswerVariant[];
  /** Present only when the question type genuinely suits STAR. */
  star?: StarBreakdown;
  tips: string[];
  /** What the visitor still needs to supply for a strong answer. */
  gaps: string[];
  /** The visitor's own sentences the draft preserved, for reassurance. */
  usedUserFacts: string[];
  meta: {
    framework: Framework;
    tone: Tone;
    length: AnswerLength;
    variation: number;
    /** Total blocks in the loaded corpus. */
    corpusBlocks: number;
  };
}
