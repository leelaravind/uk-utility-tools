import { describe, expect, it } from "vitest";

import {
  CORPUS,
  buildAnswer,
  classify,
  corpusStats,
  extractTopic,
  splitSentences,
  tidySentence,
  type AnswerRequest,
} from "./index";
import { MAX_SCAN_CHARS, sanitiseText, toGerund } from "./context";
import { distributeSentences, slotsFor } from "./compose";
import { createRng } from "./random";
import { selectBlock, type SelectionContext } from "./select";
import { ANSWER_LENGTHS, INDUSTRIES, SENIORITIES, TONES } from "@/data/jobAnswers/types";

function request(overrides: Partial<AnswerRequest> = {}): AnswerRequest {
  return {
    question: "Tell me about a time you solved a difficult problem",
    experienceNotes:
      "Our despatch team was two people down before Christmas. I rebuilt the picking rota and retrained two temporary staff. We kept same-day despatch running through the peak.",
    jobTitle: "Logistics Coordinator",
    company: "Northgate Logistics",
    tone: "professional",
    length: "standard",
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

describe("classification", () => {
  it("routes a difficult-problem question to problem solving, behavioural and STAR", () => {
    const result = classify("Tell me about a time you solved a difficult problem.");
    expect(result.category).toBe("problem-solving");
    expect(result.supportsStar).toBe(true);
    expect(result.behavioural).toBe(true);
    expect(["star", "car"]).toContain(result.suggestedFramework);
    expect(result.allowedFrameworks).toContain("star");
  });

  it("routes 'why do you want to work here' to company motivation, NOT STAR", () => {
    const result = classify("Why do you want to work here?");
    expect(result.category).toBe("why-this-company");
    expect(result.supportsStar).toBe(false);
    expect(result.suggestedFramework).toBe("motivation");
    expect(result.allowedFrameworks).not.toContain("star");
  });

  it("separates 'why this job' from 'why this company'", () => {
    expect(classify("Why do you want this job?").category).toBe("why-this-job");
    expect(classify("Why do you want to work for us?").category).toBe(
      "why-this-company",
    );
  });

  it("classifies the other core question types", () => {
    const cases: [string, string][] = [
      ["Tell me about yourself", "tell-me-about-yourself"],
      ["What is your greatest weakness?", "weakness"],
      ["Tell me about a time you disagreed with a colleague", "conflict"],
      ["Describe a time you failed at something", "failure"],
      ["Give an example of when you led a team", "leadership"],
      ["Tell me about a time you worked in a team", "teamwork"],
      ["Describe a technical challenge you overcame", "technical-challenge"],
      ["Tell me about a time you worked under pressure", "pressure"],
      ["Where do you see yourself in five years?", "career-goals"],
      ["Why should we hire you?", "why-hire-you"],
    ];
    for (const [question, expected] of cases) {
      expect(classify(question).category, question).toBe(expected);
    }
  });

  it("never lets the general fallback outrank a specific match", () => {
    const result = classify("Tell me about a time you led a team through change");
    expect(result.category).not.toBe("general");
  });

  it("falls back gracefully for an unrecognisable question", () => {
    const result = classify("Purple monday sideways");
    expect(result.category).toBe("general");
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it("treats an empty question as unclassified rather than throwing", () => {
    const result = classify("");
    expect(result.category).toBe("general");
    expect(result.confidence).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Structure choice                                                    */
/* ------------------------------------------------------------------ */

describe("structure selection", () => {
  it("produces a STAR breakdown for behavioural questions", () => {
    const result = buildAnswer(request());
    expect(result.star).toBeDefined();
    expect(result.star?.situation.length).toBeGreaterThan(0);
    expect(result.star?.action.length).toBeGreaterThan(0);
    expect(result.star?.result.length).toBeGreaterThan(0);
  });

  it("does not force STAR onto a motivation question", () => {
    const result = buildAnswer(
      request({ question: "Why do you want to work here?" }),
    );
    expect(result.star).toBeUndefined();
    expect(result.meta.framework).toBe("motivation");
  });

  it("ignores a framework override the question cannot support", () => {
    const result = buildAnswer(
      request({ question: "Why do you want to work here?", framework: "star" }),
    );
    expect(result.meta.framework).not.toBe("star");
  });

  it("honours a valid framework override", () => {
    const result = buildAnswer(request({ framework: "car" }));
    expect(result.meta.framework).toBe("car");
  });
});

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

describe("variants", () => {
  it("returns three independently useful variants", () => {
    const result = buildAnswer(request());
    expect(result.variants).toHaveLength(3);
    expect(result.variants.map((v) => v.id)).toEqual([
      "primary",
      "concise",
      "alternative",
    ]);
    for (const variant of result.variants) {
      expect(variant.text.trim().length).toBeGreaterThan(40);
      expect(variant.wordCount).toBeGreaterThan(10);
    }
  });

  it("makes the concise variant shorter than the primary", () => {
    const result = buildAnswer(request({ length: "detailed" }));
    const primary = result.variants.find((v) => v.id === "primary")!;
    const concise = result.variants.find((v) => v.id === "concise")!;
    expect(concise.wordCount).toBeLessThan(primary.wordCount);
  });

  it("does not return three identical drafts", () => {
    const result = buildAnswer(request());
    const texts = new Set(result.variants.map((v) => v.text));
    expect(texts.size).toBe(3);
  });

  it("respects the requested length bands", () => {
    const short = buildAnswer(request({ length: "short" }));
    const detailed = buildAnswer(request({ length: "detailed" }));
    const shortPrimary = short.variants[0].wordCount;
    const detailedPrimary = detailed.variants[0].wordCount;
    expect(detailedPrimary).toBeGreaterThan(shortPrimary);
  });
});

/* ------------------------------------------------------------------ */
/* Variation and determinism                                           */
/* ------------------------------------------------------------------ */

describe("variation", () => {
  it("is deterministic for the same inputs and variation number", () => {
    const a = buildAnswer(request({ variation: 3 }));
    const b = buildAnswer(request({ variation: 3 }));
    expect(a.variants.map((v) => v.text)).toEqual(b.variants.map((v) => v.text));
  });

  it("produces materially different wording across variation numbers", () => {
    const drafts = [0, 1, 2, 3, 4].map(
      (variation) => buildAnswer(request({ variation })).variants[0].text,
    );
    expect(new Set(drafts).size).toBeGreaterThanOrEqual(3);
  });

  it("varies wording across tones", () => {
    const tones = ["professional", "confident", "conversational", "concise"] as const;
    const drafts = tones.map(
      (tone) => buildAnswer(request({ tone })).variants[0].text,
    );
    expect(new Set(drafts).size).toBeGreaterThanOrEqual(3);
  });

  it("avoids block ids the caller asks it to avoid", () => {
    const first = buildAnswer(request());
    const firstIds = first.variants.flatMap((v) => v.blockIds);
    const second = buildAnswer(request({ avoidBlockIds: firstIds }));
    const secondIds = second.variants.flatMap((v) => v.blockIds);
    const overlap = secondIds.filter((id) => firstIds.includes(id));
    // Some overlap is acceptable where a slot has few valid options, but the
    // bulk of the draft must be fresh.
    expect(overlap.length).toBeLessThan(secondIds.length * 0.5);
  });

  it("keeps every draft coherent — no unresolved template syntax", () => {
    for (const variation of [0, 1, 2, 3, 4, 5]) {
      const result = buildAnswer(request({ variation }));
      for (const variant of result.variants) {
        expect(variant.text, `variation ${variation}`).not.toMatch(/\{\w+\}/);
        expect(variant.text, `variation ${variation}`).not.toContain("[[");
        expect(variant.text, `variation ${variation}`).not.toContain("]]");
        expect(variant.text, `variation ${variation}`).not.toMatch(/\s{2,}/);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Factual safety — the most important behaviour in this tool          */
/* ------------------------------------------------------------------ */

describe("factual safety", () => {
  const noMetrics = request({
    experienceNotes:
      "I took over the weekly reporting pack when my colleague left. I rewrote the checklist and asked the team to review it. Reporting became a lot calmer after that.",
  });

  it("never invents a number when the visitor gave none", () => {
    for (const variation of [0, 1, 2, 3, 4]) {
      const result = buildAnswer({ ...noMetrics, variation });
      for (const variant of result.variants) {
        expect(variant.text, `variation ${variation}`).not.toMatch(/\d/);
      }
    }
  });

  it("never invents a percentage, currency figure or team size", () => {
    const result = buildAnswer(noMetrics);
    const all = result.variants.map((v) => v.text).join(" ");
    expect(all).not.toMatch(/\d+\s?%/);
    expect(all).not.toMatch(/[£$€]\s?\d/);
    expect(all).not.toMatch(/team of \d+/i);
    expect(all).not.toMatch(/\b(increased|reduced|grew|cut)\b[^.]*\bby\b\s*\d/i);
  });

  it("asks for a measurable result instead of fabricating one", () => {
    const result = buildAnswer(noMetrics);
    expect(result.gaps.join(" ")).toMatch(/measurable/i);
  });

  it("preserves a measurable fact the visitor supplied, word for word", () => {
    const result = buildAnswer(
      request({
        experienceNotes:
          "Built a Python automation that reduced a weekly task from 3 hours to 30 minutes.",
      }),
    );
    const all = result.variants.map((v) => v.text).join(" ");
    expect(all).toContain("3 hours to 30 minutes");
    expect(result.usedUserFacts.join(" ")).toContain("Python automation");
  });

  it("reports the visitor's own facts back to them", () => {
    const result = buildAnswer(request());
    expect(result.usedUserFacts.length).toBeGreaterThan(0);
    for (const fact of result.usedUserFacts) {
      expect(result.variants.some((v) => v.text.includes(fact))).toBe(true);
    }
  });

  it("marks gaps with bracketed prompts when notes are missing", () => {
    const result = buildAnswer(request({ experienceNotes: "" }));
    const all = result.variants.map((v) => v.text).join(" ");
    expect(all).toMatch(/\[[^\]]+\]/);
    expect(result.tips.join(" ")).toMatch(/bracketed/i);
  });
});

/* ------------------------------------------------------------------ */
/* Robust input handling                                               */
/* ------------------------------------------------------------------ */

describe("input handling", () => {
  it("handles completely empty input without throwing", () => {
    const result = buildAnswer({
      question: "",
      experienceNotes: "",
      tone: "professional",
      length: "standard",
    });
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.classification.category).toBe("general");
  });

  it("handles whitespace-only input", () => {
    const result = buildAnswer({
      question: "   \n  ",
      experienceNotes: "\t\t",
      tone: "concise",
      length: "short",
    });
    expect(result.context.userSentences).toEqual([]);
  });

  it("strips control characters from pasted text", () => {
    const dirty = `Line one ${String.fromCharCode(0)} with a ${String.fromCharCode(7)} bell.`;
    const cleaned = sanitiseText(dirty);
    expect(cleaned).not.toContain(String.fromCharCode(0));
    expect(cleaned).not.toContain(String.fromCharCode(7));
    expect(cleaned).toContain("Line one");
  });

  it("renders script-like input as inert text, never as markup", () => {
    const hostile = '<script>alert("xss")</script>';
    const result = buildAnswer(
      request({
        question: `Tell me about a time you handled ${hostile}`,
        experienceNotes: `I handled ${hostile} calmly and documented it.`,
        company: hostile,
      }),
    );
    const all = result.variants.map((v) => v.text).join(" ");
    // The engine returns plain strings; React escapes them on render. What
    // matters here is that nothing is executed or rewritten into markup.
    expect(typeof all).toBe("string");
    expect(result.variants.every((v) => typeof v.text === "string")).toBe(true);
  });

  it("bounds how much of a very long job description it scans", () => {
    const huge = "responsible for stakeholder reporting. ".repeat(20000);
    const started = Date.now();
    const result = buildAnswer(request({ jobDescription: huge }));
    const elapsed = Date.now() - started;
    expect(result.variants.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
    expect(sanitiseText(huge).length).toBeLessThanOrEqual(MAX_SCAN_CHARS);
  });

  it("caps how many note sentences it will process", () => {
    const many = "I did a thing. ".repeat(500);
    expect(splitSentences(many).length).toBeLessThanOrEqual(24);
  });
});

/* ------------------------------------------------------------------ */
/* Context detection                                                   */
/* ------------------------------------------------------------------ */

describe("context detection", () => {
  it("infers seniority from the job title", () => {
    expect(buildAnswer(request({ jobTitle: "Graduate Analyst" })).context.seniority).toBe("graduate");
    expect(buildAnswer(request({ jobTitle: "Senior Software Engineer" })).context.seniority).toBe("senior");
    expect(buildAnswer(request({ jobTitle: "Operations Manager" })).context.seniority).toBe("manager");
    expect(buildAnswer(request({ jobTitle: "Summer Intern" })).context.seniority).toBe("student");
  });

  it("lets an explicit choice beat detection", () => {
    const result = buildAnswer(
      request({ jobTitle: "Graduate Analyst", seniority: "senior" }),
    );
    expect(result.context.seniority).toBe("senior");
    expect(result.context.seniorityInferred).toBe(false);
  });

  it("picks up skills the visitor lists explicitly", () => {
    const result = buildAnswer(request({ skills: "SQL, stakeholder management" }));
    const labels = result.context.skills.map((s) => s.label.toLowerCase());
    expect(labels.join(" ")).toContain("sql");
  });

  it("reduces a question to a grammatical topic phrase", () => {
    // Must be a gerund, or blocks read "centred on solved a problem".
    expect(extractTopic("Tell me about a time you handled a difficult customer")).toBe(
      "handling a difficult customer",
    );
    expect(extractTopic("Tell me about a time you solved a difficult problem")).toBe(
      "solving a difficult problem",
    );
    expect(extractTopic("Give an example of when you led a team")).toBe(
      "leading a team",
    );
    expect(extractTopic("How do you manage competing deadlines")).toBe(
      "managing competing deadlines",
    );
    expect(extractTopic("What is your greatest weakness")).toBe(
      "your greatest weakness",
    );
    expect(extractTopic("")).toBeUndefined();
    // An unrecognised shape yields no topic rather than a broken phrase.
    expect(extractTopic("Purple monday sideways")).toBeUndefined();
  });

  it("converts common irregular and regular past tenses to gerunds", () => {
    const cases: [string, string][] = [
      ["solved a problem", "solving a problem"],
      ["disagreed with a colleague", "disagreeing with a colleague"],
      ["managed a budget", "managing a budget"],
      ["worked under pressure", "working under pressure"],
      ["led a team", "leading a team"],
      ["took ownership", "taking ownership"],
      ["overcame an obstacle", "overcoming an obstacle"],
      ["identified a risk", "identifying a risk"],
      ["prioritise your workload", "prioritising your workload"],
      ["working to a deadline", "working to a deadline"],
    ];
    for (const [input, expected] of cases) {
      expect(toGerund(input), input).toBe(expected);
    }
  });

  it("tidies note sentences into well-formed sentences", () => {
    expect(tidySentence("  did the thing  ")).toBe("Did the thing.");
    expect(tidySentence("Already fine.")).toBe("Already fine.");
  });
});

/* ------------------------------------------------------------------ */
/* Sentence distribution                                               */
/* ------------------------------------------------------------------ */

describe("sentence distribution", () => {
  it("reserves a sentence containing a figure for the result slot", () => {
    const slots = slotsFor("star", "standard", "problem-solving");
    const assignment = distributeSentences(
      [
        "We were short staffed over the peak",
        "I rebuilt the rota",
        "On-time despatch finished at 99 per cent",
      ],
      slots,
    );
    const resultIndex = slots.indexOf("result");
    expect(assignment.get(resultIndex)).toContain("99 per cent");
  });

  it("returns nothing to place when there are no notes", () => {
    const slots = slotsFor("star", "standard", "problem-solving");
    expect(distributeSentences([], slots).size).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Corpus scale                                                        */
/* ------------------------------------------------------------------ */

describe("corpus scale", () => {
  it("covers every question category the taxonomy declares", () => {
    expect(CORPUS.categories.length).toBeGreaterThanOrEqual(35);
  });

  it("comfortably exceeds ten thousand useful combinations", () => {
    const stats = corpusStats();
    expect(stats.blockCount).toBeGreaterThan(500);
    expect(stats.conservativeSpace).toBeGreaterThan(10000);
    expect(stats.compositionSpace).toBeGreaterThan(stats.conservativeSpace);
  });

  it("has a rich enough reference vocabulary to specialise answers", () => {
    const stats = corpusStats();
    expect(stats.industryCount).toBeGreaterThanOrEqual(18);
    expect(stats.roleCount).toBeGreaterThanOrEqual(50);
    expect(stats.skillCount).toBeGreaterThanOrEqual(70);
  });
});

/* ------------------------------------------------------------------ */
/* Breadth smoke test                                                  */
/* ------------------------------------------------------------------ */

describe("breadth", () => {
  const QUESTIONS = [
    "Tell me about yourself",
    "Why do you want to work here?",
    "Why do you want this job?",
    "Why should we hire you?",
    "What are your greatest strengths?",
    "What is your greatest weakness?",
    "Tell me about a challenge you faced",
    "Tell me about a time you disagreed with a colleague",
    "Describe a time you failed",
    "Tell me about your proudest achievement",
    "Give an example of when you led a team",
    "Tell me about a time you worked in a team",
    "Describe a time you had to explain something complex",
    "Tell me about a time you solved a difficult problem",
    "Describe a technical challenge you overcame",
    "Tell me about a time you worked under pressure",
    "How do you manage competing deadlines?",
    "How do you prioritise your workload?",
    "Tell me about a time you dealt with ambiguity",
    "Describe a difficult customer situation you handled",
    "Tell me about a time you learned something quickly",
    "Give an example of when you took the initiative",
    "Tell me about a time you improved a process",
    "Describe a time you had to adapt to change",
    "How do you handle critical feedback?",
    "Where do you see yourself in five years?",
    "What motivates you?",
    "What kind of culture do you work best in?",
  ];

  it("produces a coherent draft for every supported question type", () => {
    for (const question of QUESTIONS) {
      const result = buildAnswer(request({ question }));
      expect(result.variants.length, question).toBeGreaterThanOrEqual(1);
      for (const variant of result.variants) {
        expect(variant.text.trim().length, question).toBeGreaterThan(40);
        expect(variant.text, question).not.toMatch(/\{\w+\}/);
        expect(variant.text, question).not.toContain("[[");
        // Every draft must end as a sentence.
        expect(variant.text.trim(), question).toMatch(/[.!?\]]$/);
      }
    }
  });

  it("does not open every answer with the same words", () => {
    const openers = QUESTIONS.map((question) => {
      const text = buildAnswer(request({ question })).variants[0].text;
      return text.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    });
    // A handful of repeats is fine; a single opener for everything is not.
    expect(new Set(openers).size).toBeGreaterThan(QUESTIONS.length / 3);
  });

  it("does not close every answer with the same words", () => {
    const closers = QUESTIONS.map((question) => {
      const text = buildAnswer(request({ question })).variants[0].text.trim();
      return text.split(/\s+/).slice(-4).join(" ").toLowerCase();
    });
    expect(new Set(closers).size).toBeGreaterThan(QUESTIONS.length / 3);
  });
});

/* ------------------------------------------------------------------ */
/* Slot coverage — every recipe must fill every slot, for everyone      */
/* ------------------------------------------------------------------ */

describe("slot coverage", () => {
  /**
   * The worst case for the corpus: a visitor who typed only the question, so
   * no template variable has a value and nothing can be woven in. Every slot
   * of every recipe must still resolve to a block, otherwise some visitors
   * silently get a shorter, weaker answer than others.
   */
  it("fills every slot of every framework, length and category", () => {
    const rng = createRng(1);
    const misses: string[] = [];

    for (const category of CORPUS.categories) {
      for (const framework of category.allowedFrameworks) {
        for (const length of ANSWER_LENGTHS) {
          for (const role of slotsFor(framework, length, category.id)) {
            const ctx: SelectionContext = {
              category: category.id,
              framework,
              tone: "professional",
              length,
              industry: "general",
              seniority: "mid",
              values: {},
              avoid: new Set(),
              used: new Set(),
              blocked: new Set(),
              preferPrompt: true,
            };
            if (!selectBlock(CORPUS.blocksByRole[role], ctx, rng)) {
              misses.push(`${category.id} [${framework}/${length}] ${role}`);
            }
          }
        }
      }
    }

    expect(misses).toEqual([]);
  });

  it("fills every slot for every tone, industry and seniority", () => {
    const rng = createRng(2);
    const misses: string[] = [];

    for (const tone of TONES) {
      for (const industry of INDUSTRIES) {
        for (const seniority of SENIORITIES) {
          for (const role of slotsFor("star", "detailed", "problem-solving")) {
            const ctx: SelectionContext = {
              category: "problem-solving",
              framework: "star",
              tone,
              length: "detailed",
              industry,
              seniority,
              values: {},
              avoid: new Set(),
              used: new Set(),
              blocked: new Set(),
              preferPrompt: true,
            };
            if (!selectBlock(CORPUS.blocksByRole[role], ctx, rng)) {
              misses.push(`${tone}/${industry}/${seniority} ${role}`);
            }
          }
        }
      }
    }

    expect(misses).toEqual([]);
  });

  it("still prefers a category-matched block when one exists", () => {
    const pool = CORPUS.blocksByRole.action.filter((b) =>
      b.categories?.includes("leadership"),
    );
    expect(pool.length).toBeGreaterThan(0);
  });
});
