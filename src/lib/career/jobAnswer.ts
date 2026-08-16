/**
 * Job application answer drafting — deterministic template composition.
 *
 * This is honestly a set of sentence scaffolds, NOT an AI: the user's own
 * notes are slotted into a proven answer framework (STAR, technical,
 * concise, motivation) and bracketed [add specifics…] placeholders mark
 * every gap that still needs the user's real detail. Nothing is uploaded.
 */

export type Tone = "professional" | "friendly" | "confident";
export type Framework = "star" | "technical" | "concise" | "motivation";
export type QuestionType =
  | "teamwork"
  | "failure"
  | "why-us"
  | "strength"
  | "technical"
  | "general";

export interface AnswerInput {
  question: string;
  experienceNotes: string;
  jobContext?: string;
  tone: Tone;
  framework: Framework;
}

export interface AnswerSection {
  heading: string;
  guidance: string;
  /** The user's own material slotted into this section, if any. */
  userContent?: string;
}

export interface AnswerResult {
  draft: string;
  structure: AnswerSection[];
  tips: string[];
}

export interface QuestionDetection {
  type: QuestionType;
  suggestedFramework: Framework;
  tips: string[];
}

/**
 * Pluggable engine interface so an LLM-backed mode can be added later
 * without rewriting the UI. The local template engine is the default.
 */
export interface AnswerEngine {
  compose(input: AnswerInput): AnswerResult;
}

/* ------------------------------------------------------------------ */
/* Question type detection                                             */
/* ------------------------------------------------------------------ */

