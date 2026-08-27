/**
 * Job Application Answer Builder — public API.
 *
 * WHAT THIS IS: a deterministic composer over a large tagged corpus of
 * human-written sentence blocks. It classifies the question, works out the
 * candidate's context from what they typed, picks the blocks that fit, and
 * weaves the candidate's own sentences into the factual slots.
 *
 * WHAT THIS IS NOT: an AI model. No network request is made, no model is
 * called, and no text is uploaded. The UI must never describe the output as
 * AI-generated, because it is not.
 */

import { CORPUS, type Corpus } from "@/data/jobAnswers";
import {
  ANSWER_LENGTHS,
  FRAMEWORKS,
  TONES,
  type CategoryDefinition,
} from "@/data/jobAnswers/types";

import { classifyQuestion } from "./classify";
import {
  FRAMEWORK_LABELS,
  buildStar,
  composeVariant,
  planVariants,
  seedFor,
  slotsFor,
  variantToResult,
} from "./compose";
import { buildContext } from "./context";
import type {
  AnswerLength,
  AnswerRequest,
  AnswerResult,
  AnswerVariant,
  Classification,
  Framework,
  Tone,
} from "./types";

export * from "./types";
export { classifyQuestion, normaliseQuestion, isBehaviouralPhrasing } from "./classify";
export { buildContext, splitSentences, tidySentence, extractTopic } from "./context";
export { FRAMEWORK_LABELS, slotsFor, countWords } from "./compose";
export { CORPUS };
export type { Corpus };

/* ------------------------------------------------------------------ */
/* Option lists for the UI                                             */
/* ------------------------------------------------------------------ */

export const TONE_OPTIONS: { value: Tone; label: string; hint: string }[] = [
  { value: "professional", label: "Professional", hint: "Neutral and measured — the safe default for most applications." },
  { value: "confident", label: "Confident", hint: "Direct, takes clear credit. Good for sales and senior roles." },
  { value: "conversational", label: "Conversational", hint: "Warmer and more spoken. Good for interviews and customer-facing roles." },
  { value: "concise", label: "Concise", hint: "Stripped back. Good for tight word limits." },
];

export const LENGTH_OPTIONS: { value: AnswerLength; label: string; hint: string }[] = [
  { value: "short", label: "Short", hint: "Roughly 60–110 words." },
  { value: "standard", label: "Standard", hint: "Roughly 120–200 words — suits most application forms." },
  { value: "detailed", label: "Detailed", hint: "Roughly 200–300 words for a full competency statement." },
];

export const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] =
  FRAMEWORKS.map((value) => ({ value, label: FRAMEWORK_LABELS[value] }));

export { ANSWER_LENGTHS, FRAMEWORKS, TONES };

/* ------------------------------------------------------------------ */
/* Classification helper                                               */
/* ------------------------------------------------------------------ */

export function classify(
  question: string,
  corpus: Corpus = CORPUS,
): Classification {
  return classifyQuestion(question, corpus.categories);
}

export function listCategories(corpus: Corpus = CORPUS): CategoryDefinition[] {
  return corpus.categories;
}

/* ------------------------------------------------------------------ */
/* Gap guidance                                                        */
/* ------------------------------------------------------------------ */

const COMPANY_HUNGRY = new Set([
  "why-this-company",
  "why-this-job",
  "motivation",
  "values-culture",
  "why-hire-you",
]);

