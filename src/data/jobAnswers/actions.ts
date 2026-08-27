import { blocks, type ContentBlock } from "./types";

/**
 * Action blocks — the heart of a STAR or CAR answer.
 *
 * Actions are what the candidate personally did, in sequence, in the first
 * person. They should be concrete enough that an interviewer could picture the
 * work: which conversation, which check, which thing was removed. Several
 * action blocks are normally joined into one paragraph, so each must read
 * naturally next to another.
 *
 * The hard rule applies most sharply here: no invented figures, headcounts,
 * durations or named metrics. An action describes method, never a fabricated
 * measurement of it.
 *
 * ## Adding an action
 * - Unique id prefixed `act-`, and `role: "action"`.
 * - Declare every `{var}` you use in `requires`.
 * - Lead with the verb or the circumstance, and keep the first word varied.
 *   A file full of "I did X" sentences produces a monotonous paragraph.
 * - Actions that assume authority over other people's work should carry
 *   `seniority: ["lead", "manager", "executive"]`.
 */
export const ACTIONS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* Diagnose and understand                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "act-gen-01",
    role: "action",
    text: "First I mapped out where the work actually went, rather than where we all assumed it went.",
    categories: ["problem-solving", "initiative", "innovation"],
    frameworks: ["star", "car"],
    tones: ["professional"],
    weight: 2,
  },
  {
    id: "act-gen-02",
    role: "action",
    text: "Before changing anything, I spoke to the people doing the work and wrote down exactly what they told me.",
    categories: ["communication", "problem-solving", "stakeholder"],
    frameworks: ["star", "car"],
  },
  {
    id: "act-gen-03",
    role: "action",
    text: "Once the picture was clear, I split the problem into the part we could fix immediately and the part that needed a proper plan.",
    categories: ["problem-solving", "prioritisation", "pressure"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "act-gen-04",
    role: "action",
    text: "Rather than escalate straight away, I tried to settle it at the level where the work actually sat.",
    categories: ["conflict", "initiative", "stakeholder"],
  },
  {
    id: "act-gen-05",
    role: "action",
    text: "I set up a short standing check-in so blockers surfaced before they turned into delays.",
    categories: ["teamwork", "deadlines", "communication"],
  },
  {
    id: "act-gen-06",
    role: "action",
    text: "Working through the detail line by line was tedious, and it was the only way to find the inconsistency.",
    categories: ["problem-solving", "technical-challenge"],
    tones: ["professional"],
  },
  {
    id: "act-gen-07",
    role: "action",
    text: "To stop the guesswork, I agreed a single definition of done with everyone who had a say in it.",
    categories: ["communication", "ambiguity", "stakeholder"],
  },
  {
    id: "act-gen-08",
    role: "action",
    text: "Having listened to both sides, I put the disagreement in writing so that at least we were arguing about the same thing.",
    categories: ["conflict", "communication", "teamwork"],
  },
  {
    id: "act-gen-09",
    role: "action",
    text: "My next step was to test the smallest possible change before committing to the larger one.",
    categories: ["problem-solving", "innovation", "technical-challenge"],
  },
  {
    id: "act-gen-10",
    role: "action",
    text: "Where a step was genuinely unnecessary, I removed it rather than trying to make it faster.",
    categories: ["innovation", "initiative", "problem-solving"],
    tones: ["confident"],
  },
  {
    id: "act-gen-11",
    role: "action",
    text: "Documenting the steps as I went meant somebody else could pick it up if I was unavailable.",
    categories: ["teamwork", "communication", "competency"],
  },
  {
    id: "act-gen-12",
    role: "action",
    text: "Because opinions were strong, I asked each person to describe the outcome they wanted rather than the method they preferred.",
    categories: ["conflict", "stakeholder", "communication"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "act-gen-13",
    role: "action",
    text: "Priorities were reordered in the open, so anyone who lost out could at least see the reasoning.",
    categories: ["prioritisation", "stakeholder", "leadership"],
  },
  {
    id: "act-gen-14",
    role: "action",
    text: "Taking the difficult conversation early saved a much harder one later on.",
    categories: ["conflict", "communication", "leadership"],
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "act-gen-15",
    role: "action",
    text: "Every assumption we were relying on was written down and checked against something real.",
    categories: ["problem-solving", "ambiguity", "technical-challenge"],
  },
  {
    id: "act-gen-16",
    role: "action",
    text: "Instead of adding another report, I removed the ones nobody was reading.",
    categories: ["innovation", "initiative", "prioritisation"],
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "act-gen-17",
    role: "action",
    text: "Pairing with a colleague who knew the history filled the gaps in my own understanding quickly.",
    seniority: ["student", "graduate", "junior", "mid"],
    categories: ["learning-quickly", "teamwork", "graduate"],
  },
  {
    id: "act-gen-18",
    role: "action",
    text: "As soon as the risk was clear, I told the people it would affect, before they could hear it from anyone else.",
    categories: ["communication", "stakeholder", "values-culture"],
  },
  {
    id: "act-gen-19",
    role: "action",
    text: "Breaking the work into pieces that could be finished independently kept progress visible throughout.",
    categories: ["prioritisation", "deadlines", "teamwork"],
  },
  {
    id: "act-gen-20",
    role: "action",
    text: "Throughout, I kept a written record of the decisions and the reasoning behind each one.",
    categories: ["communication", "competency", "stakeholder"],
    tones: ["professional"],
  },

  /* ---------------------------------------------------------------- */
  /* Decide, agree and communicate                                     */
  /* ---------------------------------------------------------------- */
  {
    id: "act-gen-21",
    role: "action",
    text: "When the first approach failed, we stopped, said so plainly and moved to the alternative.",
    categories: ["failure", "adaptability", "teamwork"],
    frameworks: ["reflective", "car"],
  },
  {
    id: "act-gen-22",
    role: "action",
    text: "Agreeing what we would not do turned out to be far more useful than agreeing what we would.",
    categories: ["prioritisation", "ambiguity", "leadership"],
    tones: ["confident"],
  },
  {
    id: "act-gen-23",
    role: "action",
    text: "Checking my own work against a colleague's view caught assumptions I had not noticed myself.",
    categories: ["feedback", "teamwork", "competency"],
  },
  {
    id: "act-gen-24",
    role: "action",
    text: "Since the requirements kept moving, I wrote them up after each conversation and circulated them for correction.",
    categories: ["ambiguity", "communication", "stakeholder"],
  },
  {
    id: "act-gen-25",
    role: "action",
    text: "Listening properly at the start meant the eventual fix needed far less rework at the end.",
    categories: ["communication", "problem-solving"],
  },
  {
    id: "act-gen-26",
    role: "action",
    text: "Bringing everyone into the same room, with a short agenda, unblocked a decision that had been drifting for ages.",
    categories: ["stakeholder", "conflict", "leadership"],
    tones: ["conversational"],
  },
  {
    id: "act-gen-27",
    role: "action",
    text: "Automating the repetitive part freed people up to handle the exceptions that actually needed judgement.",
    categories: ["innovation", "initiative", "technical-challenge"],
  },
  {
    id: "act-gen-28",
    role: "action",
    text: "Escalation came only once I had a recommendation to escalate with, not just a problem to hand over.",
    categories: ["initiative", "stakeholder", "leadership"],
    tones: ["confident"],
  },
  {
    id: "act-gen-29",
    role: "action",
    text: "Delegating the parts other people could own let me concentrate on the decision only I could make.",
    seniority: ["lead", "manager", "executive"],
    categories: ["leadership", "management-role", "prioritisation"],
  },
  {
    id: "act-gen-30",
    role: "action",
    text: "Coaching rather than correcting took longer at first and stuck far better afterwards.",
    seniority: ["lead", "manager", "senior"],
    categories: ["leadership", "management-role", "feedback"],
  },
  {
    id: "act-gen-31",
    role: "action",
    text: "Setting expectations with the client early, including the parts that were still uncertain, protected the relationship later.",
    categories: ["stakeholder", "communication", "ambiguity"],
  },
  {
    id: "act-gen-32",
    role: "action",
    text: "Nothing went live until somebody other than me had reviewed it.",
    categories: ["competency", "teamwork", "technical-challenge"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "act-nonprofit-01",
    role: "action",
    text: "Volunteers were briefed with the same care as paid staff, and that is what made the change hold.",
    industries: ["nonprofit"],
    categories: ["leadership", "communication", "teamwork"],
  },
  {
    id: "act-gen-34",
    role: "action",
    text: "Feedback was invited deliberately, including from the people most likely to disagree with me.",
    categories: ["feedback", "communication", "values-culture"],
  },
  {
    id: "act-gen-35",
    role: "action",
    text: "Simplifying the language in the handover made it usable by people well outside the team.",
    categories: ["communication", "teamwork"],
  },
  {
    id: "act-gen-36",
    role: "action",
    text: "Given the pressure on time, we agreed a clear cut-off and communicated it once, clearly.",
    categories: ["deadlines", "pressure", "communication"],
    tones: ["concise", "confident"],
  },
  {
    id: "act-gen-37",
    role: "action",
    text: "Shadowing the process end to end showed me where the handover was actually breaking.",
    categories: ["problem-solving", "learning-quickly", "initiative"],
  },
  {
    id: "act-gen-38",
    role: "action",
    text: "Ownership was assigned by name for each open item, so nothing sat in the gap between roles.",
    seniority: ["senior", "lead", "manager", "executive"],
    categories: ["leadership", "teamwork", "management-role"],
  },
  {
    id: "act-gen-39",
    role: "action",
    text: "Making the trade-offs visible let the decision be taken by the people who were accountable for it.",
    categories: ["stakeholder", "prioritisation", "communication"],
  },
  {
    id: "act-gen-40",
    role: "action",
    text: "Tracking progress in one place, visible to everyone, removed most of the status chasing on its own.",
    categories: ["teamwork", "communication", "deadlines"],
  },

  /* ---------------------------------------------------------------- */
  /* Work under pressure, adapt, follow through                        */
  /* ---------------------------------------------------------------- */
  {
    id: "act-gen-41",
    role: "action",
    text: "Wherever I could, I swapped a meeting for a written update people could read when it suited them.",
    categories: ["communication", "innovation", "prioritisation"],
    tones: ["conversational"],
  },
  {
    id: "act-gen-42",
    role: "action",
    text: "Under time pressure I chose the option that was easiest to reverse.",
    categories: ["pressure", "ambiguity", "problem-solving"],
    tones: ["concise", "confident"],
    lengths: ["short", "standard"],
  },
  {
    id: "act-gen-43",
    role: "action",
    text: "Practising the difficult explanation beforehand made the actual conversation far calmer.",
    categories: ["communication", "conflict", "stakeholder"],
  },
  {
    id: "act-gen-44",
    role: "action",
    text: "Standardising the parts that varied for no good reason cut down the number of ways things could go wrong.",
    categories: ["innovation", "problem-solving", "technical-challenge"],
  },
  {
    id: "act-gen-45",
    role: "action",
    text: "Asking for help sooner than my instinct suggested turned out to be the right call.",
    seniority: ["student", "graduate", "junior", "mid"],
    categories: ["learning-quickly", "teamwork", "weakness", "graduate"],
    tones: ["conversational"],
  },
  {
    id: "act-gen-46",
    role: "action",
    text: "Reviewing what had already been tried stopped us walking back into a known dead end.",
    categories: ["problem-solving", "learning-quickly"],
  },
  {
    id: "act-gen-47",
    role: "action",
    text: "By keeping the scope small and the reviews frequent, we stayed correctable the whole way through.",
    categories: ["adaptability", "innovation", "deadlines"],
  },
  {
    id: "act-gen-48",
    role: "action",
    text: "Negotiating the deadline honestly, with the reasons attached, was received far better than quietly missing it.",
    categories: ["deadlines", "stakeholder", "communication", "values-culture"],
  },
  {
    id: "act-gen-49",
    role: "action",
    text: "Using {skill} directly, I rebuilt the part of the process that was generating most of the errors.",
    requires: ["skill"],
    categories: ["strengths", "problem-solving", "technical-challenge"],
    tones: ["confident"],
  },
  {
    id: "act-gen-50",
    role: "action",
    text: "Drawing on {skills}, I worked through the options and set out plainly which one I would back and why.",
    requires: ["skills"],
    categories: ["strengths", "problem-solving", "leadership"],
  },

  /* ---------------------------------------------------------------- */
  /* Technology and engineering                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "act-tech-01",
    role: "action",
    text: "Reproducing the fault reliably came before any attempt to fix it.",
    industries: ["technology", "engineering"],
    categories: ["technical-challenge", "problem-solving", "technical-role"],
    frameworks: ["technical", "star"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "act-tech-02",
    role: "action",
    text: "Adding logging around the suspect path turned a vague report into something we could actually observe.",
    industries: ["technology"],
    categories: ["technical-challenge", "problem-solving", "technical-role"],
    frameworks: ["technical"],
  },
  {
    id: "act-tech-03",
    role: "action",
    text: "Rolling the change out behind a flag meant we could switch it off again without a release.",
    industries: ["technology"],
    categories: ["technical-challenge", "innovation", "technical-role"],
    frameworks: ["technical"],
  },
  {
    id: "act-tech-04",
    role: "action",
    text: "Writing tests around the behaviour we depended on gave us room to refactor safely.",
    industries: ["technology"],
    categories: ["technical-challenge", "technical-role", "competency"],
    frameworks: ["technical"],
  },

  /* ---------------------------------------------------------------- */
  /* Finance, legal and public sector                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "act-fin-01",
    role: "action",
    text: "Reconciling back to the source records, rather than to the summary, exposed where the difference began.",
    industries: ["finance"],
    categories: ["problem-solving", "competency"],
  },
  {
    id: "act-fin-02",
    role: "action",
    text: "Controls were rewritten so the check happened at the point of entry instead of at review.",
    industries: ["finance"],
    categories: ["innovation", "problem-solving", "competency"],
  },
  {
    id: "act-public-01",
    role: "action",
    text: "Recording the rationale for each decision meant the case could be picked apart by anyone later on.",
    industries: ["public-sector", "legal"],
    categories: ["competency", "stakeholder", "values-culture"],
    tones: ["professional"],
  },

  /* ---------------------------------------------------------------- */
  /* Healthcare                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "act-health-01",
    role: "action",
    text: "Clinical colleagues were consulted before any change to the pathway, and their concerns changed the design.",
    industries: ["healthcare"],
    categories: ["stakeholder", "communication", "leadership"],
  },
  {
    id: "act-health-02",
    role: "action",
    text: "Triage criteria were written down and agreed, so the same case got the same response whoever picked it up.",
    industries: ["healthcare"],
    categories: ["prioritisation", "problem-solving", "communication"],
  },

  /* ---------------------------------------------------------------- */
  /* Retail, hospitality, customer service, education                  */
  /* ---------------------------------------------------------------- */
  {
    id: "act-retail-01",
    role: "action",
    text: "Walking the shop floor at the busiest point showed me what the reports never could.",
    industries: ["retail"],
    categories: ["problem-solving", "initiative", "leadership"],
  },
  {
    id: "act-hosp-01",
    role: "action",
    text: "Briefing the floor team before service, with the specific risks named, kept the evening steady.",
    industries: ["hospitality"],
    categories: ["leadership", "communication", "pressure"],
  },
  {
    id: "act-cs-01",
    role: "action",
    text: "Grouping the contacts by cause showed that most of them traced back to a single confusing step.",
    industries: ["customer-service", "retail"],
    categories: ["problem-solving", "initiative"],
  },
  {
    id: "act-edu-01",
    role: "action",
    text: "Differentiating the task, so that everyone had a way in, brought the group back together.",
    industries: ["education"],
    categories: ["adaptability", "communication", "leadership"],
  },

  /* ---------------------------------------------------------------- */
  /* Logistics, manufacturing, construction                            */
  /* ---------------------------------------------------------------- */
  {
    id: "act-log-01",
    role: "action",
    text: "Re-planning the routes around the new cut-off times restored the sequence dispatch relied on.",
    industries: ["logistics"],
    categories: ["problem-solving", "adaptability"],
  },
  {
    id: "act-log-02",
    role: "action",
    text: "Handover between shifts was tightened so information stopped falling into the gap.",
    industries: ["logistics", "manufacturing"],
    categories: ["communication", "problem-solving", "teamwork"],
  },
  {
    id: "act-mfg-01",
    role: "action",
    text: "Isolating the variable across shifts settled the disagreement about cause with evidence rather than opinion.",
    industries: ["manufacturing"],
    categories: ["problem-solving", "conflict", "technical-challenge"],
  },
  {
    id: "act-constr-01",
    role: "action",
    text: "Resequencing the trades on site kept the critical path intact while the redesign was resolved.",
    industries: ["construction"],
    categories: ["adaptability", "deadlines", "prioritisation"],
  },

  /* ---------------------------------------------------------------- */
  /* Creative, sales, science                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "act-creative-01",
    role: "action",
    text: "Presenting a few clearly different directions moved the client from vague feedback to an actual decision.",
    industries: ["creative"],
    categories: ["stakeholder", "communication", "innovation"],
  },
  {
    id: "act-sales-01",
    role: "action",
    text: "Qualifying out the opportunities that were never going to close made the remaining pipeline honest.",
    industries: ["sales"],
    categories: ["prioritisation", "values-culture", "competency"],
    tones: ["confident"],
  },
  {
    id: "act-science-01",
    role: "action",
    text: "Repeating the run with the method held constant separated the real signal from the artefact.",
    industries: ["science"],
    categories: ["technical-challenge", "problem-solving"],
    frameworks: ["technical", "star"],
  },
]);
