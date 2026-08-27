import { describe, expect, it } from "vitest";

import { ALL_BLOCKS, CORPUS, corpusCoverageReport } from "./index";
import {
  ANSWER_LENGTHS,
  BLOCK_ROLES,
  QUESTION_CATEGORIES,
  TEMPLATE_VARS,
  TONES,
} from "./types";

/**
 * These tests guard the corpus itself rather than the composer. They are the
 * safety net a contributor adding new content will hit first, so each failure
 * message needs to say plainly what is wrong.
 */

describe("corpus integrity", () => {
  const report = corpusCoverageReport();

  it("has no duplicate block ids", () => {
    expect(report.duplicateIds).toEqual([]);
  });

  it("has content for every block role", () => {
    expect(report.emptyRoles).toEqual([]);
  });

  it("declares every template variable it interpolates", () => {
    expect(report.undeclaredVars).toEqual([]);
  });

  it("has no conflictsWith pointing at a block that does not exist", () => {
    expect(report.danglingConflicts).toEqual([]);
  });

  it("only uses template variables the engine knows how to fill", () => {
    const known = new Set<string>(TEMPLATE_VARS);
    const unknown: string[] = [];
    for (const block of ALL_BLOCKS) {
      for (const variable of block.requires ?? []) {
        if (!known.has(variable)) unknown.push(`${block.id}: ${variable}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("gives every block a role matching one the engine recognises", () => {
    const known = new Set<string>(BLOCK_ROLES);
    const bad = ALL_BLOCKS.filter((b) => !known.has(b.role)).map((b) => b.id);
    expect(bad).toEqual([]);
  });

  it("closes every block with sentence punctuation", () => {
    const bad = ALL_BLOCKS.filter(
      (b) => !/[.!?]$/.test(b.text.trim()),
    ).map((b) => `${b.id}: ${b.text.slice(-40)}`);
    expect(bad).toEqual([]);
  });

  it("balances every bracketed prompt", () => {
    const bad = ALL_BLOCKS.filter((b) => {
      const opens = (b.text.match(/\[\[/g) ?? []).length;
      const closes = (b.text.match(/\]\]/g) ?? []).length;
      return opens !== closes;
    }).map((b) => b.id);
    expect(bad).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* The no-fabrication rule, enforced at the data level                 */
/* ------------------------------------------------------------------ */

describe("no fabricated facts in the corpus", () => {
  it("contains no digits anywhere — no metrics, no team sizes, no timeframes", () => {
    const offenders = ALL_BLOCKS.filter((b) => /\d/.test(b.text)).map(
      (b) => `${b.id}: ${b.text}`,
    );
    expect(offenders).toEqual([]);
  });

  it("contains no percentage or currency claims", () => {
    const offenders = ALL_BLOCKS.filter((b) =>
      /%|£|\$|€/.test(b.text),
    ).map((b) => `${b.id}: ${b.text}`);
    expect(offenders).toEqual([]);
  });

  it("never asserts an award, promotion or qualification on the candidate's behalf", () => {
    const banned =
      /\b(i (?:won|was awarded|was promoted)\b|i (?:received|earned) (?:an? )?(?:award|promotion|bonus|commendation|distinction)|award-winning|top performer)/i;
    const offenders = ALL_BLOCKS.filter((b) => banned.test(b.text)).map(
      (b) => `${b.id}: ${b.text}`,
    );
    expect(offenders).toEqual([]);
  });

  it("avoids the worst interview clichés", () => {
    const banned = [
      "think outside the box",
      "go the extra mile",
      "hit the ground running",
      "wear many hats",
      "synergy",
      "rockstar",
      "ninja",
      "passionate about",
      "110%",
      "perfectionist",
    ];
    const offenders: string[] = [];
    for (const block of ALL_BLOCKS) {
      const lower = block.text.toLowerCase();
      for (const phrase of banned) {
        if (lower.includes(phrase)) offenders.push(`${block.id}: ${phrase}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps at most one bracketed prompt per block", () => {
    const offenders = ALL_BLOCKS.filter(
      (b) => (b.text.match(/\[\[/g) ?? []).length > 1,
    ).map((b) => b.id);
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Taxonomy coverage                                                   */
/* ------------------------------------------------------------------ */

describe("taxonomy", () => {
  it("defines every declared question category exactly once", () => {
    const defined = CORPUS.categories.map((c) => c.id);
    expect(new Set(defined).size).toBe(defined.length);
    for (const category of QUESTION_CATEGORIES) {
      expect(defined, `missing category: ${category}`).toContain(category);
    }
  });

  it("gives every category usable coaching and examples", () => {
    for (const category of CORPUS.categories) {
      expect(category.tips.length, category.id).toBeGreaterThanOrEqual(3);
      expect(category.examples.length, category.id).toBeGreaterThanOrEqual(3);
      expect(category.allowedFrameworks.length, category.id).toBeGreaterThan(0);
      expect(
        category.allowedFrameworks,
        `${category.id} default framework must be allowed`,
      ).toContain(category.defaultFramework);
    }
  });

  it("never offers STAR to a category that does not support it", () => {
    for (const category of CORPUS.categories) {
      if (!category.supportsStar) {
        expect(category.allowedFrameworks, category.id).not.toContain("star");
        expect(category.defaultFramework, category.id).not.toBe("star");
      }
    }
  });

  it("keeps the general fallback last-resort by design", () => {
    const general = CORPUS.categories.find((c) => c.id === "general");
    expect(general).toBeDefined();
  });

  it("has discriminating signals for industries, roles and skills", () => {
    for (const industry of CORPUS.industries) {
      expect(industry.label.length, industry.id).toBeGreaterThan(0);
      if (industry.id !== "general") {
        expect(industry.signals.length, industry.id).toBeGreaterThanOrEqual(4);
        expect(industry.outcomeWords.length, industry.id).toBeGreaterThanOrEqual(4);
      }
    }
    for (const role of CORPUS.roles) {
      expect(role.signals.length, role.id).toBeGreaterThan(0);
      expect(role.industries.length, role.id).toBeGreaterThan(0);
    }
    for (const skill of CORPUS.skills) {
      expect(skill.signals.length, skill.id).toBeGreaterThan(0);
      // Short signals match inside unrelated words unless they carry
      // punctuation that cannot appear mid-word, e.g. "c#" or ".net".
      for (const signal of skill.signals) {
        const safe = signal.length >= 3 || /[^a-z0-9]/i.test(signal);
        expect(safe, `${skill.id}: "${signal}" is too short`).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Tag coverage — a gap here would break the builder for some visitors */
/* ------------------------------------------------------------------ */

describe("tag coverage", () => {
  /** Roles the composer needs for its most common recipes. */
  const CORE_ROLES = [
    "opening",
    "situation",
    "task",
    "action",
    "result",
    "reflection",
    "transition",
    "closing",
    "claim",
    "evidence",
    "relevance",
    "motivation-company",
    "motivation-role",
    "motivation-fit",
  ] as const;

  it("has blocks usable without any of the visitor's own details", () => {
    // A block whose `requires` cannot be satisfied is unusable for a visitor
    // who filled in nothing but the question, so every core role needs a
    // healthy pool that stands on its own. (Category and industry tags are
    // relaxed by the selector when they would otherwise starve a slot; a
    // missing template value cannot be relaxed, so it is checked here.)
    for (const role of CORE_ROLES) {
      const standalone = CORPUS.blocksByRole[role].filter(
        (b) => !b.requires?.length,
      );
      expect(
        standalone.length,
        `role "${role}" needs blocks that render with no visitor data`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("serves every tone in every core role", () => {
    for (const role of CORE_ROLES) {
      const pool = CORPUS.blocksByRole[role];
      for (const tone of TONES) {
        const usable = pool.filter(
          (b) => !b.tones?.length || b.tones.includes(tone),
        );
        expect(usable.length, `${role} / ${tone}`).toBeGreaterThan(0);
      }
    }
  });

  it("serves every length in every core role", () => {
    for (const role of CORE_ROLES) {
      const pool = CORPUS.blocksByRole[role];
      for (const length of ANSWER_LENGTHS) {
        const usable = pool.filter(
          (b) => !b.lengths?.length || b.lengths.includes(length),
        );
        expect(usable.length, `${role} / ${length}`).toBeGreaterThan(0);
      }
    }
  });

  it("is large enough to feel varied rather than templated", () => {
    expect(CORPUS.blockCount).toBeGreaterThan(500);
    for (const role of CORE_ROLES) {
      expect(
        CORPUS.blocksByRole[role].length,
        `role "${role}" is thin`,
      ).toBeGreaterThanOrEqual(20);
    }
  });
});
