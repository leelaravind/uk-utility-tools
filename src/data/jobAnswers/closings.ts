import { blocks, type ContentBlock } from "./types";

/**
 * Closing blocks — the sentence that ties the example back to this application.
 *
 * A closing answers the question the interviewer has not asked out loud: "and
 * why are you telling me this?". It links the example to the {role}, the
 * {company} or the {skill} the visitor entered, and it is the only place in an
 * assembled answer where looking forward is appropriate.
 *
 * As everywhere else in this corpus, a closing may not invent a fact. It never
 * claims an award, a promotion, a qualification or a named employer, and it
 * never puts a figure on anything; specifics arrive from a `{variable}` or a
 * `[[bracketed prompt]]`.
 *
 * ## Adding a closing
 * - Unique id prefixed `close-`, and `role: "closing"`.
 * - Declare every `{var}` you use in `requires`. Blocks naming `{company}` or
 *   `{role}` are the strongest closings, but they are discarded when the visitor
 *   left those fields empty, so keep plenty of variable-free ones too.
 * - Avoid restating the result. The result block has already done that; a
 *   closing that repeats it makes the answer feel padded.
 */
export const CLOSINGS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* Tied to what the visitor entered                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "close-role-01",
    role: "closing",
    text: "That is the kind of work I would want to bring to the {role} position.",
    requires: ["role"],
    categories: ["why-this-job", "why-hire-you", "behavioural", "competency"],
    tones: ["professional"],
    weight: 2,
  },
  {
    id: "close-role-02",
    role: "closing",
    text: "The {role} role appears to need exactly that combination, which is a large part of why I applied.",
    requires: ["role"],
    categories: ["why-this-job", "motivation", "why-hire-you"],
    frameworks: ["motivation", "direct"],
  },
  {
    id: "close-company-01",
    role: "closing",
    text: "It is also why {company} interests me, because the same problem shows up in the work you describe.",
    requires: ["company"],
    categories: ["why-this-company", "motivation", "values-culture"],
    frameworks: ["motivation"],
  },
  {
    id: "close-company-02",
    role: "closing",
    text: "Joining {company} would let me do more of that and rather less of the firefighting around it.",
    requires: ["company"],
    categories: ["why-this-company", "motivation", "career-goals"],
    tones: ["conversational"],
  },
  {
    id: "close-skill-01",
    role: "closing",
    text: "If {skill} is what this role needs most, that example is where I would point you.",
    requires: ["skill"],
    categories: ["strengths", "why-hire-you", "competency"],
    frameworks: ["direct"],
    tones: ["confident"],
  },
  {
    id: "close-skills-01",
    role: "closing",
    text: "Bringing {skills} to your team is the straightforward part; the judgement behind them is what I would actually be offering.",
    requires: ["skills"],
    categories: ["strengths", "why-hire-you"],
    frameworks: ["direct"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "close-ach-01",
    role: "closing",
    text: "If you want the headline, it is {achievement}, and I am happy to talk through how it came about.",
    requires: ["achievement"],
    categories: ["success", "why-hire-you", "strengths"],
    tones: ["confident", "conversational"],
  },
  {
    id: "close-exp-01",
    role: "closing",
    text: "Alongside that example sits the rest of my background: {experience}.",
    requires: ["experience"],
    categories: ["tell-me-about-yourself", "why-hire-you"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "close-ind-var-01",
    role: "closing",
    text: "Working somewhere that takes the {industry} side of this seriously matters to me, and that is part of why I applied.",
    requires: ["industry"],
    categories: ["why-this-company", "motivation", "values-culture"],
    frameworks: ["motivation"],
  },
  {
    id: "close-sen-var-01",
    role: "closing",
    text: "For a {seniority} role like this one, that is the level of ownership I would expect of myself.",
    requires: ["seniority"],
    categories: ["why-hire-you", "career-goals", "competency"],
    tones: ["confident"],
  },

  /* ---------------------------------------------------------------- */
  /* General                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "close-gen-01",
    role: "closing",
    text: "So the short answer is that I do this work carefully, and I finish it.",
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
    categories: ["why-hire-you", "strengths", "competency"],
  },
  {
    id: "close-gen-02",
    role: "closing",
    text: "What I would bring is a willingness to sit with the boring detail until it makes sense.",
    categories: ["strengths", "why-hire-you", "problem-solving"],
  },
  {
    id: "close-gen-03",
    role: "closing",
    text: "Happy to go deeper into any part of that if it would be useful.",
    tones: ["conversational", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "close-gen-04",
    role: "closing",
    text: "The same approach is what I would use here, adapted to how your team already works.",
    categories: ["why-this-job", "adaptability", "why-hire-you"],
    tones: ["professional"],
  },
  {
    id: "close-gen-06",
    role: "closing",
    text: "Given what the job description emphasises, that experience feels directly relevant.",
    categories: ["why-this-job", "why-hire-you"],
    tones: ["professional", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "close-gen-07",
    role: "closing",
    text: "Ultimately I want to be somewhere the work is done properly, and that is what drew me to this one.",
    categories: ["motivation", "values-culture", "career-goals"],
    frameworks: ["motivation"],
  },
  {
    id: "close-gen-08",
    role: "closing",
    text: "That is the honest version, including the part I got wrong.",
    categories: ["failure", "weakness", "feedback"],
    frameworks: ["reflective"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "close-gen-09",
    role: "closing",
    text: "Whether or not the problem here looks the same, the way I would approach it would not change much.",
    categories: ["adaptability", "problem-solving", "why-hire-you"],
    tones: ["confident"],
  },
  {
    id: "close-gen-10",
    role: "closing",
    text: "Since then I have looked for roles where that kind of improvement is welcomed rather than merely tolerated.",
    categories: ["motivation", "career-goals", "values-culture"],
    frameworks: ["motivation"],
  },
  {
    id: "close-gen-11",
    role: "closing",
    text: "Nothing about that is unusual, and that is rather the point: it is simply how I work.",
    categories: ["strengths", "competency", "why-hire-you"],
    tones: ["conversational"],
  },
  {
    id: "close-gen-12",
    role: "closing",
    text: "In short, I would rather solve the cause than manage the symptom, and I think that fits what you are asking for.",
    categories: ["problem-solving", "why-hire-you", "strengths"],
    tones: ["concise", "confident"],
    lengths: ["short", "standard"],
  },
  {
    id: "close-gen-13",
    role: "closing",
    text: "Long term, I want to keep working on problems of that shape, with more scope than I have now.",
    categories: ["career-goals", "motivation"],
    frameworks: ["motivation"],
  },
  {
    id: "close-gen-14",
    role: "closing",
    text: "Right now the thing I most want is a role where I can carry that responsibility properly.",
    categories: ["career-goals", "motivation", "why-this-job"],
  },
  {
    id: "close-gen-15",
    role: "closing",
    text: "As for what I would do here, I would start by listening in exactly the same way.",
    categories: ["why-this-job", "adaptability", "learning-quickly"],
    tones: ["professional"],
  },
  {
    id: "close-gen-17",
    role: "closing",
    text: "Honestly, that is the work I enjoy most, and I would like a good deal more of it.",
    categories: ["motivation", "values-culture", "career-goals"],
    tones: ["conversational"],
  },
  {
    id: "close-gen-18",
    role: "closing",
    text: "Because the challenges you have described are familiar ones, I think I could be useful quickly.",
    categories: ["why-this-job", "why-hire-you", "learning-quickly"],
    tones: ["confident"],
  },
  {
    id: "close-gen-22",
    role: "closing",
    text: "Learning quickly in unfamiliar territory is the part I would rely on here, because that is what the example shows.",
    seniority: ["student", "graduate", "junior"],
    categories: ["graduate", "learning-quickly", "internship", "why-hire-you"],
  },
  {
    id: "close-gen-23",
    role: "closing",
    text: "Leading that way is what I would want to be judged on in this role.",
    seniority: ["lead", "manager", "executive"],
    categories: ["leadership", "management-role", "why-hire-you"],
    tones: ["confident"],
  },

  /* ---------------------------------------------------------------- */
  /* Industry-specialised                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "close-tech-01",
    role: "closing",
    text: "Technical detail aside, what matters is that the system was easier to work on afterwards, and that is what I would aim for here.",
    industries: ["technology", "engineering"],
    categories: ["technical-role", "technical-challenge", "why-hire-you"],
    frameworks: ["technical"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "close-health-01",
    role: "closing",
    text: "Safe and consistent care is the outcome I care about, and it is what I would bring to this team.",
    industries: ["healthcare"],
    categories: ["values-culture", "motivation", "why-hire-you"],
  },
  {
    id: "close-fin-01",
    role: "closing",
    text: "Accurate reporting that people actually trust is what I would want to be known for here.",
    industries: ["finance"],
    categories: ["values-culture", "why-hire-you", "competency"],
  },
  {
    id: "close-edu-01",
    role: "closing",
    text: "Every learner having a way into the work is the standard I would hold myself to in this role.",
    industries: ["education"],
    categories: ["values-culture", "why-hire-you", "motivation"],
  },
  {
    id: "close-cs-01",
    role: "closing",
    text: "Customers rarely remember the process, and they do remember whether somebody sorted it out for them.",
    industries: ["customer-service", "retail", "hospitality"],
    categories: ["values-culture", "why-hire-you", "communication"],
    tones: ["conversational"],
  },
  {
    id: "close-sales-01",
    role: "closing",
    text: "An honest pipeline and a client who stays is what I would far rather be judged on.",
    industries: ["sales"],
    categories: ["values-culture", "why-hire-you", "competency"],
    tones: ["confident"],
  },
  {
    id: "close-public-01",
    role: "closing",
    text: "Decisions that can be explained afterwards are worth more than fast ones, and that is how I would work here.",
    industries: ["public-sector", "legal", "nonprofit"],
    categories: ["values-culture", "competency", "why-hire-you"],
  },
]);