export function detectQuestionType(question: string): QuestionDetection {
  const q = question.toLowerCase();

  if (
    /why (?:do you want|are you interested|us\b|this (?:role|job|company|organisation))|what attracts you|motivat/.test(
      q
    )
  ) {
    return {
      type: "why-us",
      suggestedFramework: "motivation",
      tips: [
        "Name something specific about this employer — a product, value or recent project — generic praise is easy to spot.",
        "Connect the role to your own direction of travel, not just what you would gain.",
        "Avoid mentioning salary, commute or benefits as your main motivation.",
      ],
    };
  }

  if (
    /fail|mistake|went wrong|setback|weakness|didn.?t work|regret|difficult(?:y| situation| decision)?|challeng|conflict|disagree/.test(
      q
    )
  ) {
    return {
      type: "failure",
      suggestedFramework: "star",
      tips: [
        "Pick a real but recoverable example — never one that questions your integrity or core competence for this job.",
        "Spend most of your words on what you did about it and what changed afterwards, not on the failure itself.",
        "End with the lesson and how you have applied it since.",
      ],
    };
  }

  if (/team|colleague|collaborat|work(?:ing)? with others|group|stakeholder/.test(q)) {
    return {
      type: "teamwork",
      suggestedFramework: "star",
      tips: [
        "Make your individual contribution clear — interviewers want to hear 'I', not only 'we'.",
        "Show how you handled different working styles or a disagreement, not just that everyone got along.",
        "Quantify the team's outcome if you can (deadline met, error rate down, sales up).",
      ],
    };
  }

  if (/strength|best at|good at|proud|achievement|accomplish|skills? (?:do )?you bring|why should we hire/.test(q)) {
    return {
      type: "strength",
      suggestedFramework: "concise",
      tips: [
        "Choose one or two strengths that map directly onto the job description, not a long list.",
        "Back each strength with one concrete piece of evidence — a result, a number, a named responsibility.",
        "Say how the strength will help in this role specifically.",
      ],
    };
  }

  if (/technical|system|architecture|code|debug|design a|how would you (?:build|implement|approach)/.test(q)) {
    return {
      type: "technical",
      suggestedFramework: "technical",
      tips: [
        "State your assumptions before diving in — it shows structured thinking.",
        "Mention at least one trade-off you weighed up; a single 'right answer' rarely exists.",
        "Finish with how you verified the outcome (tests, monitoring, feedback).",
      ],
    };
  }

  return {
    type: "general",
    suggestedFramework: "star",
    tips: [
      "Answer the question that was actually asked before adding extra context.",
      "One strong, specific example beats several vague ones.",
      "Keep written answers roughly within any stated word limit — recruiters do check.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Tone scaffolding                                                    */
/* ------------------------------------------------------------------ */

interface ToneStyle {
  opener: string; // introduces the example / answer
  secondLead: string; // introduces the task / approach
  thirdLead: string; // introduces the action / trade-offs
  resultLead: string; // introduces the result / outcome
  motivationLead: string; // opens a motivation answer
  fitLead: string; // closes a motivation answer
}

const TONES: Record<Tone, ToneStyle> = {
  professional: {
    opener: "A relevant example from my experience:",
    secondLead: "My responsibility was as follows:",
    thirdLead: "I took a structured approach:",
    resultLead: "As a result:",
    motivationLead: "My interest in this opportunity is straightforward:",
    fitLead: "In terms of fit:",
  },
  friendly: {
    opener: "A good example that comes to mind:",
    secondLead: "What I needed to do:",
    thirdLead: "So here's what I did:",
    resultLead: "In the end:",
    motivationLead: "What genuinely draws me to this role:",
    fitLead: "As for why I'd be a good match:",
  },
  confident: {
    opener: "Here is a clear example:",
    secondLead: "My goal was simple:",
    thirdLead: "I took decisive action:",
    resultLead: "The result speaks for itself:",
    motivationLead: "I want this role for three concrete reasons:",
    fitLead: "I am confident I fit because:",
  },
};

/* ------------------------------------------------------------------ */
/* Notes handling                                                      */
/* ------------------------------------------------------------------ */

/** Split free-text notes into trimmed sentences (also splits on new lines). */
export function splitNotes(notes: string): string[] {
  const matches = notes.match(/[^.!?\n\r]+[.!?]?/g);
  if (!matches) return [];
  return matches.map((s) => s.trim()).filter((s) => s.length > 1);
}

function placeholder(text: string): string {
  return `[Add specifics: ${text}]`;
}

/**
 * Distribute the user's note sentences across 4 framework slots.
 * Returns undefined for slots with no material (a placeholder is used).
 */
function distributeNotes(
  sentences: string[]
): [string?, string?, string?, string?] {
  const n = sentences.length;
  if (n === 0) return [undefined, undefined, undefined, undefined];
  if (n === 1) return [sentences[0], undefined, undefined, undefined];
  if (n === 2) return [sentences[0], undefined, sentences[1], undefined];
  if (n === 3) return [sentences[0], undefined, sentences[1], sentences[2]];
  return [
    sentences[0],
    sentences[1],
    sentences.slice(2, n - 1).join(" "),
    sentences[n - 1],
  ];
}

function joinSection(lead: string, content: string): string {
  return `${lead} ${content}`;
}

/* ------------------------------------------------------------------ */
/* Framework composition                                               */
/* ------------------------------------------------------------------ */

interface SlotSpec {
  heading: string;
  guidance: string;
  missing: string; // placeholder text when the user gave no material
}

const STAR_SLOTS: SlotSpec[] = [
  {
    heading: "Situation",
    guidance:
      "Set the scene in one or two sentences — where you were working, and the context that made this worth talking about.",
    missing:
      "where were you working, when, and what was the situation you faced?",
  },
  {
    heading: "Task",
    guidance:
      "State what you, personally, were responsible for achieving — the goal, deadline or standard expected.",
    missing: "what exactly were you responsible for delivering, and by when?",
  },
  {
    heading: "Action",
    guidance:
      "The heart of the answer: the specific steps YOU took. Use 'I' rather than 'we', and keep it in order.",
    missing:
      "what steps did you personally take, in order — and why those steps?",
  },
  {
    heading: "Result",
    guidance:
      "Finish with the outcome — ideally a number, a deadline met or feedback received — plus what you learned.",
    missing:
      "what was the measurable outcome, and what did you learn from it?",
  },
];

const TECHNICAL_SLOTS: SlotSpec[] = [
  {
    heading: "Context",
    guidance:
      "Briefly describe the system, problem or constraint you were working with, in plain language first.",
    missing: "what was the system or problem, and what constraints applied?",
  },
  {
    heading: "Approach",
    guidance:
      "Explain the solution you chose and, importantly, why you chose it over the alternatives.",
    missing: "what approach did you choose, and why that one?",
  },
  {
    heading: "Trade-offs",
    guidance:
      "Show engineering maturity: what you consciously gave up, risks you accepted, and how you mitigated them.",
    missing:
      "what trade-offs or risks did you weigh up, and how did you handle them?",
  },
  {
    heading: "Outcome",
    guidance:
      "Close with the measurable outcome and how you verified it (tests, metrics, monitoring, user feedback).",
    missing: "what was the outcome, and how did you verify it worked?",
  },
];

function composeFourSlot(
  slots: SlotSpec[],
  input: AnswerInput,
  tone: ToneStyle
): { paragraphs: string[]; structure: AnswerSection[] } {
  const sentences = splitNotes(input.experienceNotes);
  const [a, b, c, d] = distributeNotes(sentences);
  const leads = [tone.opener, tone.secondLead, tone.thirdLead, tone.resultLead];
  const contents = [a, b, c, d];

  const paragraphs: string[] = [];
  const structure: AnswerSection[] = [];

  slots.forEach((slot, i) => {
    const userContent = contents[i];
    const body = userContent ?? placeholder(slot.missing);
    paragraphs.push(joinSection(leads[i], body));
    structure.push({
      heading: slot.heading,
      guidance: slot.guidance,
      userContent,
    });
  });

  return { paragraphs, structure };
}

function composeConcise(
  input: AnswerInput,
  tone: ToneStyle
): { paragraphs: string[]; structure: AnswerSection[] } {
  const sentences = splitNotes(input.experienceNotes);
  const evidence = sentences.length > 0 ? sentences.slice(0, 2).join(" ") : undefined;
  const context = input.jobContext?.trim() || undefined;

  const s1 = `${tone.opener} ${
    evidence ??
    placeholder("your direct one-line answer to the question")
  }`;
  const s2 = `${tone.resultLead} ${
    sentences.length > 2
      ? sentences.slice(2).join(" ")
      : placeholder("one concrete result or number that backs this up")
  }`;
  const s3 = `${tone.fitLead} ${
    context
      ? `that is exactly what ${context} needs from this role.`
      : placeholder("one sentence linking this to the role you are applying for")
  }`;

  return {
    paragraphs: [`${s1} ${s2} ${s3}`],
    structure: [
      {
        heading: "Direct answer",
        guidance: "Open by answering the question in a single sentence.",
        userContent: evidence,
      },
      {
        heading: "Evidence",
        guidance: "Back it up with one concrete example, number or outcome.",
        userContent: sentences.length > 2 ? sentences.slice(2).join(" ") : undefined,
      },
      {
        heading: "Relevance",
        guidance: "Close by linking it to what this role needs.",
        userContent: context,
      },
    ],
  };
}

function composeMotivation(
  input: AnswerInput,
  tone: ToneStyle
): { paragraphs: string[]; structure: AnswerSection[] } {
  const sentences = splitNotes(input.experienceNotes);
  const context = input.jobContext?.trim() || undefined;

  const companyBody = context
    ? `${context} stands out to me, and not in a generic way. ${
        sentences[0] ?? placeholder("name the specific thing about this employer that attracts you — a product, project, value or reputation")
      }`
    : placeholder(
        "name the employer and the specific thing about them that attracts you — a product, project, value or reputation"
      );

  const roleBody =
    sentences[1] ??
    placeholder(
      "which parts of this particular role excite you, and how they match what you enjoy doing most"
    );

  const fitBody =
    sentences.length > 2
      ? sentences.slice(2).join(" ")
      : placeholder(
          "the experience and skills you bring that make this a two-way fit, with one concrete example"
        );

  return {
    paragraphs: [
      joinSection(tone.motivationLead, companyBody),
      joinSection("On the role itself:", roleBody),
      joinSection(tone.fitLead, fitBody),
    ],
    structure: [
      {
        heading: "The company",
        guidance:
          "Show you know who they are: something specific and recent, not flattery that could apply to any employer.",
        userContent: context ?? sentences[0],
      },
      {
        heading: "The role",
        guidance:
          "Explain what attracts you about the day-to-day work of this role in particular.",
        userContent: sentences[1],
      },
      {
        heading: "The fit",
        guidance:
          "Close the loop: what you bring, with evidence, and why the match works both ways.",
        userContent: sentences.length > 2 ? sentences.slice(2).join(" ") : undefined,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

const FRAMEWORK_TIPS: Record<Framework, string> = {
  star: "STAR answers land best when the Action section is the longest part — aim for roughly half the answer.",
  technical:
    "Keep the first sentence jargon-free so a non-specialist interviewer can follow, then add depth.",
  concise:
    "Three sentences is a discipline: if a word does not add evidence or relevance, cut it.",
  motivation:
    "Research beats enthusiasm — one specific fact about the employer is worth a paragraph of adjectives.",
};

export function composeAnswer(input: AnswerInput): AnswerResult {
  const tone = TONES[input.tone];
  const detection = detectQuestionType(input.question);

  let composed: { paragraphs: string[]; structure: AnswerSection[] };
  switch (input.framework) {
    case "star":
      composed = composeFourSlot(STAR_SLOTS, input, tone);
      break;
    case "technical":
      composed = composeFourSlot(TECHNICAL_SLOTS, input, tone);
      break;
    case "concise":
      composed = composeConcise(input, tone);
      break;
    case "motivation":
      composed = composeMotivation(input, tone);
      break;
  }

  const tips: string[] = [FRAMEWORK_TIPS[input.framework], ...detection.tips];
  const hasPlaceholders = composed.paragraphs.some((p) =>
    p.includes("[Add specifics:")
  );
  if (hasPlaceholders) {
    tips.push(
      "Replace every [Add specifics: …] placeholder with your own real detail before using this answer — the brackets mark what only you can supply."
    );
  }
  tips.push(
    "Read the draft aloud and rewrite anything that does not sound like you — this is a scaffold, not a finished answer."
  );

  return {
    draft: composed.paragraphs.join("\n\n"),
    structure: composed.structure,
    tips,
  };
}

/** Local, deterministic template engine — the default implementation. */
export class LocalTemplateEngine implements AnswerEngine {
  compose(input: AnswerInput): AnswerResult {
    return composeAnswer(input);
  }
}

export const localAnswerEngine: AnswerEngine = new LocalTemplateEngine();

export default localAnswerEngine;
