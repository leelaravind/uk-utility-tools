/**
 * Answer composition.
 *
 * A recipe decides which slots an answer has; selection fills each slot from
 * the tagged corpus; the visitor's own sentences are woven into the factual
 * slots. Where the visitor has given us nothing for a factual slot, the draft
 * asks them for it in brackets — it never fills the gap with an invented
 * achievement, number or employer.
 */

import type { Corpus } from "@/data/jobAnswers";
import type { BlockRole, ContentBlock } from "@/data/jobAnswers/types";

import { createRng, hashString, type Rng } from "./random";
import {
  commitBlock,
  renderBlock,
  selectBlock,
  type SelectionContext,
  type TemplateValues,
} from "./select";
import { tidySentence } from "./context";
import type {
  AnswerContext,
  AnswerLength,
  AnswerVariant,
  Framework,
  QuestionCategory,
  StarBreakdown,
  Tone,
  VariantId,
} from "./types";

/* ------------------------------------------------------------------ */
/* Recipes                                                             */
/* ------------------------------------------------------------------ */

type Recipe = Record<AnswerLength, BlockRole[]>;

const RECIPES: Record<Framework, Recipe> = {
  star: {
    short: ["situation", "action", "result"],
    standard: ["opening", "situation", "task", "action", "result", "closing"],
    detailed: [
      "opening",
      "situation",
      "task",
      "transition",
      "action",
      "result",
      "reflection",
      "closing",
    ],
  },
  car: {
    short: ["situation", "action", "result"],
    standard: ["opening", "situation", "action", "result", "reflection"],
    detailed: [
      "opening",
      "situation",
      "action",
      "transition",
      "result",
      "reflection",
      "closing",
    ],
  },
  direct: {
    short: ["claim", "evidence"],
    standard: ["claim", "evidence", "relevance"],
    detailed: ["opening", "claim", "evidence", "transition", "relevance", "closing"],
  },
  motivation: {
    short: ["motivation-company", "motivation-fit"],
    standard: ["motivation-company", "motivation-role", "motivation-fit"],
    detailed: [
      "opening",
      "motivation-company",
      "motivation-role",
      "transition",
      "motivation-fit",
      "closing",
    ],
  },
  technical: {
    short: ["technical-context", "technical-approach", "technical-outcome"],
    standard: [
      "technical-context",
      "technical-approach",
      "technical-tradeoff",
      "technical-outcome",
    ],
    detailed: [
      "opening",
      "technical-context",
      "technical-approach",
      "technical-tradeoff",
      "transition",
      "technical-outcome",
      "closing",
    ],
  },
  reflective: {
    short: ["weakness-frame", "weakness-correction"],
    standard: ["weakness-frame", "situation", "weakness-correction", "reflection"],
    detailed: [
      "opening",
      "weakness-frame",
      "situation",
      "action",
      "weakness-correction",
      "reflection",
      "closing",
    ],
  },
};

/**
 * A few question types need a shape no generic framework provides.
 * Overrides are merged on top of the framework recipe.
 */
const CATEGORY_RECIPE_OVERRIDES: Partial<
  Record<QuestionCategory, Partial<Recipe>>
> = {
  "career-goals": {
    short: ["goal-frame", "relevance"],
    standard: ["goal-frame", "evidence", "relevance"],
    detailed: ["opening", "goal-frame", "evidence", "transition", "relevance", "closing"],
  },
  "tell-me-about-yourself": {
    short: ["claim", "evidence"],
    standard: ["opening", "claim", "evidence", "relevance"],
    detailed: ["opening", "claim", "evidence", "transition", "goal-frame", "relevance", "closing"],
  },
};

export function slotsFor(
  framework: Framework,
  length: AnswerLength,
  category: QuestionCategory,
): BlockRole[] {
  const override = CATEGORY_RECIPE_OVERRIDES[category]?.[length];
  if (override) return [...override];
  return [...RECIPES[framework][length]];
}

/** Slots whose content must come from the visitor, never from the corpus. */
const FACTUAL_ROLES = new Set<BlockRole>([
  "situation",
  "task",
  "action",
  "result",
  "evidence",
  "technical-context",
  "technical-approach",
  "technical-tradeoff",
  "technical-outcome",
]);

/* ------------------------------------------------------------------ */
/* Distributing the visitor's own sentences                            */
/* ------------------------------------------------------------------ */

/**
 * Spread the visitor's notes across the factual slots in the order they wrote
 * them, reserving a sentence that already contains a figure for the Result
 * slot — that is where a measurable outcome does the most work.
 */
