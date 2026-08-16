import { describe, expect, it } from "vitest";

import {
  analyseCvMatch,
  extractHardRequirements,
  localMatchAnalyser,
  normaliseText,
  STUFFING_THRESHOLD,
} from "./cvMatch";

const TECH_JD = [
  "We are hiring a developer to join our platform group.",
  "Requirements:",
  "- JavaScript and TypeScript essential",
  "- React required",
  "- Experience with AWS",
  "- SQL knowledge",
].join("\n");

describe("normaliseText", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    expect(normaliseText("  Hello,   WORLD! (nice) ")).toBe("hello world nice");
  });

  it("keeps + and # so c++ and c# survive", () => {
    expect(normaliseText("C++ and C# devs")).toBe("c++ and c# devs");
  });

  it("removes apostrophes rather than splitting words", () => {
    expect(normaliseText("driver's licence")).toBe("drivers licence");
  });
});

describe("analyseCvMatch — scoring", () => {
  it("scores 100 when the CV fully overlaps the JD", () => {
    const result = analyseCvMatch(TECH_JD, TECH_JD);
    expect(result.score).toBe(100);
    expect(result.missingTerms).toHaveLength(0);
    expect(result.matchedTerms.length).toBeGreaterThan(0);
  });

  it("scores 0 for a completely disjoint CV", () => {
    const cv =
      "I stack shelves at a supermarket, pour coffee for customers and tidy the stockroom every evening.";
    const result = analyseCvMatch(cv, TECH_JD);
    expect(result.score).toBe(0);
    expect(result.matchedTerms).toHaveLength(0);
    expect(result.missingTerms.length).toBeGreaterThan(0);
  });

  it("gives partial credit for partial overlap", () => {
    const cv = "Front-end developer using JavaScript and React daily.";
    const result = analyseCvMatch(cv, TECH_JD);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it("matches aliases: JS → javascript, ReactJS → react", () => {
    const cv = "Skilled in JS and ReactJS after two intense agency jobs.";
    const result = analyseCvMatch(cv, TECH_JD);
    const matched = result.matchedTerms.map((t) => t.term);
    expect(matched).toContain("javascript");
    expect(matched).toContain("react");
  });

  it("matches multi-word dictionary phrases like Power BI", () => {
    const jd = "Reporting analyst needed. Power BI required. Power BI dashboards daily.";
    const cv = "I build Power BI dashboards for finance teams.";
    const result = analyseCvMatch(cv, jd);
    expect(result.matchedTerms.map((t) => t.term)).toContain("power bi");
  });

  it("weights dictionary terms on requirement lines: count + 2 + 2", () => {
    const result = analyseCvMatch("", "- React required");
    const react = result.missingTerms.find((t) => t.term === "react");
    expect(react).toBeDefined();
    expect(react!.weight).toBe(5); // 1 (count) + 2 (dictionary) + 2 (requirement line)
    expect(react!.inDictionary).toBe(true);
    // Highest-weight missing term comes first (prioritised).
    expect(result.missingTerms[0].term).toBe("react");
  });

  it("returns score 0 with a warning when the JD yields no keywords", () => {
    const result = analyseCvMatch("", "");
    expect(result.score).toBe(0);
    expect(result.matchedTerms).toHaveLength(0);
    expect(
      result.warnings.some((w) => w.includes("No meaningful keywords"))
    ).toBe(true);
  });
});

describe("analyseCvMatch — hard requirements", () => {
  const JD = [
    "Senior engineer wanted.",
    "At least 5+ years experience required.",
    "Degree in Computer Science essential.",
    "Full UK driving licence needed.",
    "Must have right to work in the UK.",
  ].join("\n");

  it("extracts years, degree (with field), licence and right to work", () => {
    const cv =
      "I have 7 years experience and a BSc degree in Computer Science. Full clean driving licence holder.";
    const reqs = extractHardRequirements(JD, cv);

    const exp = reqs.find((r) => r.kind === "experience");
    expect(exp).toBeDefined();
    expect(exp!.text).toBe("5+ years' experience");
    expect(exp!.metInCv).toBe(true);

    const degree = reqs.find((r) => r.kind === "qualification");
    expect(degree).toBeDefined();
    expect(degree!.text.toLowerCase()).toBe("degree in computer science");
    expect(degree!.metInCv).toBe(true);

    const licence = reqs.find((r) => r.kind === "licence");
    expect(licence).toBeDefined();
    expect(licence!.metInCv).toBe(true);

    const rtw = reqs.find((r) => r.kind === "right-to-work");
    expect(rtw).toBeDefined();
    expect(rtw!.metInCv).toBe(false);
  });

  it("marks the experience requirement unmet when the CV shows fewer years", () => {
    const reqs = extractHardRequirements(JD, "I have 3 years experience.");
    const exp = reqs.find((r) => r.kind === "experience");
    expect(exp!.metInCv).toBe(false);
  });

  it("detects certifications such as a CSCS card", () => {
    const reqs = extractHardRequirements(
      "Labourer needed. CSCS card required.",
      "Hard-working labourer, no cards yet."
    );
    const cert = reqs.find((r) => r.kind === "certification");
    expect(cert).toBeDefined();
    expect(cert!.text).toBe("CSCS card");
    expect(cert!.metInCv).toBe(false);
  });

  it("surfaces hard requirements through the main analysis", () => {
    const result = analyseCvMatch("A short CV.", JD);
    expect(result.hardRequirements.length).toBeGreaterThanOrEqual(4);
  });
});

describe("analyseCvMatch — warnings", () => {
  it("fires the keyword-stuffing warning above the threshold", () => {
    const stuffed =
      Array.from({ length: STUFFING_THRESHOLD + 1 }, () => "python").join(
        " and then "
      ) + ". I also enjoy hiking at weekends across the national parks.";
    const result = analyseCvMatch(stuffed, TECH_JD);
    expect(
      result.warnings.some((w) => w.includes("keyword stuffing"))
    ).toBe(true);
    expect(result.warnings.some((w) => w.includes("python"))).toBe(true);
  });

  it("does not fire the stuffing warning at or below the threshold", () => {
    const fine =
      Array.from({ length: STUFFING_THRESHOLD }, () => "python").join(
        " and then "
      ) + ".";
    const result = analyseCvMatch(fine, TECH_JD);
    expect(
      result.warnings.some((w) => w.includes("keyword stuffing"))
    ).toBe(false);
  });

  it("warns on a very short CV and a very short JD", () => {
    const result = analyseCvMatch("Short CV.", "Short JD.");
    expect(result.warnings.some((w) => w.includes("CV text looks very short"))).toBe(
      true
    );
    expect(
      result.warnings.some((w) => w.includes("job description looks very short"))
    ).toBe(true);
  });
});

describe("analyseCvMatch — suggestions", () => {
  it("groups missing terms into skills / qualifications / other", () => {
    const jd = [
      "Requirements:",
      "- React required",
      "- Degree essential",
      "- Widgets knowledge needed for widgets assembly",
    ].join("\n");
    const result = analyseCvMatch("Nothing relevant here at all.", jd);
    const groups = result.suggestions.map((s) => s.group);
    expect(groups).toContain("skills");
    expect(groups).toContain("qualifications");
    expect(groups).toContain("other");
    const skills = result.suggestions.find((s) => s.group === "skills");
    expect(skills!.terms).toContain("react");
    const quals = result.suggestions.find((s) => s.group === "qualifications");
    expect(quals!.terms).toContain("degree");
  });
});

describe("localMatchAnalyser (MatchAnalyser interface)", () => {
  it("delegates to analyseCvMatch", () => {
    const a = localMatchAnalyser.analyse(TECH_JD, TECH_JD);
    const b = analyseCvMatch(TECH_JD, TECH_JD);
    expect(a).toEqual(b);
  });
});
