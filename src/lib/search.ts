/**
 * Pure instant-search scoring for the tool registry.
 *
 * Matching is case-insensitive substring matching across title, shortTitle,
 * keywords, description and category name. Multi-word queries match when
 * every word appears in at least one field. Ranking: title/shortTitle match
 * beats keyword match, which beats category/description matches; an exact
 * phrase hit adds a bonus so the most literal result comes first.
 */

import type { Tool } from "./registry";
import { CATEGORIES } from "./registry";

const WORD_WEIGHTS = {
  title: 100,
  shortTitle: 100,
  keyword: 40,
  category: 25,
  description: 20,
} as const;

const PHRASE_BONUS_TITLE = 80;
const PHRASE_BONUS_KEYWORD = 40;

const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.name.toLowerCase()]),
);

interface IndexedTool {
  tool: Tool;
  index: number;
  title: string;
  shortTitle: string;
  keywords: string[];
  description: string;
  categoryName: string;
}

function indexTool(tool: Tool, index: number): IndexedTool {
  return {
    tool,
    index,
    title: tool.title.toLowerCase(),
    shortTitle: tool.shortTitle.toLowerCase(),
    keywords: tool.keywords.map((k) => k.toLowerCase()),
    description: tool.description.toLowerCase(),
    categoryName: CATEGORY_NAMES[tool.category] ?? "",
  };
}

/** Score a single query word against one tool; 0 means "no match anywhere". */
function scoreWord(entry: IndexedTool, word: string): number {
  let score = 0;
  if (entry.title.includes(word)) score = Math.max(score, WORD_WEIGHTS.title);
  if (entry.shortTitle.includes(word)) {
    score = Math.max(score, WORD_WEIGHTS.shortTitle);
  }
  if (entry.keywords.some((k) => k.includes(word))) {
    score = Math.max(score, WORD_WEIGHTS.keyword);
  }
  if (entry.categoryName.includes(word)) {
    score = Math.max(score, WORD_WEIGHTS.category);
  }
  if (entry.description.includes(word)) {
    score = Math.max(score, WORD_WEIGHTS.description);
  }
  return score;
}

/**
 * Rank `tools` against `query`. Returns [] for an empty/whitespace query.
 * A tool is only included when every query word matches at least one field.
 */
export function searchTools(query: string, tools: Tool[]): Tool[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const phrase = words.join(" ");

  const ranked: { entry: IndexedTool; score: number }[] = [];

  tools.forEach((tool, index) => {
    const entry = indexTool(tool, index);
    let total = 0;

    for (const word of words) {
      const wordScore = scoreWord(entry, word);
      if (wordScore === 0) return; // every word must match somewhere
      total += wordScore;
    }

    if (entry.title.includes(phrase) || entry.shortTitle.includes(phrase)) {
      total += PHRASE_BONUS_TITLE;
    } else if (entry.keywords.some((k) => k.includes(phrase))) {
      total += PHRASE_BONUS_KEYWORD;
    }

    ranked.push({ entry, score: total });
  });

  ranked.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.entry.index - b.entry.index,
  );

  return ranked.map((r) => r.entry.tool);
}
