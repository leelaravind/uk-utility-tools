/**
 * Question classification.
 *
 * Given the employer's question in their own words, work out which of the
 * corpus question categories it belongs to, and therefore which answer
 * structure actually fits. Getting this right is what stops the builder
 * forcing STAR onto "Why do you want to work here?".
 */

import type { CategoryDefinition, QuestionCategory } from "@/data/jobAnswers/types";

import type { CategoryScore, Classification } from "./types";

/** A specific pattern match is worth far more than a loose keyword hit. */
const PATTERN_WEIGHT = 4;
const KEYWORD_WEIGHT = 1.5;

/**
 * Divisor turning a regex source length into a specificity multiplier. At 100,
 * a 50-character pattern scores 1.5x a bare-word pattern of near-zero length.
 */
const SPECIFICITY_SCALE = 100;

/**
 * `general` is the fallback. It gets a small constant score so it wins only
 * when nothing specific matched at all, and never outranks a real match.
 */
const FALLBACK_SCORE = 0.75;

/** Words that mark a question as competency/behavioural regardless of topic. */
const BEHAVIOURAL_MARKERS = [
  "tell me about a time",
  "give me an example",
  "give an example",
  "describe a situation",
  "describe a time",
  "can you tell us about",
  "walk me through a time",
  "share an example",
  "when have you",
];

function scoreCategory(
  definition: CategoryDefinition,
  question: string,
): number {
  let score = definition.id === "general" ? FALLBACK_SCORE : 0;

  for (const pattern of definition.patterns) {
    // Patterns are authored against lowercase text; reset lastIndex in case a
    // contributor adds a /g flag, which would otherwise make matching stateful.
    pattern.lastIndex = 0;
    if (!pattern.test(question)) continue;
    // A longer, more constrained pattern is a more specific claim on the
    // question, so it scores higher. Without this, "Describe a technical
    // challenge" ties between `technical-challenge` (which matched the phrase
    // "technical challenge") and `challenge` (which matched the bare word),
    // and the tie would be broken by declaration order rather than by meaning.
    score += PATTERN_WEIGHT * (1 + pattern.source.length / SPECIFICITY_SCALE);
  }

  for (const keyword of definition.keywords ?? []) {
    if (question.includes(keyword.toLowerCase())) score += KEYWORD_WEIGHT;
  }

  return score;
}

export function normaliseQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function isBehaviouralPhrasing(question: string): boolean {
  const q = normaliseQuestion(question);
  return BEHAVIOURAL_MARKERS.some((marker) => q.includes(marker));
}

export function classifyQuestion(
  question: string,
  categories: CategoryDefinition[],
): Classification {
  const normalised = normaliseQuestion(question);
  const fallback =
    categories.find((c) => c.id === "general") ?? categories[0];

  const scored: CategoryScore[] = categories
    .map((definition) => ({
      category: definition.id,
      label: definition.label,
      score: normalised.length === 0 ? 0 : scoreCategory(definition, normalised),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const chosen =
    normalised.length === 0 || !top || top.score <= 0
      ? fallback
      : (categories.find((c) => c.id === top.category) ?? fallback);

  const runnerUp = scored[1]?.score ?? 0;
  const topScore = top?.score ?? 0;
  // Confidence rises with the winning score and falls when a rival is close.
  const confidence =
    topScore <= 0
      ? 0
      : Math.min(1, topScore / (topScore + runnerUp + 2));

  const behavioural =
    chosen.supportsStar || isBehaviouralPhrasing(normalised);

  return {
    category: chosen.id,
    label: chosen.label,
    intent: chosen.intent,
    confidence: Math.round(confidence * 100) / 100,
    supportsStar: chosen.supportsStar,
    behavioural,
    suggestedFramework: chosen.defaultFramework,
    allowedFrameworks: chosen.allowedFrameworks,
    alternatives: scored
      .slice(1, 4)
      .filter((s) => s.score > 0 && s.category !== "general"),
    tips: chosen.tips,
  };
}

/** Convenience for tests and for the category picker in the UI. */
export function findCategory(
  id: QuestionCategory,
  categories: CategoryDefinition[],
): CategoryDefinition | undefined {
  return categories.find((c) => c.id === id);
}