function buildGaps(
  request: AnswerRequest,
  result: Pick<AnswerResult, "classification" | "context">,
): string[] {
  const { context, classification } = result;
  const gaps: string[] = [];

  if (context.userSentences.length === 0) {
    gaps.push(
      "Add two to five short sentences about a real example. Everything factual in the draft comes from these notes — with none, the draft can only give you the shape of an answer.",
    );
  } else if (context.userSentences.length < 3) {
    gaps.push(
      "One more sentence would help: what you did next, and how it turned out.",
    );
  }

  if (context.measurableSentences.length === 0) {
    const examples =
      context.outcomeWords.length > 0
        ? context.outcomeWords.slice(0, 4).join(", ")
        : "time saved, errors avoided, money involved, customer impact";
    gaps.push(
      `Add one measurable result of your own. In ${context.industryLabel.toLowerCase()} work that usually means something like ${examples}. Use your real figure — never estimate upwards.`,
    );
  }

  if (!context.company && COMPANY_HUNGRY.has(classification.category)) {
    gaps.push(
      "Add the employer's name so the answer can be specific about them. A motivation answer that would fit any employer scores badly.",
    );
  }

  if (!context.role) {
    gaps.push("Add the job title so the closing line can tie back to the role.");
  }

  if (context.skills.length === 0 && !request.jobDescription?.trim()) {
    gaps.push(
      "Paste the job description, or list two or three relevant skills, so the draft can use the employer's own vocabulary.",
    );
  }

  return gaps;
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                    */
/* ------------------------------------------------------------------ */

export function buildAnswer(
  request: AnswerRequest,
  corpus: Corpus = CORPUS,
): AnswerResult {
  const classification = classify(request.question, corpus);
  const context = buildContext(request, corpus);

  const requestedFramework =
    request.framework && request.framework !== "auto"
      ? request.framework
      : classification.suggestedFramework;

  // Never let an explicit choice force STAR onto a question STAR does not fit.
  const framework: Framework =
    classification.allowedFrameworks.includes(requestedFramework)
      ? requestedFramework
      : classification.suggestedFramework;

  const variation = Number.isFinite(request.variation) ? Number(request.variation) : 0;
  const baseSeed = seedFor([
    request.question,
    request.experienceNotes,
    request.jobTitle,
    request.company,
    request.skills,
    request.tone,
    request.length,
    framework,
    context.industry,
    context.seniority,
    variation,
  ]);

  const avoid = new Set(request.avoidBlockIds ?? []);
  const plans = planVariants(framework, request.length, classification.allowedFrameworks);

  const variants: AnswerVariant[] = [];
  const usedFacts = new Set<string>();

  for (const plan of plans) {
    const composed = composeVariant({
      corpus,
      context,
      category: classification.category,
      framework: plan.framework,
      tone: request.tone,
      length: plan.length,
      seed: (baseSeed ^ plan.salt) >>> 0,
      avoid,
    });
    if (!composed.text.trim()) continue;
    variants.push(variantToResult(plan, composed));
    // Later variants steer away from what earlier ones already used.
    for (const id of composed.blockIds) avoid.add(id);
    for (const fact of composed.usedFacts) usedFacts.add(fact);
  }

  let star: AnswerResult["star"];
  if (classification.supportsStar) {
    star = buildStar({
      corpus,
      context,
      category: classification.category,
      framework: "star",
      tone: request.tone,
      length: "detailed",
      seed: (baseSeed ^ 0xc2b2ae35) >>> 0,
      avoid: new Set(request.avoidBlockIds ?? []),
    }).star;
  }

  const tips = [...classification.tips];
  const anyPlaceholders = variants.some((v) => v.text.includes("["));
  if (anyPlaceholders) {
    tips.push(
      "Every bracketed [ … ] note marks something only you can supply. Replace them all before you submit — they are there so an unfinished draft cannot pass as a finished one.",
    );
  }
  tips.push(
    "Read the draft aloud and rewrite anything that does not sound like you. This is a starting structure, not a finished answer.",
  );

  return {
    classification,
    context,
    variants,
    star,
    tips,
    gaps: buildGaps(request, { classification, context }),
    usedUserFacts: [...usedFacts],
    meta: {
      framework,
      tone: request.tone,
      length: request.length,
      variation,
      corpusBlocks: corpus.blockCount,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Corpus statistics                                                   */
/* ------------------------------------------------------------------ */

export interface CorpusStats {
  blockCount: number;
  categoryCount: number;
  industryCount: number;
  roleCount: number;
  skillCount: number;
  /**
   * Distinct block combinations across every framework and length recipe,
   * before tag filtering. An upper bound on structurally distinct drafts.
   */
  compositionSpace: number;
  /**
   * A deliberately pessimistic floor: assumes only four eligible blocks
   * survive filtering for each slot of a standard-length answer, across all
   * question categories, tones and lengths.
   */
  conservativeSpace: number;
}

export function corpusStats(corpus: Corpus = CORPUS): CorpusStats {
  let compositionSpace = 0;
  for (const framework of FRAMEWORKS) {
    for (const length of ANSWER_LENGTHS) {
      const slots = slotsFor(framework, length, "general");
      let product = 1;
      for (const role of slots) {
        const size = corpus.blocksByRole[role]?.length ?? 0;
        product *= size > 0 ? size : 1;
      }
      compositionSpace += product;
    }
  }

  const standardSlots = slotsFor("star", "standard", "general").length;
  const conservativeSpace =
    Math.pow(4, standardSlots) *
    corpus.categories.length *
    TONES.length *
    ANSWER_LENGTHS.length;

  return {
    blockCount: corpus.blockCount,
    categoryCount: corpus.categories.length,
    industryCount: corpus.industries.length,
    roleCount: corpus.roles.length,
    skillCount: corpus.skills.length,
    compositionSpace,
    conservativeSpace,
  };
}

export default buildAnswer;
