import { describe, expect, it } from "vitest";

import {
  buildDescriptionSkeleton,
  generateHooks,
  generateTitles,
  organiseKeywords,
  subjectHashtags,
} from "./creatorTools";

describe("generateTitles", () => {
  it("returns 8-12 variants and includes the subject in every one", () => {
    const titles = generateTitles({ subject: "sourdough baking", tone: "how-to" });
    expect(titles.length).toBeGreaterThanOrEqual(8);
    expect(titles.length).toBeLessThanOrEqual(12);
    for (const title of titles) {
      expect(title.toLowerCase()).toContain("sourdough baking");
    }
  });

  it("produces different patterns for different tones", () => {
    const howTo = generateTitles({ subject: "budgeting", tone: "how-to" });
    const listicle = generateTitles({ subject: "budgeting", tone: "listicle" });
    const story = generateTitles({ subject: "budgeting", tone: "story" });
    const bold = generateTitles({ subject: "budgeting", tone: "bold" });
    expect(howTo).not.toEqual(listicle);
    expect(story).not.toEqual(bold);
    expect(howTo[0]).toBe("How to budgeting (step by step)");
    expect(listicle[0]).toBe("7 things nobody tells you about budgeting");
    expect(story[0]).toBe("I tried budgeting for 30 days — here's what happened");
    expect(bold[0]).toBe("The truth about budgeting");
  });

  it("is deterministic — same inputs, same outputs", () => {
    const a = generateTitles({ subject: "running", tone: "story" });
    const b = generateTitles({ subject: "running", tone: "story" });
    expect(a).toEqual(b);
  });

  it("weaves an audience into the audience-aware patterns", () => {
    const withAudience = generateTitles({
      subject: "meal prep",
      tone: "how-to",
      audience: "students",
    });
    expect(withAudience[0]).toBe("How to meal prep (a guide for students)");
    expect(withAudience.some((t) => t.includes("students"))).toBe(true);

    const without = generateTitles({ subject: "meal prep", tone: "how-to" });
    expect(without.every((t) => !t.includes("students"))).toBe(true);
  });

  it("trims and collapses whitespace in the subject", () => {
    const titles = generateTitles({ subject: "  video   editing ", tone: "bold" });
    expect(titles[0]).toBe("The truth about video editing");
  });

  it("returns an empty array for a blank subject", () => {
    expect(generateTitles({ subject: "   ", tone: "listicle" })).toEqual([]);
    expect(generateTitles({ subject: "", tone: "bold" })).toEqual([]);
  });
});

describe("generateHooks", () => {
  it("fills every [subject] slot — no placeholder left behind", () => {
    for (const category of [
      "educational",
      "story",
      "contrarian",
      "question",
    ] as const) {
      const hooks = generateHooks("day trading", category);
      expect(hooks.length).toBeGreaterThanOrEqual(6);
      for (const hook of hooks) {
        expect(hook).not.toContain("[subject]");
        expect(hook.toLowerCase()).toContain("day trading");
      }
    }
  });

  it("returns different hooks per category", () => {
    const educational = generateHooks("chess", "educational");
    const contrarian = generateHooks("chess", "contrarian");
    expect(educational).not.toEqual(contrarian);
    expect(educational[0]).toBe(
      "Here's the one thing about chess that took me years to learn."
    );
  });

  it("replaces multiple slots in the same template", () => {
    const hooks = generateHooks("knitting", "contrarian");
    // "Hot take: you probably don't need [subject] at all — you need this instead."
    expect(hooks).toContain(
      "Hot take: you probably don't need knitting at all — you need this instead."
    );
  });

  it("returns an empty array for a blank subject", () => {
    expect(generateHooks("", "story")).toEqual([]);
    expect(generateHooks("   ", "question")).toEqual([]);
  });
});

