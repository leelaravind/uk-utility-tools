import { describe, expect, it } from "vitest";

import {
  composeAnswer,
  detectQuestionType,
  LocalTemplateEngine,
  localAnswerEngine,
  splitNotes,
  type AnswerInput,
} from "./jobAnswer";

const RICH_NOTES =
  "Our warehouse team was two people down during the Christmas peak. " +
  "I was asked to keep same-day dispatch running for priority orders. " +
  "I reorganised the picking route and trained two temps on the scanner system. " +
  "We hit 99% same-day dispatch and my manager asked me to write up the new route.";

function baseInput(overrides: Partial<AnswerInput> = {}): AnswerInput {
  return {
    question: "Tell me about a time you worked under pressure.",
    experienceNotes: RICH_NOTES,
    tone: "professional",
    framework: "star",
    ...overrides,
  };
}

describe("splitNotes", () => {
  it("splits on sentence punctuation and newlines", () => {
    expect(splitNotes("First thing. Second thing! Third?")).toHaveLength(3);
    expect(splitNotes("Line one\nLine two")).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(splitNotes("")).toEqual([]);
    expect(splitNotes("   ")).toEqual([]);
  });
});

describe("frameworks produce their sections", () => {
  it("STAR: Situation / Task / Action / Result", () => {
    const result = composeAnswer(baseInput());
    expect(result.structure.map((s) => s.heading)).toEqual([
      "Situation",
      "Task",
      "Action",
      "Result",
    ]);
    // Four rich sentences → every slot filled, no placeholders.
    expect(result.draft).not.toContain("[Add specifics:");
    expect(result.draft).toContain("Christmas peak");
    expect(result.draft).toContain("99% same-day dispatch");
    // Draft is four paragraphs.
    expect(result.draft.split("\n\n")).toHaveLength(4);
  });

  it("technical: Context / Approach / Trade-offs / Outcome", () => {
    const result = composeAnswer(baseInput({ framework: "technical" }));
    expect(result.structure.map((s) => s.heading)).toEqual([
      "Context",
      "Approach",
      "Trade-offs",
      "Outcome",
    ]);
  });

  it("concise: three labelled sentences in one paragraph", () => {
    const result = composeAnswer(baseInput({ framework: "concise" }));
    expect(result.structure.map((s) => s.heading)).toEqual([
      "Direct answer",
      "Evidence",
      "Relevance",
    ]);
    expect(result.draft.split("\n\n")).toHaveLength(1);
  });

  it("motivation: company / role / fit", () => {
    const result = composeAnswer(
      baseInput({ framework: "motivation", jobContext: "Acme Logistics" })
    );
    expect(result.structure.map((s) => s.heading)).toEqual([
      "The company",
      "The role",
      "The fit",
    ]);
    expect(result.draft).toContain("Acme Logistics");
  });
});

describe("tone changes the output", () => {
  it("professional, friendly and confident drafts all differ", () => {
    const pro = composeAnswer(baseInput({ tone: "professional" })).draft;
    const friendly = composeAnswer(baseInput({ tone: "friendly" })).draft;
    const confident = composeAnswer(baseInput({ tone: "confident" })).draft;
    expect(pro).not.toBe(friendly);
    expect(friendly).not.toBe(confident);
    expect(pro).toContain("A relevant example from my experience:");
    expect(confident).toContain("Here is a clear example:");
  });
});

describe("placeholders appear when notes are thin", () => {
  it("empty notes → every STAR slot is a placeholder", () => {
    const result = composeAnswer(baseInput({ experienceNotes: "" }));
    const placeholders = result.draft.match(/\[Add specifics:/g) ?? [];
    expect(placeholders).toHaveLength(4);
    for (const section of result.structure) {
      expect(section.userContent).toBeUndefined();
    }
  });

  it("one sentence of notes fills only the Situation slot", () => {
    const result = composeAnswer(
      baseInput({ experienceNotes: "We were understaffed at Christmas." })
    );
    expect(result.structure[0].userContent).toBe(
      "We were understaffed at Christmas."
    );
    expect(result.structure[1].userContent).toBeUndefined();
    expect(result.draft).toContain("[Add specifics:");
  });

  it("adds a tip about replacing placeholders only when they exist", () => {
    const thin = composeAnswer(baseInput({ experienceNotes: "" }));
    expect(thin.tips.some((t) => t.includes("[Add specifics:"))).toBe(true);
    const rich = composeAnswer(baseInput());
    expect(rich.tips.some((t) => t.includes("[Add specifics:"))).toBe(false);
  });
});

describe("question type detection", () => {
  it("detects teamwork → STAR", () => {
    const d = detectQuestionType(
      "Tell me about a time you worked in a team."
    );
    expect(d.type).toBe("teamwork");
    expect(d.suggestedFramework).toBe("star");
    expect(d.tips.length).toBeGreaterThan(0);
  });

  it("detects failure → STAR", () => {
    const d = detectQuestionType(
      "Describe a time when something went wrong at work."
    );
    expect(d.type).toBe("failure");
    expect(d.suggestedFramework).toBe("star");
  });

  it("detects why-us → motivation", () => {
    const d = detectQuestionType("Why do you want to work for us?");
    expect(d.type).toBe("why-us");
    expect(d.suggestedFramework).toBe("motivation");
  });

  it("detects strength → concise", () => {
    const d = detectQuestionType("What are your greatest strengths?");
    expect(d.type).toBe("strength");
    expect(d.suggestedFramework).toBe("concise");
  });

  it("detects technical → technical", () => {
    const d = detectQuestionType("How would you design a URL shortener?");
    expect(d.type).toBe("technical");
    expect(d.suggestedFramework).toBe("technical");
  });

  it("falls back to general → STAR", () => {
    const d = detectQuestionType("Tell me about yourself.");
    expect(d.type).toBe("general");
    expect(d.suggestedFramework).toBe("star");
  });
});

describe("AnswerEngine interface", () => {
  it("LocalTemplateEngine.compose matches composeAnswer", () => {
    const engine = new LocalTemplateEngine();
    expect(engine.compose(baseInput())).toEqual(composeAnswer(baseInput()));
  });

  it("the default export is a working engine", () => {
    const result = localAnswerEngine.compose(baseInput());
    expect(result.draft.length).toBeGreaterThan(0);
    expect(result.structure).toHaveLength(4);
  });
});
