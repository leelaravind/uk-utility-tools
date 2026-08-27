import { blocks, type ContentBlock } from "./types";

/**
 * Goal blocks — "where do you see yourself", "what are you looking for next".
 *
 * The failure mode in this category is an answer that either flatters the
 * employer with a goal nobody believes, or describes an ambition that quietly
 * involves leaving. Every block here points forward honestly and ties the
 * direction to the role rather than past it. Student and graduate variants sit
 * alongside senior and management variants, and they differ in horizon and
 * scope rather than in wording.
 *
 * Nothing here invents a timescale, a salary band, a title at a named employer
 * or a qualification: where a specific milestone would help, the block emits a
 * `[[prompt]]` for the visitor's own.
 *
 * Adding more: append a `ContentBlock` to `GOAL_FRAMES`, take the next free
 * `goal-` id, list every `{var}` you use in `requires`, keep to one
 * `[[prompt]]` per block, and start with a fresh word — no more than two blocks
 * in this file should begin with the same word.
 */

/** Forward-looking direction, tied to the role rather than away from it. */
export const GOAL_FRAMES: ContentBlock[] = blocks([
  {
    id: "goal-01",
    role: "goal-frame",
    text: "Over the next stage of my career I want to become the person a team relies on for {topic}, which is a narrower ambition than it sounds.",
    requires: ["topic"],
    categories: ["career-goals", "motivation"],
    weight: 1.3,
  },
  {
    id: "goal-02",
    role: "goal-frame",
    text: "My aim is to get properly good at {skill} rather than adequate at a longer list of things.",
    requires: ["skill"],
    categories: ["career-goals", "motivation"],
  },
  {
    id: "goal-03",
    role: "goal-frame",
    text: "Where I want to be is deep enough in this work that I can see a problem coming before it arrives.",
    categories: ["career-goals", "motivation"],
  },
  {
    id: "goal-04",
    role: "goal-frame",
    text: "Honestly, my main goal is to stop being the least experienced person in the room on {topic}, and this {role} would move me towards that.",
    requires: ["topic", "role"],
    categories: ["career-goals", "graduate"],
    seniority: ["graduate", "junior"],
    tones: ["conversational"],
  },
  {
    id: "goal-05",
    role: "goal-frame",
    text: "Progression matters to me, but I would rather earn a wider remit by being good at this job than by moving on before I have finished anything.",
    categories: ["career-goals", "motivation"],
    tones: ["professional"],
  },
  {
    id: "goal-06",
    role: "goal-frame",
    text: "In the near term I want to contribute at the level {company} expects without needing much supervision, and after that to take on [[the responsibility you would want next]].",
    requires: ["company"],
    categories: ["career-goals", "motivation"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "goal-07",
    role: "goal-frame",
    text: "Long term I would like to be leading a team doing this kind of work, and the route there is to be genuinely good at the work first.",
    categories: ["career-goals", "leadership"],
    seniority: ["mid", "senior"],
  },
  {
    id: "goal-08",
    role: "goal-frame",
    text: "Management is the direction I want, and I am clear that it means being accountable for other people's results rather than my own.",
    categories: ["career-goals", "management-role", "leadership"],
    seniority: ["senior", "lead", "manager"],
    tones: ["confident", "professional"],
  },
  {
    id: "goal-09",
    role: "goal-frame",
    text: "Technical depth rather than a management track is what I want, and I am saying so plainly because each path needs different things from an employer.",
    categories: ["career-goals", "technical-role"],
    seniority: ["mid", "senior", "lead"],
    industries: ["technology", "engineering", "science"],
  },
  {
    id: "goal-10",
    role: "goal-frame",
    text: "Becoming the person others come to about {skill} is the goal, and that only happens by doing the work for long enough to be trusted.",
    requires: ["skill"],
    categories: ["career-goals", "motivation"],
  },
  {
    id: "goal-11",
    role: "goal-frame",
    text: "Studying gave me the theory, and my goal now is to find out which parts of it survive contact with real work.",
    categories: ["career-goals", "graduate", "internship"],
    seniority: ["student", "graduate"],
  },
  {
    id: "goal-12",
    role: "goal-frame",
    text: "Qualifying in this field is my immediate priority, and I have chosen [[the qualification or registration you are working towards]] deliberately rather than by default.",
    categories: ["career-goals", "graduate"],
    seniority: ["student", "graduate", "junior"],
  },
  {
    id: "goal-13",
    role: "goal-frame",
    text: "Building a career in {industry} rather than a series of jobs is what I am trying to do, which is why the choice of employer matters so much.",
    requires: ["industry"],
    categories: ["career-goals", "why-this-company"],
  },
  {
    id: "goal-14",
    role: "goal-frame",
    text: "A distant horizon is difficult to be honest about, so I would rather tell you what I want to be able to do by then than what title I want to hold.",
    categories: ["career-goals", "motivation"],
    tones: ["professional", "conversational"],
  },
  {
    id: "goal-15",
    role: "goal-frame",
    text: "Getting to the point where I am setting direction rather than executing it is the ambition, and I recognise that is several steps away.",
    categories: ["career-goals", "leadership"],
    seniority: ["mid", "senior"],
  },
  {
    id: "goal-16",
    role: "goal-frame",
    text: "Clinical progression is well defined in this field, and my goal is to move through it properly rather than quickly.",
    categories: ["career-goals", "motivation"],
    industries: ["healthcare"],
  },
  {
    id: "goal-17",
    role: "goal-frame",
    text: "Professional registration is the milestone I am working towards, and the experience this {role} offers is directly relevant to it.",
    requires: ["role"],
    categories: ["career-goals", "why-this-job"],
    industries: ["engineering", "construction"],
  },
  {
    id: "goal-18",
    role: "goal-frame",
    text: "Being qualified is one thing and being confident is another, and my goal is the second of those.",
    categories: ["career-goals", "graduate"],
    seniority: ["graduate", "junior"],
    tones: ["conversational"],
  },
  {
    id: "goal-19",
    role: "goal-frame",
    text: "Partnership or its equivalent is a long way off, and I would rather build the case for it than talk about it.",
    categories: ["career-goals", "motivation"],
    industries: ["legal", "finance"],
    seniority: ["mid", "senior"],
  },
  {
    id: "goal-20",
    role: "goal-frame",
    text: "Teaching others is where I expect to end up, because explaining the work is how I understand it best.",
    categories: ["career-goals", "leadership"],
    industries: ["education", "healthcare", "science"],
  },
  {
    id: "goal-21",
    role: "goal-frame",
    text: "Running my own function eventually is the honest answer, and I would want to have done every part of it myself first.",
    categories: ["career-goals", "management-role"],
    seniority: ["senior", "lead", "manager", "executive"],
    tones: ["confident"],
  },
  {
    id: "goal-22",
    role: "goal-frame",
    text: "Commercially I want to understand the whole business rather than only my corner of it, and this {role} sits close enough to the rest to allow that.",
    requires: ["role"],
    categories: ["career-goals", "why-this-job"],
  },
  {
    id: "goal-23",
    role: "goal-frame",
    text: "Nothing about my goals requires me to leave a job like this one, which I mention because that is usually the real question.",
    categories: ["career-goals", "motivation"],
    tones: ["conversational"],
  },
  {
    id: "goal-24",
    role: "goal-frame",
    text: "Ambition without a plan is only a wish, so mine is specific: [[the capability you want to have built by the end of your next job]].",
    categories: ["career-goals", "motivation"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "goal-25",
    role: "goal-frame",
    text: "If the next stage goes well, I would expect to be doing more of {topic} and less of the work I have already mastered.",
    requires: ["topic"],
    categories: ["career-goals", "motivation"],
  },
  {
    id: "goal-26",
    role: "goal-frame",
    text: "Stability has its own value, and I am not looking for a stepping stone, but for a job I can grow inside.",
    categories: ["career-goals", "why-this-company"],
    tones: ["professional"],
  },
  {
    id: "goal-27",
    role: "goal-frame",
    text: "Short answer: to be the {role} that other teams actually want to work with.",
    requires: ["role"],
    categories: ["career-goals", "motivation"],
    tones: ["concise"],
    lengths: ["short"],
  },
  {
    id: "goal-28",
    role: "goal-frame",
    text: "Broadening into {topic} is the direction, and I would rather do that inside an organisation I already understand than by starting again somewhere new.",
    requires: ["topic"],
    categories: ["career-goals", "why-this-company"],
    seniority: ["mid", "senior", "lead"],
  },
]);