describe("buildDescriptionSkeleton", () => {
  it("includes hook, learn bullets, chapters, links and hashtags by default", () => {
    const text = buildDescriptionSkeleton({ subject: "home coffee brewing" });
    expect(text).toContain("Home coffee brewing — in this video");
    expect(text).toContain("WHAT YOU'LL LEARN");
    expect(text).toContain("• [Key point 1 about home coffee brewing]");
    expect(text).toContain("CHAPTERS");
    expect(text).toContain("00:00 Intro");
    expect(text).toContain("LINKS & RESOURCES");
    expect(text).toContain("#HomeCoffeeBrewing");
  });

  it("omits the chapters section when chapters is false", () => {
    const text = buildDescriptionSkeleton({
      subject: "gardening",
      chapters: false,
    });
    expect(text).not.toContain("CHAPTERS");
    expect(text).toContain("LINKS & RESOURCES");
  });

  it("omits the links section when links is false", () => {
    const text = buildDescriptionSkeleton({ subject: "gardening", links: false });
    expect(text).toContain("CHAPTERS");
    expect(text).not.toContain("LINKS & RESOURCES");
  });

  it("omits both optional sections when both are false", () => {
    const text = buildDescriptionSkeleton({
      subject: "gardening",
      links: false,
      chapters: false,
    });
    expect(text).not.toContain("CHAPTERS");
    expect(text).not.toContain("LINKS & RESOURCES");
    expect(text).toContain("WHAT YOU'LL LEARN");
    expect(text).toContain("#Gardening");
  });

  it("returns an empty string for a blank subject", () => {
    expect(buildDescriptionSkeleton({ subject: "  " })).toBe("");
  });
});

describe("subjectHashtags", () => {
  it("builds a whole-phrase tag plus per-word tags of 3+ characters", () => {
    expect(subjectHashtags("learn to code")).toEqual([
      "#LearnToCode",
      "#Learn",
      "#Code",
    ]);
  });

  it("strips punctuation and dedupes case-insensitively", () => {
    expect(subjectHashtags("Coding, coding!")).toEqual([
      "#CodingCoding",
      "#Coding",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(subjectHashtags("")).toEqual([]);
  });
});

describe("organiseKeywords", () => {
  it("splits on commas and newlines, trims, and groups hashtags vs keywords", () => {
    const result = organiseKeywords(
      "baking, #Sourdough\n bread recipes ,#starter\nbaking tips"
    );
    expect(result.hashtags).toEqual(["#starter", "#Sourdough"]);
    expect(result.keywords).toEqual(["baking", "baking tips", "bread recipes"]);
    expect(result.hashtagCount).toBe(2);
    expect(result.keywordCount).toBe(3);
    expect(result.total).toBe(5);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("dedupes case-insensitively keeping the first occurrence's casing", () => {
    const result = organiseKeywords("Baking, baking, BAKING, #Yeast, #yeast");
    expect(result.keywords).toEqual(["Baking"]);
    expect(result.hashtags).toEqual(["#Yeast"]);
    expect(result.duplicatesRemoved).toBe(3);
    expect(result.total).toBe(2);
  });

  it("normalises hashtags: single # prefix and no internal spaces", () => {
    const result = organiseKeywords("## sour dough, #bread making");
    expect(result.hashtags).toEqual(["#sourdough", "#breadmaking"]);
    expect(result.keywords).toEqual([]);
  });

  it("sorts each group shortest-first with an alphabetical tie-break", () => {
    const result = organiseKeywords("zz, aa, longer phrase, #bb, #aa");
    expect(result.keywords).toEqual(["aa", "zz", "longer phrase"]);
    expect(result.hashtags).toEqual(["#aa", "#bb"]);
  });

  it("collapses internal whitespace inside keyword phrases", () => {
    const result = organiseKeywords("bread   making");
    expect(result.keywords).toEqual(["bread making"]);
  });

  it("handles empty and separator-only input", () => {
    const empty = organiseKeywords("");
    expect(empty.total).toBe(0);
    expect(empty.hashtags).toEqual([]);
    expect(empty.keywords).toEqual([]);
    expect(empty.duplicatesRemoved).toBe(0);

    const separators = organiseKeywords(" , ,\n\n, # ");
    expect(separators.total).toBe(0);
    expect(separators.duplicatesRemoved).toBe(0);
  });
});