export function distributeSentences(
  sentences: string[],
  slots: BlockRole[],
): Map<number, string> {
  const assignment = new Map<number, string>();
  const factualIndexes = slots
    .map((role, index) => ({ role, index }))
    .filter(({ role }) => FACTUAL_ROLES.has(role))
    .map(({ index }) => index);

  if (sentences.length === 0 || factualIndexes.length === 0) return assignment;

  const pool = [...sentences];
  const outcomeSlot = slots.findIndex(
    (role) => role === "result" || role === "technical-outcome",
  );

  let reserved: string | undefined;
  if (outcomeSlot >= 0) {
    // Prefer the last sentence carrying a figure; otherwise the last sentence,
    // which is where people naturally put the outcome.
    const measurable = pool.filter((s) => /\d/.test(s));
    reserved = measurable.length > 0 ? measurable[measurable.length - 1] : pool[pool.length - 1];
    if (pool.length > 1) pool.splice(pool.indexOf(reserved), 1);
    else reserved = undefined;
  }

  const targets = factualIndexes.filter((i) => i !== outcomeSlot || !reserved);
  if (targets.length > 0 && pool.length > 0) {
    const perSlot = Math.ceil(pool.length / targets.length);
    targets.forEach((slotIndex, position) => {
      const chunk = pool.slice(position * perSlot, (position + 1) * perSlot);
      if (chunk.length > 0) {
        assignment.set(slotIndex, chunk.map(tidySentence).join(" "));
      }
    });
  }

  if (reserved && outcomeSlot >= 0) {
    assignment.set(outcomeSlot, tidySentence(reserved));
  }

  return assignment;
}

/* ------------------------------------------------------------------ */
/* Composing one variant                                               */
/* ------------------------------------------------------------------ */

export interface ComposeOptions {
  corpus: Corpus;
  context: AnswerContext;
  category: QuestionCategory;
  framework: Framework;
  tone: Tone;
  length: AnswerLength;
  seed: number;
  avoid: Set<string>;
}

export interface ComposedAnswer {
  text: string;
  blockIds: string[];
  /** Slot role → rendered sentence, used to build the STAR breakdown. */
  bySlot: Map<BlockRole, string>;
  /** The visitor's sentences that made it into this draft. */
  usedFacts: string[];
}

function baseValues(context: AnswerContext): TemplateValues {
  const skills = context.skills.map((s) => s.label);
  return {
    role: context.role,
    company: context.company,
    industry:
      context.industry === "general" ? undefined : context.industryLabel.toLowerCase(),
    seniority: context.seniorityLabel.toLowerCase(),
    skill: skills[0],
    skills: joinNaturally(skills.slice(0, 3)),
    topic: context.topic,
    achievement: context.measurableSentences[0],
  };
}

