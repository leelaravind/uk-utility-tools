/**
 * Block selection — the part that makes two runs of the same question feel
 * different without ever becoming random noise.
 *
 * Selection is a filter (which blocks are *valid* here) followed by a score
 * (which valid block is *most specific* here) followed by a seeded weighted
 * draw among the best-scoring candidates. Specificity first means a healthcare
 * block wins for a healthcare role; the seeded draw means the fifth draft does
 * not read like the first.
 */

import type { BlockRole, ContentBlock } from "@/data/jobAnswers/types";

import { pickWeighted, type Rng } from "./random";
import type {
  AnswerLength,
  Framework,
  Industry,
  QuestionCategory,
  Seniority,
  Tone,
} from "./types";

export type TemplateValues = Partial<Record<string, string>>;

export interface SelectionContext {
  category: QuestionCategory;
  framework: Framework;
  tone: Tone;
  length: AnswerLength;
  industry: Industry;
  seniority: Seniority;
  /** Values available for `{var}` interpolation. Empty means unavailable. */
  values: TemplateValues;
  /** Block ids used in recent drafts — avoided when an alternative exists. */
  avoid: Set<string>;
  /** Block ids already used in THIS answer. */
  used: Set<string>;
  /** Ids ruled out by a `conflictsWith` on an already-used block. */
  blocked: Set<string>;
  /**
   * When true, prefer blocks that carry a `[[…]]` prompt. Set for factual
   * slots the visitor has given us nothing for, so the draft asks for their
   * real detail instead of quietly asserting something.
   */
  preferPrompt: boolean;
}

/**
 * How far below the best score a block may sit and still be drawn. Wide
 * enough that a regenerate reaches genuinely different sentences; narrow
 * enough that an off-topic block never surfaces.
 */
const BAND_WIDTH = 4.5;

const PROMPT_PATTERN = /\[\[([^\]]+)\]\]/g;
const VAR_PATTERN = /\{(\w+)\}/g;

export function hasPrompt(block: ContentBlock): boolean {
  return block.text.includes("[[");
}

function tagAllows<T>(tags: T[] | undefined, value: T): boolean {
  if (!tags || tags.length === 0) return true;
  return tags.includes(value);
}

/**
 * How much of the tag filter to enforce.
 *
 * Tags express *affinity*, not exclusivity: a Situation sentence tagged for
 * "problem-solving" is still perfectly grammatical for a "challenge" question,
 * it is simply less on the nose. So selection relaxes in tiers rather than
 * leaving a slot empty — the block role already prevents genuinely wrong
 * content appearing (a weakness frame only ever sits in a reflective recipe).
 *
 * `requires` is never relaxed: a block whose variables have no value would
 * render literal braces.
 */
export interface EligibilityTier {
  ignoreCategories?: boolean;
  ignoreContext?: boolean;
  ignoreStyle?: boolean;
}

/** Tried in order; the first tier with candidates wins. */
export const ELIGIBILITY_TIERS: EligibilityTier[] = [
  {},
  { ignoreCategories: true },
  { ignoreCategories: true, ignoreContext: true },
  { ignoreCategories: true, ignoreContext: true, ignoreStyle: true },
];

export function isEligible(
  block: ContentBlock,
  ctx: SelectionContext,
  tier: EligibilityTier = {},
): boolean {
  if (ctx.used.has(block.id)) return false;
  if (ctx.blocked.has(block.id)) return false;

  if (!tier.ignoreCategories && !tagAllows(block.categories, ctx.category)) {
    return false;
  }
  if (!tagAllows(block.frameworks, ctx.framework)) return false;
  if (!tier.ignoreContext) {
    if (!tagAllows(block.industries, ctx.industry)) return false;
    if (!tagAllows(block.seniority, ctx.seniority)) return false;
  }
  if (!tier.ignoreStyle) {
    if (!tagAllows(block.tones, ctx.tone)) return false;
    if (!tagAllows(block.lengths, ctx.length)) return false;
  }

  // A block may only be used when every variable it needs has a real value.
  for (const variable of block.requires ?? []) {
    const value = ctx.values[variable];
    if (!value || !value.trim()) return false;
  }

  // Any `{var}` in the text that was not declared would render as literal
  // braces, so treat that as ineligible rather than shipping broken prose.
  VAR_PATTERN.lastIndex = 0;
  for (const match of block.text.matchAll(VAR_PATTERN)) {
    const value = ctx.values[match[1]];
    if (!value || !value.trim()) return false;
  }

  return true;
}

