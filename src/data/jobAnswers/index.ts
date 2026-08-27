/**
 * Job Answer corpus — aggregator.
 *
 * This is the ONLY file that knows which themed content files exist. Adding
 * content means creating or extending a themed file and adding one line here;
 * nobody ever edits a single giant answer file, and no file here contains a
 * finished answer — only tagged, reusable sentences.
 *
 * ## Adding content
 * - A new **question type**: add its id to `QUESTION_CATEGORIES` in `types.ts`,
 *   then add a `CategoryDefinition` in `categories.ts`.
 * - A new **sentence**: append a `ContentBlock` to the themed file matching its
 *   `role` (e.g. an Action sentence goes in `actions.ts`), with a unique id.
 * - A new **industry / role / skill**: append to `industries.ts`, `roles.ts` or
 *   `skills.ts`. Tag blocks with the new industry to specialise their wording.
 * - A new **tone or length**: extend `TONES` / `ANSWER_LENGTHS` in `types.ts`,
 *   then make sure every block role has at least one block tagged for it —
 *   `corpusCoverageReport()` below flags any gap.
 *
 * This module is imported only by the `/job-answer` route, and the tool
 * dynamic-imports it on first use, so it never reaches any other page's
 * JavaScript bundle.
 */

import { CATEGORY_DEFINITIONS } from "./categories";
import { INDUSTRY_DEFINITIONS } from "./industries";
import { ROLE_DEFINITIONS } from "./roles";
import { SKILL_DEFINITIONS } from "./skills";

import { OPENINGS } from "./openings";
import { SITUATIONS } from "./situations";
import { TASKS } from "./tasks";
import { ACTIONS } from "./actions";
import { RESULTS } from "./results";
import { REFLECTIONS } from "./reflections";
import { TRANSITIONS } from "./transitions";
import { CLOSINGS } from "./closings";

import {
  MOTIVATION_COMPANY,
  MOTIVATION_ROLE,
  MOTIVATION_FIT,
} from "./motivation";
import { CLAIMS, EVIDENCE, RELEVANCE } from "./strengths";
import { WEAKNESS_FRAMES, WEAKNESS_CORRECTIONS } from "./weaknesses";
import { GOAL_FRAMES } from "./goals";
import {
  TECHNICAL_CONTEXTS,
  TECHNICAL_APPROACHES,
  TECHNICAL_TRADEOFFS,
  TECHNICAL_OUTCOMES,
} from "./technical";

import {
  BLOCK_ROLES,
  type BlockRole,
  type CategoryDefinition,
  type ContentBlock,
  type IndustryDefinition,
  type RoleDefinition,
  type SkillDefinition,
} from "./types";

const ALL_BLOCK_SOURCES: ContentBlock[][] = [
  OPENINGS,
  SITUATIONS,
  TASKS,
  ACTIONS,
  RESULTS,
  REFLECTIONS,
  TRANSITIONS,
  CLOSINGS,
  MOTIVATION_COMPANY,
  MOTIVATION_ROLE,
  MOTIVATION_FIT,
  CLAIMS,
  EVIDENCE,
  RELEVANCE,
  WEAKNESS_FRAMES,
  WEAKNESS_CORRECTIONS,
  GOAL_FRAMES,
  TECHNICAL_CONTEXTS,
  TECHNICAL_APPROACHES,
  TECHNICAL_TRADEOFFS,
  TECHNICAL_OUTCOMES,
];

export const ALL_BLOCKS: ContentBlock[] = ALL_BLOCK_SOURCES.flat();

function groupByRole(list: ContentBlock[]): Record<BlockRole, ContentBlock[]> {
  const grouped = Object.fromEntries(
    BLOCK_ROLES.map((role) => [role, [] as ContentBlock[]]),
  ) as Record<BlockRole, ContentBlock[]>;
  for (const block of list) {
    const bucket = grouped[block.role];
    if (bucket) bucket.push(block);
  }
  return grouped;
}

export interface Corpus {
  categories: CategoryDefinition[];
  industries: IndustryDefinition[];
  roles: RoleDefinition[];
  skills: SkillDefinition[];
  blocksByRole: Record<BlockRole, ContentBlock[]>;
  allBlocks: ContentBlock[];
  /** Total number of source sentences available to the composer. */
  blockCount: number;
}

export const CORPUS: Corpus = {
  categories: CATEGORY_DEFINITIONS,
  industries: INDUSTRY_DEFINITIONS,
  roles: ROLE_DEFINITIONS,
  skills: SKILL_DEFINITIONS,
  blocksByRole: groupByRole(ALL_BLOCKS),
  allBlocks: ALL_BLOCKS,
  blockCount: ALL_BLOCKS.length,
};

/**
 * Maintenance helper used by the corpus unit tests: reports duplicate ids,
 * blocks whose `{vars}` are not declared in `requires`, and block roles with
 * no content. Kept beside the data so a contributor adding a file finds it.
 */
export function corpusCoverageReport(): {
  duplicateIds: string[];
  emptyRoles: BlockRole[];
  undeclaredVars: { id: string; vars: string[] }[];
  danglingConflicts: { id: string; missing: string[] }[];
} {
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const undeclaredVars: { id: string; vars: string[] }[] = [];
  const danglingConflicts: { id: string; missing: string[] }[] = [];
  const ids = new Set(ALL_BLOCKS.map((b) => b.id));

  for (const block of ALL_BLOCKS) {
    if (seen.has(block.id)) duplicateIds.push(block.id);
    seen.add(block.id);

    const used = [...block.text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const declared = new Set<string>(block.requires ?? []);
    const missing = [...new Set(used)].filter((v) => !declared.has(v));
    if (missing.length > 0) undeclaredVars.push({ id: block.id, vars: missing });

    const badConflicts = (block.conflictsWith ?? []).filter((c) => !ids.has(c));
    if (badConflicts.length > 0) {
      danglingConflicts.push({ id: block.id, missing: badConflicts });
    }
  }

  const emptyRoles = BLOCK_ROLES.filter(
    (role) => CORPUS.blocksByRole[role].length === 0,
  );

  return { duplicateIds, emptyRoles, undeclaredVars, danglingConflicts };
}

export type {
  BlockRole,
  CategoryDefinition,
  ContentBlock,
  IndustryDefinition,
  RoleDefinition,
  SkillDefinition,
};
