import { blocks, type ContentBlock } from "./types";

/**
 * Transition blocks — the short connective sentences between sections.
 *
 * A transition carries the reader from one part of an answer to the next
 * (situation into task, task into action, action into result) without adding
 * new claims. They are the shortest blocks in the corpus by design, and they
 * are the ones most likely to be dropped entirely when the requested answer
 * length is `short`.
 *
 * Because a transition asserts nothing about the candidate, it must be
 * genuinely content-free: no figures, no timeframes, no outcomes. If a sentence
 * you are drafting says something true about the work, it belongs in
 * `actions.ts` or `results.ts` instead.
 *
 * ## Adding a transition
 * - Unique id prefixed `trans-`, and `role: "transition"`.
 * - Keep it to one clause or one short sentence, and end it with a full stop so
 *   it joins cleanly to whatever follows.
 * - Declare every `{var}` you use in `requires`.
 * - Vary the first word. These sit next to each other more often than any other
 *   block role, so repetition here is the most audible.
 */
export const TRANSITIONS: ContentBlock[] = blocks([
  {
    id: "trans-gen-01",
    role: "transition",
    text: "That gave me a clear starting point.",
    lengths: ["short", "standard", "detailed"],
    tones: ["concise", "professional"],
    weight: 2,
  },
  {
    id: "trans-gen-02",
    role: "transition",
    text: "From there the work fell into a natural order.",
    lengths: ["standard", "detailed"],
    frameworks: ["star", "car"],
  },
  {
    id: "trans-gen-03",
    role: "transition",
    text: "Once that was settled, the rest followed quickly.",
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-04",
    role: "transition",
    text: "The next step mattered rather more than the first.",
    lengths: ["standard", "detailed"],
    tones: ["professional"],
  },
  {
    id: "trans-gen-05",
    role: "transition",
    text: "With that agreed, I could move on to the harder part.",
    lengths: ["standard", "detailed"],
    frameworks: ["star", "technical"],
  },
  {
    id: "trans-gen-06",
    role: "transition",
    text: "So the approach I took was deliberate rather than reactive.",
    tones: ["confident"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-07",
    role: "transition",
    text: "Before any of that could work, one thing had to change.",
    lengths: ["standard", "detailed"],
    categories: ["problem-solving", "challenge"],
  },
  {
    id: "trans-gen-08",
    role: "transition",
    text: "What happened next is the part I would highlight.",
    tones: ["conversational"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-09",
    role: "transition",
    text: "Having set the scene, here is what I actually did.",
    tones: ["conversational", "concise"],
    lengths: ["standard", "detailed"],
    frameworks: ["star"],
  },
  {
    id: "trans-gen-10",
    role: "transition",
    text: "It did not stop there.",
    tones: ["concise", "confident"],
    lengths: ["short", "standard", "detailed"],
  },
  {
    id: "trans-gen-11",
    role: "transition",
    text: "In practice that meant getting specific very quickly.",
    lengths: ["standard", "detailed"],
    tones: ["professional"],
  },
  {
    id: "trans-gen-12",
    role: "transition",
    text: "Meanwhile the day job still had to be done.",
    categories: ["pressure", "prioritisation", "deadlines"],
    tones: ["conversational"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-13",
    role: "transition",
    text: "At that point the priority became obvious.",
    categories: ["prioritisation", "ambiguity"],
    lengths: ["short", "standard", "detailed"],
    tones: ["concise"],
  },
  {
    id: "trans-gen-14",
    role: "transition",
    text: "Then came the part that needed other people.",
    categories: ["teamwork", "stakeholder", "communication"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-15",
    role: "transition",
    text: "Alongside that, I kept the wider group informed.",
    categories: ["communication", "stakeholder"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-16",
    role: "transition",
    text: "By then the picture had changed again.",
    categories: ["adaptability", "ambiguity"],
    lengths: ["standard", "detailed"],
    tones: ["concise"],
  },
  {
    id: "trans-gen-17",
    role: "transition",
    text: "None of that would have held without the follow-up.",
    categories: ["competency", "leadership"],
    lengths: ["standard", "detailed"],
    tones: ["confident"],
  },
  {
    id: "trans-gen-18",
    role: "transition",
    text: "Where it got interesting was the response.",
    tones: ["conversational"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-19",
    role: "transition",
    text: "That is the context; the actions matter more.",
    tones: ["concise", "confident"],
    lengths: ["short", "standard"],
    frameworks: ["car", "star"],
  },
  {
    id: "trans-gen-20",
    role: "transition",
    text: "As the work progressed, the emphasis shifted.",
    categories: ["adaptability"],
    lengths: ["standard", "detailed"],
    tones: ["professional"],
  },
  {
    id: "trans-gen-21",
    role: "transition",
    text: "Crucially, I did not do any of this alone.",
    categories: ["teamwork", "leadership", "values-culture"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-22",
    role: "transition",
    text: "Rather than describe every step, I will pick out the ones that counted.",
    tones: ["concise", "conversational"],
    lengths: ["short", "standard"],
  },
  {
    id: "trans-gen-23",
    role: "transition",
    text: "Several things then happened in parallel.",
    lengths: ["standard", "detailed"],
    tones: ["professional", "concise"],
  },
  {
    id: "trans-gen-24",
    role: "transition",
    text: "Because of that, the next decision was much easier to make.",
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-25",
    role: "transition",
    text: "Only after that did the underlying issue become visible.",
    categories: ["problem-solving", "technical-challenge"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-26",
    role: "transition",
    text: "Naturally, not everything went to plan.",
    categories: ["failure", "adaptability"],
    tones: ["conversational"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-27",
    role: "transition",
    text: "Looking at the outcome is the fairest way to judge it.",
    frameworks: ["star", "car", "technical"],
    lengths: ["standard", "detailed"],
    tones: ["confident"],
  },
  {
    id: "trans-gen-28",
    role: "transition",
    text: "Once the immediate pressure eased, I turned to prevention.",
    categories: ["pressure", "initiative", "problem-solving"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-29",
    role: "transition",
    text: "For the wider team, the effect took a little longer to show.",
    categories: ["teamwork", "leadership"],
    seniority: ["senior", "lead", "manager", "executive"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "trans-gen-30",
    role: "transition",
    text: "This is where {skill} did most of the work.",
    requires: ["skill"],
    categories: ["strengths", "technical-challenge", "why-hire-you"],
    lengths: ["standard", "detailed"],
    tones: ["confident"],
  },
]);