/**
 * Higher is better. Specificity beats generality, so a block tagged for the
 * exact industry and seniority outranks an untagged catch-all.
 */
export function scoreBlock(block: ContentBlock, ctx: SelectionContext): number {
  let score = block.weight ?? 1;

  if (block.categories?.includes(ctx.category)) score += 4;
  if (block.industries?.includes(ctx.industry)) score += 3;
  if (block.seniority?.includes(ctx.seniority)) score += 2;
  if (block.tones?.includes(ctx.tone)) score += 2;
  if (block.lengths?.includes(ctx.length)) score += 1;
  if (block.frameworks?.includes(ctx.framework)) score += 1;

  // Blocks that weave in the visitor's own words are worth favouring.
  score += (block.requires?.length ?? 0) * 0.75;

  if (ctx.preferPrompt && hasPrompt(block)) score += 2;
  if (!ctx.preferPrompt && hasPrompt(block)) score -= 1;

  return score;
}

export interface SelectionResult {
  block: ContentBlock;
  text: string;
}

/**
 * Fill `{vars}` and turn `[[ask for detail]]` into a visible `[ask for
 * detail]` prompt. Prompts are deliberately left in the copied text — an
 * unfinished draft should never be able to masquerade as a finished answer.
 */
export function renderBlock(
  block: ContentBlock,
  values: TemplateValues,
): string {
  const withVars = block.text.replace(VAR_PATTERN, (whole, name: string) => {
    const value = values[name];
    return value && value.trim() ? value.trim() : whole;
  });
  return withVars.replace(PROMPT_PATTERN, (_whole, inner: string) => `[${inner.trim()}]`);
}

/**
 * Choose one block for a slot. Returns undefined when the corpus has nothing
 * valid for this combination — callers must cope, never crash.
 */
export function selectBlock(
  pool: ContentBlock[],
  ctx: SelectionContext,
  rng: Rng,
): SelectionResult | undefined {
  // Widen the filter one tier at a time rather than drop the slot entirely.
  // A tier is good enough once it offers a block the visitor has not just
  // seen; if the strictest tier only offers repeats, widening is exactly what
  // makes "Another version" produce another version rather than the same one.
  let eligible: ContentBlock[] = [];
  let candidates: ContentBlock[] = [];
  for (const tier of ELIGIBILITY_TIERS) {
    const tierEligible = pool.filter((block) => isEligible(block, ctx, tier));
    if (tierEligible.length === 0) continue;
    if (eligible.length === 0) eligible = tierEligible;
    const fresh = tierEligible.filter((block) => !ctx.avoid.has(block.id));
    if (fresh.length > 0) {
      candidates = fresh;
      break;
    }
  }
  if (eligible.length === 0) return undefined;
  // Everything valid was used recently — repeating beats returning nothing.
  if (candidates.length === 0) candidates = eligible;

  // When a factual slot has no user material, insist on a block that asks for
  // it — if any such block exists.
  const prompting = ctx.preferPrompt
    ? candidates.filter((block) => hasPrompt(block))
    : [];
  const shortlist = prompting.length > 0 ? prompting : candidates;

  const scored = shortlist.map((block) => ({
    block,
    score: scoreBlock(block, ctx),
  }));
  const best = Math.max(...scored.map((s) => s.score));
  // Draw from the top band rather than always taking the single best, so the
  // most specific block does not become the only block anyone ever sees.
  const band = scored.filter((s) => s.score >= best - BAND_WIDTH);

  // Weight relative to the bottom of the band, not absolutely: raw scores sit
  // in a narrow high range, so weighting by them directly would make the top
  // block win almost every draw and every regenerate would look the same.
  const floor = Math.min(...band.map((s) => s.score));
  const chosen = pickWeighted(band, (s) => 1 + (s.score - floor), rng);
  if (!chosen) return undefined;

  return {
    block: chosen.block,
    text: renderBlock(chosen.block, ctx.values),
  };
}

/** Record a chosen block so later slots respect `used` and `conflictsWith`. */
export function commitBlock(block: ContentBlock, ctx: SelectionContext): void {
  ctx.used.add(block.id);
  for (const conflict of block.conflictsWith ?? []) ctx.blocked.add(conflict);
}

export type { BlockRole };
