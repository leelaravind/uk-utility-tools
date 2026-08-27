import { blocks, type ContentBlock } from "./types";

/**
 * Reflection blocks — what the candidate learned, and what changed afterwards.
 *
 * A reflection is the sentence that turns an anecdote into evidence of
 * judgement. It should name a specific change in behaviour rather than a warm
 * generality: "I now write requirements up after each conversation" beats "I
 * learned a lot from it".
 *
 * These blocks are what make `reflective` and `weakness` answers honest, so
 * they are allowed to admit fault. What they may never do is invent a fact:
 * no figures, no timeframes, no named employers, awards or qualifications.
 *
 * ## Adding a reflection
 * - Unique id prefixed `refl-`, and `role: "reflection"`.
 * - Declare every `{var}` you use in `requires`.
 * - Pair the lesson with the change it produced. A lesson with no consequence
 *   reads as filler.
 * - Keep the first word varied; a run of "I learned ..." sentences is the most
 *   common failure mode in this role.
 */
export const REFLECTIONS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* General                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "refl-gen-01",
    role: "reflection",
    text: "Looking back, the lesson was that the problem had been visible long before anyone named it.",
    categories: ["failure", "learning-quickly", "problem-solving"],
    frameworks: ["star", "reflective"],
    tones: ["professional"],
    weight: 2,
  },
  {
    id: "refl-gen-02",
    role: "reflection",
    text: "What I took from it was a habit of checking assumptions in writing rather than in my head.",
    categories: ["learning-quickly", "competency", "weakness"],
    frameworks: ["reflective", "star"],
  },
  {
    id: "refl-gen-03",
    role: "reflection",
    text: "Since then I start these situations by asking who is affected, before deciding what to change.",
    categories: ["stakeholder", "learning-quickly", "leadership"],
  },
  {
    id: "refl-gen-04",
    role: "reflection",
    text: "The part I would do differently is speaking up earlier, because I waited longer than I should have.",
    categories: ["weakness", "failure", "feedback"],
    frameworks: ["reflective"],
    tones: ["professional"],
  },
  {
    id: "refl-gen-05",
    role: "reflection",
    text: "It taught me that being right is not the same as being useful, if nobody has been brought along.",
    categories: ["communication", "stakeholder", "conflict"],
  },
  {
    id: "refl-gen-06",
    role: "reflection",
    text: "Honestly, the mistake was mine to own, and saying so plainly made the recovery a good deal quicker.",
    categories: ["failure", "weakness", "values-culture"],
    frameworks: ["reflective"],
    tones: ["conversational"],
  },
  {
    id: "refl-gen-07",
    role: "reflection",
    text: "That experience changed how I plan, in that I now build in a checkpoint before the point of no return.",
    categories: ["learning-quickly", "prioritisation", "problem-solving"],
  },
  {
    id: "refl-gen-08",
    role: "reflection",
    text: "One thing became obvious afterwards: the process had never been designed, only accumulated.",
    categories: ["innovation", "problem-solving", "initiative"],
  },
  {
    id: "refl-gen-09",
    role: "reflection",
    text: "My instinct had been to fix it myself, and the better answer was to make it fixable by anyone.",
    categories: ["leadership", "teamwork", "weakness"],
    seniority: ["mid", "senior", "lead", "manager"],
  },
  {
    id: "refl-gen-10",
    role: "reflection",
    text: "Afterwards I ran a short review with the team, and the changes we agreed came from them rather than from me.",
    categories: ["leadership", "teamwork", "feedback"],
    seniority: ["senior", "lead", "manager", "executive"],
  },
  {
    id: "refl-gen-11",
    role: "reflection",
    text: "Feedback I received at the time was uncomfortable and accurate, and I use it now as a checklist.",
    categories: ["feedback", "weakness", "learning-quickly"],
    frameworks: ["reflective"],
  },
  {
    id: "refl-gen-12",
    role: "reflection",
    text: "If I met the same situation again, I would spend longer on the diagnosis and less on the first idea.",
    categories: ["problem-solving", "weakness", "learning-quickly"],
    frameworks: ["reflective", "car"],
  },
  {
    id: "refl-gen-13",
    role: "reflection",
    text: "Where I had assumed a shared understanding there was none, and that is now the first thing I check.",
    categories: ["communication", "ambiguity", "stakeholder"],
  },
  {
    id: "refl-public-01",
    role: "reflection",
    text: "Recording the reasoning as I go is automatic now, and it has saved me more than once since.",
    industries: ["public-sector", "legal"],
    categories: ["competency", "communication", "stakeholder"],
  },
  {
    id: "refl-sales-01",
    role: "reflection",
    text: "Having watched an optimistic forecast unravel, I now qualify early and say plainly what I do not yet know.",
    industries: ["sales"],
    categories: ["values-culture", "communication", "weakness"],
  },
  {
    id: "refl-gen-16",
    role: "reflection",
    text: "The wider lesson was about pace, because moving fast on the wrong thing cost us more than moving carefully.",
    categories: ["prioritisation", "failure", "pressure"],
  },
  {
    id: "refl-gen-17",
    role: "reflection",
    text: "In hindsight, the escalation I avoided would have saved everyone a great deal of trouble.",
    categories: ["weakness", "stakeholder", "failure"],
    frameworks: ["reflective"],
  },
  {
    id: "refl-gen-18",
    role: "reflection",
    text: "Working through that gave me a much clearer sense of when to ask for help.",
    seniority: ["student", "graduate", "junior", "mid"],
    categories: ["learning-quickly", "graduate", "weakness", "internship"],
    tones: ["conversational"],
  },
  {
    id: "refl-gen-19",
    role: "reflection",
    text: "Nothing about the outcome was luck, and I am careful not to describe it that way.",
    categories: ["success", "competency", "why-hire-you"],
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "refl-gen-20",
    role: "reflection",
    text: "Once I understood the constraint properly, the range of workable options actually got wider.",
    categories: ["innovation", "problem-solving", "ambiguity"],
  },
  {
    id: "refl-cs-01",
    role: "reflection",
    text: "Customers rarely wanted an explanation of the process; they wanted to know somebody had taken it on.",
    industries: ["customer-service", "retail"],
    categories: ["communication", "stakeholder", "values-culture"],
  },
  {
    id: "refl-gen-22",
    role: "reflection",
    text: "As a result I am far more comfortable saying that something is not yet decided.",
    categories: ["ambiguity", "communication", "weakness"],
    tones: ["conversational"],
  },
  {
    id: "refl-gen-23",
    role: "reflection",
    text: "Being wrong in public was uncomfortable, and it made the team noticeably more willing to raise their own mistakes.",
    seniority: ["lead", "manager", "executive"],
    categories: ["leadership", "failure", "values-culture", "management-role"],
  },
  {
    id: "refl-gen-24",
    role: "reflection",
    text: "Delegation is the part I had to learn deliberately, because doing everything myself felt safer at the time.",
    seniority: ["lead", "manager", "senior"],
    categories: ["weakness", "leadership", "management-role"],
    frameworks: ["reflective"],
  },
  {
    id: "refl-gen-25",
    role: "reflection",
    text: "For me the takeaway was that a process only survives if the people using it helped shape it.",
    categories: ["teamwork", "innovation", "leadership"],
  },
  {
    id: "refl-gen-26",
    role: "reflection",
    text: "Rather than treat it as a one-off, I looked for the same weakness elsewhere, and found it.",
    categories: ["initiative", "problem-solving", "innovation"],
    tones: ["confident"],
  },
  {
    id: "refl-gen-27",
    role: "reflection",
    text: "That was the point at which I stopped assuming silence meant agreement.",
    categories: ["communication", "stakeholder", "conflict"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "refl-gen-28",
    role: "reflection",
    text: "Now I ask the awkward question at the start, while there is still time to answer it.",
    categories: ["ambiguity", "communication", "initiative"],
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "refl-gen-29",
    role: "reflection",
    text: "Although the outcome was good, the route to it was less controlled than I would like, and I have tightened that since.",
    categories: ["weakness", "success", "competency"],
    frameworks: ["reflective"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "refl-gen-30",
    role: "reflection",
    text: "Learning to explain technical detail without jargon has been useful in every role I have had since.",
    industries: ["technology", "engineering", "science"],
    categories: ["communication", "technical-challenge", "learning-quickly"],
  },
  {
    id: "refl-gen-31",
    role: "reflection",
    text: "Much of what I now bring to {topic} came out of getting that particular thing wrong.",
    requires: ["topic"],
    categories: ["weakness", "learning-quickly", "failure"],
    frameworks: ["reflective"],
  },
  {
    id: "refl-gen-32",
    role: "reflection",
    text: "Practically speaking, it made me better at saying no early rather than apologising late.",
    categories: ["prioritisation", "pressure", "weakness"],
    tones: ["conversational", "confident"],
  },
  {
    id: "refl-edu-01",
    role: "reflection",
    text: "Every group I plan for now starts with the learners most likely to fall behind, which lifts the rest as well.",
    industries: ["education"],
    categories: ["adaptability", "communication", "leadership"],
  },
  {
    id: "refl-gen-34",
    role: "reflection",
    text: "Ultimately it taught me to separate the urgent from the merely loud.",
    categories: ["prioritisation", "pressure", "stakeholder"],
    tones: ["concise", "confident"],
    lengths: ["short", "standard"],
  },
  {
    id: "refl-gen-35",
    role: "reflection",
    text: "Genuinely, the most useful thing I did was ask the person who disagreed with me to explain why.",
    categories: ["feedback", "conflict", "communication"],
    tones: ["conversational"],
  },

  /* ---------------------------------------------------------------- */
  /* Industry-specialised                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "refl-tech-01",
    role: "reflection",
    text: "Since then I treat observability as part of the work, rather than as something added once it breaks.",
    industries: ["technology", "engineering"],
    categories: ["technical-challenge", "technical-role", "learning-quickly"],
    frameworks: ["technical", "reflective"],
  },
  {
    id: "refl-fin-01",
    role: "reflection",
    text: "Controls, I learned, are only as good as the point in the process where they sit.",
    industries: ["finance"],
    categories: ["competency", "problem-solving", "learning-quickly"],
  },
  {
    id: "refl-health-01",
    role: "reflection",
    text: "Patient safety framing turned what had been a process argument into a decision everyone could accept.",
    industries: ["healthcare"],
    categories: ["stakeholder", "conflict", "values-culture"],
  },
  {
    id: "refl-log-01",
    role: "reflection",
    text: "Chains only move at the speed of their slowest handover, and that is where I look first now.",
    industries: ["logistics", "manufacturing"],
    categories: ["problem-solving", "learning-quickly"],
  },
  {
    id: "refl-creative-01",
    role: "reflection",
    text: "Getting the brief agreed in writing is the least creative part of the job and easily the most valuable.",
    industries: ["creative"],
    categories: ["stakeholder", "communication", "conflict"],
    tones: ["confident"],
  },
]);