export function joinNaturally(items: string[]): string | undefined {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return undefined;
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function pickPool(corpus: Corpus, role: BlockRole): ContentBlock[] {
  return corpus.blocksByRole[role] ?? [];
}

export function composeVariant(options: ComposeOptions): ComposedAnswer {
  const { corpus, context, category, framework, tone, length, seed, avoid } =
    options;

  const rng: Rng = createRng(seed);
  const slots = slotsFor(framework, length, category);
  const assignment = distributeSentences(context.userSentences, slots);

  const selection: SelectionContext = {
    category,
    framework,
    tone,
    length,
    industry: context.industry,
    seniority: context.seniority,
    values: baseValues(context),
    avoid,
    used: new Set<string>(),
    blocked: new Set<string>(),
    preferPrompt: false,
  };

  const parts: string[] = [];
  const blockIds: string[] = [];
  const bySlot = new Map<BlockRole, string>();
  const usedFacts: string[] = [];

  slots.forEach((role, index) => {
    const userText = assignment.get(index);
    const isFactual = FACTUAL_ROLES.has(role);

    // A factual slot with nothing from the visitor must ask for their detail.
    selection.preferPrompt = isFactual && !userText;
    selection.values = { ...selection.values, experience: userText };

    const chosen = selectBlock(pickPool(corpus, role), selection, rng);

    let sentence: string | undefined;

    if (userText) {
      usedFacts.push(userText);
      if (chosen && (chosen.block.requires ?? []).includes("experience")) {
        // The block was written to wrap the visitor's own words — use it.
        commitBlock(chosen.block, selection);
        blockIds.push(chosen.block.id);
        sentence = chosen.text;
      } else {
        // Otherwise the visitor's sentence stands on its own, sometimes after
        // a short connective, so consecutive facts do not read as a list.
        const wantsLeadIn = index > 0 && rng.next() < 0.45;
        const leadIn = wantsLeadIn
          ? selectBlock(pickPool(corpus, "transition"), selection, rng)
          : undefined;
        if (leadIn) {
          commitBlock(leadIn.block, selection);
          blockIds.push(leadIn.block.id);
          sentence = `${leadIn.text} ${userText}`;
        } else {
          sentence = userText;
        }
      }
    } else if (chosen) {
      commitBlock(chosen.block, selection);
      blockIds.push(chosen.block.id);
      sentence = chosen.text;
    }

    if (sentence && sentence.trim()) {
      const finished = sentence.trim();
      parts.push(finished);
      if (!bySlot.has(role)) bySlot.set(role, finished);
    }
  });

  return {
    text: joinParagraphs(parts, length),
    blockIds,
    bySlot,
    usedFacts,
  };
}

/**
 * Short and standard answers read best as one paragraph; detailed answers get
 * a break before the outcome so a recruiter can skim them.
 */
function joinParagraphs(parts: string[], length: AnswerLength): string {
  if (parts.length === 0) return "";
  if (length !== "detailed" || parts.length < 5) return parts.join(" ");
  const split = Math.ceil(parts.length / 2);
  return `${parts.slice(0, split).join(" ")}\n\n${parts.slice(split).join(" ")}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/* ------------------------------------------------------------------ */
/* STAR breakdown                                                      */
/* ------------------------------------------------------------------ */

const STAR_FALLBACKS: Record<keyof StarBreakdown, string> = {
  situation: "[Set the scene: where you were working, when, and what made this worth talking about.]",
  task: "[State what you personally were responsible for delivering, and to what standard or deadline.]",
  action: "[List the specific steps you took, in order, and why you chose them. Use 'I', not 'we'.]",
  result: "[Give the outcome, ideally with your own real figure — time saved, quality improved, money involved, customer impact.]",
  reflection: "[Say what you took from it and what you have done differently since.]",
};

export function buildStar(
  options: ComposeOptions,
): { star: StarBreakdown; blockIds: string[] } {
  const composed = composeVariant({
    ...options,
    framework: "star",
    length: "detailed",
  });

  const get = (role: BlockRole, key: keyof StarBreakdown): string =>
    composed.bySlot.get(role) ?? STAR_FALLBACKS[key];

  const reflection = composed.bySlot.get("reflection");

  return {
    star: {
      situation: get("situation", "situation"),
      task: get("task", "task"),
      action: get("action", "action"),
      result: get("result", "result"),
      reflection: reflection || undefined,
    },
    blockIds: composed.blockIds,
  };
}

/* ------------------------------------------------------------------ */
/* Variant plan                                                        */
/* ------------------------------------------------------------------ */

export interface VariantPlan {
  id: VariantId;
  label: string;
  summary: string;
  framework: Framework;
  length: AnswerLength;
  /** Mixed into the seed so each variant draws differently. */
  salt: number;
}

const SHORTER: Record<AnswerLength, AnswerLength> = {
  short: "short",
  standard: "short",
  detailed: "standard",
};

export function planVariants(
  framework: Framework,
  length: AnswerLength,
  allowedFrameworks: Framework[],
): VariantPlan[] {
  const alternativeFramework =
    allowedFrameworks.find((f) => f !== framework) ?? framework;

  const alternativeSummary =
    alternativeFramework === framework
      ? "Same structure, different emphasis and phrasing."
      : `Reframed using the ${FRAMEWORK_LABELS[alternativeFramework]} structure.`;

  return [
    {
      id: "primary",
      label: "Best answer",
      summary: `${FRAMEWORK_LABELS[framework]} structure at your chosen length.`,
      framework,
      length,
      salt: 0,
    },
    {
      id: "concise",
      label: "More concise",
      summary: "The same points, tightened for a short form box or a quick verbal answer.",
      framework,
      length: SHORTER[length],
      salt: 0x9e3779b9,
    },
    {
      id: "alternative",
      label: "Alternative angle",
      summary: alternativeSummary,
      framework: alternativeFramework,
      length,
      salt: 0x85ebca6b,
    },
  ];
}

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  star: "STAR (Situation, Task, Action, Result)",
  car: "CAR (Challenge, Action, Result)",
  direct: "Direct (claim, evidence, relevance)",
  motivation: "Motivation (company, role, fit)",
  technical: "Technical (context, approach, trade-offs, outcome)",
  reflective: "Reflective (issue, correction, evidence of change)",
};

export function variantToResult(
  plan: VariantPlan,
  composed: ComposedAnswer,
): AnswerVariant {
  return {
    id: plan.id,
    label: plan.label,
    summary: plan.summary,
    text: composed.text,
    wordCount: countWords(composed.text),
    framework: plan.framework,
    length: plan.length,
    blockIds: composed.blockIds,
  };
}

export function seedFor(parts: (string | number | undefined)[]): number {
  return hashString(parts.map((p) => String(p ?? "")).join("|"));
}

export { renderBlock };
