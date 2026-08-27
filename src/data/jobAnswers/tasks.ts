import { blocks, type ContentBlock } from "./types";

/**
 * Task blocks — what the candidate was actually responsible for.
 *
 * A task sentence answers "and what was your bit?". It sits between the
 * situation and the actions, and its whole value is that it makes the
 * candidate's ownership explicit without yet describing what they did.
 *
 * Same hard rule as everywhere in this corpus: no invented figures, headcounts,
 * durations or named metrics. If a task needs a number to make sense, it takes
 * one from a `{variable}` or asks for it with a `[[bracketed prompt]]`.
 *
 * ## Adding a task
 * - Unique id prefixed `task-`, and `role: "task"`.
 * - Declare every `{var}` you use in `requires`.
 * - Say what "done" meant, or what constraint was fixed. Vague ownership
 *   ("I had to sort it out") is weaker than a stated success condition.
 * - Blocks that assume authority to set direction belong to
 *   `seniority: ["lead", "manager", "executive"]`; blocks about learning the
 *   ground belong to `["student", "graduate", "junior"]`.
 */
export const TASKS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* General                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "task-gen-01",
    role: "task",
    text: "My job was to get {topic} back on track without disrupting everything else that was running.",
    requires: ["topic"],
    categories: ["challenge", "problem-solving", "pressure"],
    frameworks: ["star"],
    tones: ["professional"],
    weight: 2,
  },
  {
    id: "task-gen-02",
    role: "task",
    text: "The responsibility for sorting it out landed with me, along with a clear expectation that it would not happen twice.",
    categories: ["failure", "challenge", "competency"],
    frameworks: ["star", "reflective"],
  },
  {
    id: "task-gen-03",
    role: "task",
    text: "What I needed to do first was understand the real cause, rather than propose a fix to the symptom.",
    categories: ["problem-solving", "technical-challenge", "ambiguity"],
  },
  {
    id: "task-gen-04",
    role: "task",
    text: "I was asked for a workable answer rather than a perfect one, and for an honest view of what it would cost us.",
    categories: ["pressure", "deadlines", "prioritisation"],
    tones: ["professional"],
  },
  {
    id: "task-gen-05",
    role: "task",
    text: "Success meant the people affected could carry on working while the underlying issue was dealt with.",
    categories: ["problem-solving", "stakeholder", "leadership"],
  },
  {
    id: "task-gen-06",
    role: "task",
    text: "Given the timescales involved, my brief was to reduce the risk first and improve the process afterwards.",
    categories: ["pressure", "prioritisation", "deadlines"],
  },
  {
    id: "task-gen-07",
    role: "task",
    text: "Ownership of the outcome sat with me, even though most of the work depended on other teams.",
    categories: ["stakeholder", "leadership", "teamwork"],
    tones: ["confident"],
  },
  {
    id: "task-gen-08",
    role: "task",
    text: "Nobody expected me to solve it single-handed, but they did expect me to be the one holding the thread.",
    categories: ["leadership", "teamwork", "initiative"],
    tones: ["conversational"],
  },
  {
    id: "task-gen-09",
    role: "task",
    text: "As the person closest to the detail, I had to translate it for people who only needed the decision.",
    categories: ["communication", "stakeholder", "technical-challenge"],
  },
  {
    id: "task-gen-10",
    role: "task",
    text: "Alongside my normal workload, I took responsibility for {topic} until it was properly stable.",
    requires: ["topic"],
    categories: ["initiative", "pressure", "prioritisation"],
  },
  {
    id: "task-gen-11",
    role: "task",
    text: "The goal was agreed quickly, which left the harder question of how on earth to reach it.",
    categories: ["ambiguity", "problem-solving"],
    tones: ["conversational"],
  },
  {
    id: "task-gen-12",
    role: "task",
    text: "Both the immediate problem and the lack of any early warning had to be dealt with.",
    categories: ["problem-solving", "initiative", "innovation"],
  },
  {
    id: "task-gen-13",
    role: "task",
    text: "Rather than wait to be told, I set out what I thought needed to happen and asked for a decision.",
    categories: ["initiative", "leadership", "ambiguity"],
    tones: ["confident"],
  },
  {
    id: "task-gen-14",
    role: "task",
    text: "Part of the task was rebuilding confidence, because the previous attempt had gone badly.",
    categories: ["leadership", "failure", "stakeholder"],
  },
  {
    id: "task-gen-15",
    role: "task",
    text: "Keeping the customer informed mattered every bit as much as fixing the problem itself.",
    categories: ["communication", "stakeholder"],
  },
  {
    id: "task-gen-16",
    role: "task",
    text: "Once the scope was clear, my responsibility was to sequence the work so nothing sat blocked.",
    categories: ["prioritisation", "deadlines", "leadership"],
  },
  {
    id: "task-gen-17",
    role: "task",
    text: "I needed to bring {skills} to bear on a problem that had already defeated the obvious approach.",
    requires: ["skills"],
    categories: ["strengths", "problem-solving", "why-hire-you"],
    tones: ["confident"],
  },
  {
    id: "task-gen-18",
    role: "task",
    text: "Making the case to people who could say no was as much of the task as the work itself.",
    categories: ["stakeholder", "communication", "initiative"],
  },
  {
    id: "task-gen-19",
    role: "task",
    text: "Because the deadline was genuinely fixed, the only variable left was what we chose to include.",
    categories: ["deadlines", "prioritisation", "pressure"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "task-gen-20",
    role: "task",
    text: "Whatever we agreed had to be something the team could keep doing after I moved on.",
    categories: ["leadership", "innovation", "values-culture"],
  },
  {
    id: "task-gen-21",
    role: "task",
    text: "Setting the direction was mine to do, and I could not delegate the difficult conversation that came with it.",
    seniority: ["lead", "manager", "executive"],
    categories: ["leadership", "management-role", "conflict"],
    tones: ["confident"],
  },
  {
    id: "task-gen-22",
    role: "task",
    text: "Being new, my first responsibility was to learn the ground properly before suggesting changes to it.",
    seniority: ["student", "graduate", "junior"],
    categories: ["graduate", "learning-quickly", "internship"],
  },
  {
    id: "task-gen-23",
    role: "task",
    text: "Holding the standard was my job, even when letting something through would have been far easier.",
    categories: ["values-culture", "conflict", "competency"],
  },
  {
    id: "task-gen-24",
    role: "task",
    text: "For the wider programme to work, my piece had to land on time and be genuinely finished.",
    categories: ["deadlines", "teamwork", "competency"],
  },
  {
    id: "task-gen-25",
    role: "task",
    text: "There was an expectation that I would report back honestly, including anything that had gone wrong.",
    categories: ["communication", "values-culture", "failure"],
    tones: ["professional"],
  },

  /* ---------------------------------------------------------------- */
  /* Industry-specialised                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "task-tech-01",
    role: "task",
    text: "Making the deployment safe and repeatable was the target, not stacking more features on top of it.",
    industries: ["technology"],
    categories: ["technical-challenge", "technical-role", "innovation"],
    frameworks: ["technical", "star"],
  },
  {
    id: "task-tech-02",
    role: "task",
    text: "Diagnosing the failure without taking the service down for everyone was the constraint I had to work within.",
    industries: ["technology", "engineering"],
    categories: ["technical-challenge", "pressure", "problem-solving"],
    frameworks: ["technical"],
  },
  {
    id: "task-fin-01",
    role: "task",
    text: "Explaining the variance and preventing it recurring were both expected of me, in that order.",
    industries: ["finance"],
    categories: ["problem-solving", "competency", "deadlines"],
  },
  {
    id: "task-fin-02",
    role: "task",
    text: "Evidence had to stand up to review, so the task was as much about documentation as about analysis.",
    industries: ["finance", "legal"],
    categories: ["competency", "stakeholder", "communication"],
    tones: ["professional"],
  },
  {
    id: "task-health-01",
    role: "task",
    text: "Protecting patient safety came first, and any process change had to fit around that rather than the reverse.",
    industries: ["healthcare"],
    categories: ["values-culture", "prioritisation", "stakeholder"],
  },
  {
    id: "task-retail-01",
    role: "task",
    text: "Keeping the shop trading while we corrected the underlying issue was non-negotiable.",
    industries: ["retail", "hospitality"],
    categories: ["pressure", "prioritisation"],
    tones: ["concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "task-edu-01",
    role: "task",
    text: "Reaching the learners who were struggling, without holding back the rest, was what I had to solve.",
    industries: ["education"],
    categories: ["adaptability", "communication", "challenge"],
  },
  {
    id: "task-public-01",
    role: "task",
    text: "Decisions needed to be defensible, so recording the reasoning as I went was part of the task, not an extra.",
    industries: ["public-sector", "legal"],
    categories: ["competency", "stakeholder", "values-culture"],
  },
  {
    id: "task-log-01",
    role: "task",
    text: "Restoring service levels mattered, and so did establishing which part of the chain had actually slipped.",
    industries: ["logistics"],
    categories: ["problem-solving", "pressure", "stakeholder"],
  },
  {
    id: "task-mfg-01",
    role: "task",
    text: "Bringing the line back within specification was the immediate task, with root cause to follow.",
    industries: ["manufacturing"],
    categories: ["problem-solving", "technical-challenge", "pressure"],
  },
  {
    id: "task-constr-01",
    role: "task",
    text: "Resequencing the works without losing the completion date fell to me.",
    industries: ["construction"],
    categories: ["deadlines", "adaptability", "prioritisation"],
    tones: ["concise", "confident"],
    lengths: ["short", "standard"],
  },
  {
    id: "task-creative-01",
    role: "task",
    text: "Getting agreement on a single brief was the real task, and the design work followed easily from it.",
    industries: ["creative"],
    categories: ["stakeholder", "communication", "conflict"],
  },
  {
    id: "task-sales-01",
    role: "task",
    text: "Qualifying the pipeline honestly was my responsibility, even where that meant reporting worse coverage than expected.",
    industries: ["sales"],
    categories: ["values-culture", "communication", "competency"],
    tones: ["confident"],
  },
  {
    id: "task-cs-01",
    role: "task",
    text: "Resolving the immediate complaints was expected of me; finding out why they kept arriving was the part I chose to add.",
    industries: ["customer-service", "retail"],
    categories: ["initiative", "problem-solving", "communication"],
  },
  {
    id: "task-science-01",
    role: "task",
    text: "Establishing whether the result was real or an artefact of the method was the question I had to answer.",
    industries: ["science"],
    categories: ["technical-challenge", "problem-solving", "ambiguity"],
    frameworks: ["technical", "star"],
  },
]);
