import { blocks, type ContentBlock } from "./types";

/**
 * Opening blocks — the first sentence of an assembled answer.
 *
 * An opening does one job: it signals that a real, specific example is coming,
 * and it sets the register for everything after it. It must never assert a fact
 * about the candidate (no employer, award, figure or timeframe); anything
 * specific comes either from a `{variable}` the visitor typed or from a
 * `[[bracketed prompt]]` asking them to supply the detail themselves.
 *
 * ## Adding an opening
 * - Give it a unique id prefixed `open-`, and `role: "opening"`.
 * - Every `{var}` used in `text` MUST also appear in `requires`, or the block is
 *   silently discarded at runtime.
 * - Vary the first word. Blocks are joined into a paragraph, and a corpus where
 *   everything starts "I ..." reads like a form letter.
 * - Tag `industries` / `seniority` only when the wording genuinely assumes them.
 *   An absent tag array means "eligible everywhere", which is usually right.
 * - Use `conflictsWith` when two openings would contradict each other if both
 *   were ever placed in one answer (for example, two competing claims about how
 *   recent the example is).
 */
export const OPENINGS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* General purpose                                                   */
  /* ---------------------------------------------------------------- */
  {
    id: "open-general-01",
    role: "opening",
    text: "A situation that fits this question well came up in my most recent role, and it centred on {topic}.",
    requires: ["topic"],
    categories: ["behavioural", "competency", "challenge", "problem-solving"],
    frameworks: ["star", "car"],
    tones: ["professional"],
    conflictsWith: ["open-general-05", "open-time-02"],
    weight: 2,
  },
  {
    id: "open-general-02",
    role: "opening",
    text: "The example I keep returning to involves {topic}, largely because it changed the way I work.",
    requires: ["topic"],
    categories: ["behavioural", "competency", "learning-quickly", "feedback"],
    frameworks: ["star", "car", "reflective"],
    tones: ["professional"],
  },
  {
    id: "open-general-03",
    role: "opening",
    text: "There is one piece of work that answers this far better than anything abstract I could say.",
    categories: ["behavioural", "competency", "general"],
    frameworks: ["star", "car"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "open-general-04",
    role: "opening",
    text: "My honest answer starts with what I was actually accountable for at the time.",
    categories: ["behavioural", "competency", "failure", "success"],
    tones: ["professional"],
  },
  {
    id: "open-general-05",
    role: "opening",
    text: "Something very close to this came up recently, and it is fresh enough for me to talk through properly.",
    categories: ["behavioural", "competency", "general"],
    tones: ["conversational"],
    conflictsWith: ["open-general-01"],
  },
  {
    id: "open-conv-01",
    role: "opening",
    text: "Happy to give you a specific example instead of a general answer, since I think it shows more.",
    categories: ["behavioural", "competency", "general"],
    tones: ["conversational"],
  },
  {
    id: "open-concise-01",
    role: "opening",
    text: "One example covers this well.",
    tones: ["concise"],
    lengths: ["short"],
    weight: 2,
  },
  {
    id: "open-concise-02",
    role: "opening",
    text: "Let me give the short version first and fill in the detail if that helps.",
    tones: ["concise", "conversational"],
    lengths: ["short", "standard"],
  },

  /* ---------------------------------------------------------------- */
  /* Time and context framing                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "open-time-01",
    role: "opening",
    text: "Early in my time in a {seniority} role, I was handed a problem nobody had managed to settle.",
    requires: ["seniority"],
    categories: ["challenge", "problem-solving", "initiative"],
    frameworks: ["star", "car"],
  },
  {
    id: "open-time-02",
    role: "opening",
    text: "Before I joined my current team, {topic} was handled informally, and that became my starting point.",
    requires: ["topic"],
    categories: ["initiative", "innovation", "problem-solving"],
    conflictsWith: ["open-general-01"],
  },

  /* ---------------------------------------------------------------- */
  /* Anchored to what the visitor typed                                */
  /* ---------------------------------------------------------------- */
  {
    id: "open-role-01",
    role: "opening",
    text: "Applying for a {role} position made me look back at the work that best shows what I would bring.",
    requires: ["role"],
    categories: ["why-this-job", "why-hire-you", "motivation", "career-goals"],
    frameworks: ["motivation", "direct"],
  },
  {
    id: "open-role-02",
    role: "opening",
    text: "Reading the {role} description, the part that matched my own experience most closely was {topic}.",
    requires: ["role", "topic"],
    categories: ["why-this-job", "motivation", "why-hire-you"],
    frameworks: ["motivation", "direct"],
  },
  {
    id: "open-company-01",
    role: "opening",
    text: "What drew me to {company} is easiest to explain through the kind of work I have chosen so far.",
    requires: ["company"],
    categories: ["why-this-company", "motivation", "values-culture"],
    frameworks: ["motivation"],
  },
  {
    id: "open-skill-01",
    role: "opening",
    text: "Most of what I would bring to this comes down to {skill}, so it is easier to show it in practice.",
    requires: ["skill"],
    categories: ["strengths", "why-hire-you", "competency"],
    frameworks: ["direct", "star"],
  },
  {
    id: "open-skills-01",
    role: "opening",
    text: "Across my career the consistent thread has been {skills}, and this question sits right in the middle of it.",
    requires: ["skills"],
    categories: ["tell-me-about-yourself", "strengths", "why-hire-you"],
    frameworks: ["direct", "motivation"],
    tones: ["professional", "confident"],
  },
  {
    id: "open-exp-01",
    role: "opening",
    text: "Some context first, because it shapes everything that follows: {experience}.",
    requires: ["experience"],
    categories: ["tell-me-about-yourself", "general", "behavioural"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "open-ach-01",
    role: "opening",
    text: "The achievement I would put forward here is {achievement}, and the story behind it is the useful part.",
    requires: ["achievement"],
    categories: ["success", "why-hire-you", "strengths"],
    tones: ["confident"],
  },

  /* ---------------------------------------------------------------- */
  /* Industry-specialised                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "open-ind-tech-01",
    role: "opening",
    text: "Technology work throws up this kind of problem constantly, and one instance stands out.",
    industries: ["technology"],
    categories: ["technical-challenge", "problem-solving", "technical-role"],
    frameworks: ["star", "technical"],
  },
  {
    id: "open-ind-health-01",
    role: "opening",
    text: "Clinical settings leave very little room for guesswork, which is why this example has stayed with me.",
    industries: ["healthcare"],
    categories: ["pressure", "challenge", "behavioural"],
  },
  {
    id: "open-ind-finance-01",
    role: "opening",
    text: "Reporting cycles have a habit of exposing weak process, and that is exactly how this started.",
    industries: ["finance"],
    categories: ["problem-solving", "challenge", "competency"],
  },
  {
    id: "open-ind-retail-01",
    role: "opening",
    text: "Shop floor problems tend to arrive at the worst possible moment, and this one was no different.",
    industries: ["retail"],
    categories: ["pressure", "challenge"],
    tones: ["conversational"],
  },
  {
    id: "open-ind-hosp-01",
    role: "opening",
    text: "Service never stops for a problem, so I learned to solve things while the room was still full.",
    industries: ["hospitality"],
    categories: ["pressure", "deadlines", "challenge"],
    tones: ["confident"],
  },
  {
    id: "open-ind-edu-01",
    role: "opening",
    text: "Teaching taught me that a plan only matters once it survives contact with a real group of learners.",
    industries: ["education"],
    categories: ["adaptability", "communication", "challenge"],
  },
  {
    id: "open-ind-public-01",
    role: "opening",
    text: "Public sector work carries a duty to get the decision right and to be able to show why.",
    industries: ["public-sector"],
    categories: ["stakeholder", "values-culture", "competency"],
    tones: ["professional"],
  },
  {
    id: "open-ind-log-01",
    role: "opening",
    text: "Dispatch pressure has a way of finding the weakest link in a process, and it found ours.",
    industries: ["logistics"],
    categories: ["problem-solving", "pressure"],
  },
  {
    id: "open-ind-mfg-01",
    role: "opening",
    text: "Line stoppages concentrate the mind, and one of them shaped how I approach this.",
    industries: ["manufacturing"],
    categories: ["problem-solving", "pressure"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "open-ind-constr-01",
    role: "opening",
    text: "Site work rarely runs exactly to programme, and managing that gap is most of the job.",
    industries: ["construction"],
    categories: ["adaptability", "deadlines", "stakeholder"],
  },
  {
    id: "open-ind-creative-01",
    role: "opening",
    text: "Creative work lives or dies on the brief, and this example began with a brief nobody agreed on.",
    industries: ["creative"],
    categories: ["conflict", "stakeholder", "communication"],
  },
  {
    id: "open-ind-sales-01",
    role: "opening",
    text: "Pipeline conversations get honest quickly, which is why I like this example.",
    industries: ["sales"],
    categories: ["challenge", "communication", "success"],
    tones: ["confident"],
  },
  {
    id: "open-ind-cs-01",
    role: "opening",
    text: "Front line contact tells you more about a business than any report, and this showed me why.",
    industries: ["customer-service"],
    categories: ["problem-solving", "initiative", "communication"],
    tones: ["conversational"],
  },
  {
    id: "open-ind-legal-01",
    role: "opening",
    text: "Legal work rewards precision, so I will be precise about what I actually did here.",
    industries: ["legal"],
    categories: ["competency", "behavioural"],
    tones: ["professional", "concise"],
  },
  {
    id: "open-ind-eng-01",
    role: "opening",
    text: "Engineering problems are usually constraint problems, and this one was no exception.",
    industries: ["engineering"],
    categories: ["technical-challenge", "problem-solving", "technical-role"],
    frameworks: ["technical", "star"],
    tones: ["concise", "professional"],
  },
  {
    id: "open-ind-science-01",
    role: "opening",
    text: "Laboratory work teaches patience with evidence, and that habit shaped how I handled this.",
    industries: ["science"],
    categories: ["problem-solving", "technical-challenge"],
  },
  {
    id: "open-ind-nonprofit-01",
    role: "opening",
    text: "Charitable work stretches limited resource a long way, and this example is a fair illustration of that.",
    industries: ["nonprofit"],
    categories: ["prioritisation", "innovation", "values-culture"],
  },

  /* ---------------------------------------------------------------- */
  /* Seniority-specialised                                             */
  /* ---------------------------------------------------------------- */
  {
    id: "open-sen-student-01",
    role: "opening",
    text: "As a student I had no formal authority, so anything I wanted to change had to be argued on merit.",
    seniority: ["student", "graduate"],
    categories: ["graduate", "internship", "teamwork", "initiative"],
  },
  {
    id: "open-sen-grad-01",
    role: "opening",
    text: "Coming into work straight from study, my first real test was {topic}.",
    requires: ["topic"],
    seniority: ["graduate", "junior"],
    categories: ["graduate", "learning-quickly", "challenge"],
  },
  {
    id: "open-sen-junior-01",
    role: "opening",
    text: "Being new to the team meant asking the questions everyone else had stopped asking.",
    seniority: ["junior", "graduate", "student"],
    categories: ["initiative", "learning-quickly", "innovation"],
    tones: ["conversational"],
  },
  {
    id: "open-sen-lead-01",
    role: "opening",
    text: "Leading through this meant being clear about direction before anyone asked me for it.",
    seniority: ["senior", "lead", "manager", "executive"],
    categories: ["leadership", "management-role", "ambiguity"],
    tones: ["confident"],
  },
  {
    id: "open-sen-mgr-01",
    role: "opening",
    text: "Managing people through a change like this is mostly a matter of honesty and sequencing.",
    seniority: ["manager", "executive"],
    categories: ["leadership", "management-role", "communication"],
  },
  {
    id: "open-sen-exec-01",
    role: "opening",
    text: "At this level the question is rarely what to do, and almost always what to stop doing.",
    seniority: ["executive", "lead"],
    categories: ["leadership", "prioritisation", "management-role"],
    tones: ["confident", "concise"],
  },
]);
