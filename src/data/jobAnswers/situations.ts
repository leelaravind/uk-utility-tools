import { blocks, type ContentBlock } from "./types";

/**
 * Situation blocks — the scene-setting sentence of a behavioural answer.
 *
 * A situation describes the circumstances the candidate walked into: what was
 * happening, why it mattered, and what made it hard. It deliberately stops
 * short of describing anyone's actions, which belong in `actions.ts`.
 *
 * Nothing here may assert a number, percentage, currency amount, team size,
 * timeframe or named metric. The candidate's real detail arrives only through
 * `{variables}` they typed or a `[[bracketed prompt]]` asking them to fill it in.
 *
 * ## Adding a situation
 * - Unique id prefixed `sit-`, and `role: "situation"`.
 * - Declare every `{var}` you use in `requires`.
 * - Prefer specific, recognisable trouble over abstractions: "the handover notes
 *   were thin" beats "there were challenges".
 * - Industry-tagged blocks should use that industry's real vocabulary
 *   (caseloads, dispatch cut-offs, reconciliation, moderation deadlines), not
 *   generic wording with an industry label bolted on.
 */
export const SITUATIONS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* General                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-gen-01",
    role: "situation",
    text: "In my most recent role I was responsible for {topic}, and we reached a point where the usual approach stopped working.",
    requires: ["topic"],
    categories: ["challenge", "problem-solving", "behavioural"],
    frameworks: ["star", "car"],
    tones: ["professional"],
    weight: 2,
  },
  {
    id: "sit-gen-02",
    role: "situation",
    text: "The team had inherited a process nobody had reviewed in a long while, and the cracks were beginning to show.",
    categories: ["challenge", "initiative", "innovation"],
    frameworks: ["star", "car"],
  },
  {
    id: "sit-gen-03",
    role: "situation",
    text: "Demand rose faster than our way of working could absorb, and a backlog started to build.",
    categories: ["pressure", "deadlines", "prioritisation"],
  },
  {
    id: "sit-gen-04",
    role: "situation",
    text: "Competing priorities landed at the same time, and both had already been promised to different people.",
    categories: ["prioritisation", "pressure", "stakeholder"],
    tones: ["professional"],
  },
  {
    id: "sit-gen-05",
    role: "situation",
    text: "A colleague and I disagreed openly about how to handle {topic}, and the disagreement was slowing everyone down.",
    requires: ["topic"],
    categories: ["conflict", "teamwork", "communication"],
  },
  {
    id: "sit-gen-06",
    role: "situation",
    text: "Halfway through the work the brief changed, and a good deal of what we had planned no longer applied.",
    categories: ["adaptability", "ambiguity", "challenge"],
  },
  {
    id: "sit-gen-07",
    role: "situation",
    text: "Nobody owned the problem, which is precisely why it had been allowed to drift.",
    categories: ["initiative", "ambiguity", "leadership"],
    tones: ["confident"],
  },
  {
    id: "sit-gen-08",
    role: "situation",
    text: "Our usual point of contact went quiet at the worst possible moment, and decisions stalled.",
    categories: ["stakeholder", "ambiguity", "communication"],
  },
  {
    id: "sit-gen-09",
    role: "situation",
    text: "Feedback came back harder than I expected, and it was about work I had been quietly pleased with.",
    categories: ["feedback", "failure", "weakness"],
    frameworks: ["reflective", "star"],
  },
  {
    id: "sit-gen-10",
    role: "situation",
    text: "Resources were tighter than the plan had assumed, so something was going to have to give.",
    categories: ["prioritisation", "pressure", "innovation"],
  },
  {
    id: "sit-gen-11",
    role: "situation",
    text: "Expectations differed between the people paying for the work and the people doing it.",
    categories: ["stakeholder", "communication", "conflict"],
  },
  {
    id: "sit-gen-12",
    role: "situation",
    text: "When I picked up {topic}, the handover notes were thin and most of the history lived in people's heads.",
    requires: ["topic"],
    categories: ["learning-quickly", "ambiguity", "initiative"],
  },
  {
    id: "sit-gen-13",
    role: "situation",
    text: "Quality slipped in a way customers noticed before we did.",
    categories: ["failure", "challenge", "problem-solving"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "sit-gen-14",
    role: "situation",
    text: "An avoidable mistake of mine found its way into work that other people were relying on.",
    categories: ["failure", "weakness"],
    frameworks: ["reflective", "car"],
    tones: ["professional"],
  },
  {
    id: "sit-gen-15",
    role: "situation",
    text: "Several strands of work depended on a decision that kept being deferred.",
    categories: ["ambiguity", "stakeholder", "deadlines"],
  },
  {
    id: "sit-gen-16",
    role: "situation",
    text: "During a period of change, a good part of the team were unsure whether their work still mattered.",
    seniority: ["lead", "manager", "executive"],
    categories: ["leadership", "adaptability", "management-role"],
  },
  {
    id: "sit-gen-17",
    role: "situation",
    text: "Deadlines had been agreed without anyone checking whether the work behind them was realistic.",
    categories: ["deadlines", "pressure", "stakeholder"],
  },
  {
    id: "sit-gen-18",
    role: "situation",
    text: "There was no shared definition of what good looked like, so every review turned into an argument.",
    categories: ["communication", "conflict", "ambiguity"],
  },
  {
    id: "sit-gen-19",
    role: "situation",
    text: "Turnover left gaps in knowledge that the remaining team were quietly absorbing.",
    categories: ["leadership", "teamwork", "challenge"],
    seniority: ["mid", "senior", "lead", "manager"],
  },
  {
    id: "sit-gen-20",
    role: "situation",
    text: "Being the newest person in the room, I could see steps everyone else had stopped questioning.",
    seniority: ["student", "graduate", "junior"],
    categories: ["initiative", "learning-quickly", "innovation", "graduate"],
    tones: ["conversational"],
  },
  {
    id: "sit-gen-21",
    role: "situation",
    text: "Working across time zones meant most of our communication was written, and written things are easy to misread.",
    categories: ["communication", "teamwork", "ambiguity"],
  },
  {
    id: "sit-gen-22",
    role: "situation",
    text: "Once the busy period started, there was no realistic way to do everything that had been asked of us.",
    categories: ["prioritisation", "pressure", "deadlines"],
    tones: ["professional"],
  },
  {
    id: "sit-gen-23",
    role: "situation",
    text: "My manager asked me to take on {topic} alongside work I was already committed to.",
    requires: ["topic"],
    categories: ["pressure", "prioritisation", "initiative"],
  },
  {
    id: "sit-gen-24",
    role: "situation",
    text: "Requirements arrived in fragments, from people who had never spoken to one another.",
    categories: ["ambiguity", "stakeholder", "communication"],
    tones: ["concise"],
  },
  {
    id: "sit-gen-25",
    role: "situation",
    text: "Trust between the groups involved had worn thin long before I arrived.",
    categories: ["conflict", "stakeholder", "teamwork"],
  },
  {
    id: "sit-gen-26",
    role: "situation",
    text: "Given how quickly the situation was moving, waiting for perfect information was never an option.",
    categories: ["ambiguity", "pressure", "adaptability"],
    tones: ["confident"],
  },
  {
    id: "sit-gen-27",
    role: "situation",
    text: "Results from a batch of samples fell outside the expected range, and the method had not changed.",
    industries: ["science"],
    categories: ["problem-solving", "technical-challenge"],
  },
  {
    id: "sit-gen-28",
    role: "situation",
    text: "As the person people came to for {skill}, I was pulled into problems well outside my own workload.",
    requires: ["skill"],
    categories: ["pressure", "strengths", "teamwork"],
  },
  {
    id: "sit-gen-29",
    role: "situation",
    text: "Funding for the programme was confirmed later than planned, and the delivery commitments did not move.",
    industries: ["nonprofit", "public-sector"],
    categories: ["pressure", "prioritisation", "adaptability"],
  },
  {
    id: "sit-gen-30",
    role: "situation",
    text: "Late in the programme, a dependency we had taken entirely for granted became unavailable.",
    categories: ["adaptability", "challenge", "problem-solving"],
  },
  {
    id: "sit-gen-31",
    role: "situation",
    text: "Everyone agreed the process was painful, and nobody had time to fix it.",
    categories: ["initiative", "innovation", "prioritisation"],
    tones: ["conversational", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "sit-gen-32",
    role: "situation",
    text: "Rather than one large failure, we had a steady drip of small errors that were hard to trace.",
    categories: ["problem-solving", "technical-challenge", "challenge"],
  },
  {
    id: "sit-gen-33",
    role: "situation",
    text: "It became clear that the people most affected by the change had never been asked about it.",
    categories: ["stakeholder", "communication", "leadership"],
  },

  /* ---------------------------------------------------------------- */
  /* Technology and engineering                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-tech-01",
    role: "situation",
    text: "Our release process had grown by accretion, and every deployment carried more risk than it needed to.",
    industries: ["technology"],
    categories: ["technical-challenge", "problem-solving", "technical-role"],
    frameworks: ["star", "technical"],
  },
  {
    id: "sit-tech-02",
    role: "situation",
    text: "A service that had been stable for a long time began failing intermittently under load.",
    industries: ["technology", "engineering"],
    categories: ["technical-challenge", "problem-solving", "pressure"],
    frameworks: ["technical", "star"],
  },
  {
    id: "sit-tech-03",
    role: "situation",
    text: "Legacy code sat underneath a feature the business had just promised to a customer.",
    industries: ["technology"],
    categories: ["technical-challenge", "stakeholder", "deadlines"],
  },
  {
    id: "sit-tech-04",
    role: "situation",
    text: "Technical debt had reached the point where small changes took wildly disproportionate effort.",
    industries: ["technology"],
    categories: ["technical-challenge", "prioritisation", "technical-role"],
    tones: ["professional"],
  },

  /* ---------------------------------------------------------------- */
  /* Finance and legal                                                 */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-fin-01",
    role: "situation",
    text: "Reconciliation at period end kept throwing up differences that took far too long to explain.",
    industries: ["finance"],
    categories: ["problem-solving", "deadlines", "challenge"],
  },
  {
    id: "sit-fin-02",
    role: "situation",
    text: "Controls that looked sound on paper were being quietly worked around in practice.",
    industries: ["finance", "legal"],
    categories: ["challenge", "conflict", "values-culture"],
  },
  {
    id: "sit-fin-03",
    role: "situation",
    text: "An audit query landed on a reporting process I had only recently taken over.",
    industries: ["finance"],
    categories: ["pressure", "learning-quickly", "stakeholder"],
  },

  /* ---------------------------------------------------------------- */
  /* Healthcare and public sector                                      */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-health-01",
    role: "situation",
    text: "Caseloads had grown to the point where triage decisions were being made without full information.",
    industries: ["healthcare"],
    categories: ["pressure", "prioritisation", "challenge"],
  },
  {
    id: "sit-health-02",
    role: "situation",
    text: "Changes to clinical governance requirements affected how the whole team recorded their work.",
    industries: ["healthcare", "public-sector"],
    categories: ["adaptability", "communication", "stakeholder"],
  },
  {
    id: "sit-health-03",
    role: "situation",
    text: "Patients were waiting longer than any of us were comfortable with, and the cause sat across several teams.",
    industries: ["healthcare"],
    categories: ["problem-solving", "stakeholder", "leadership"],
  },
  {
    id: "sit-public-01",
    role: "situation",
    text: "Policy guidance changed while casework was already in progress.",
    industries: ["public-sector"],
    categories: ["adaptability", "ambiguity"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "sit-public-02",
    role: "situation",
    text: "Public scrutiny meant every decision on the project needed a clear audit trail behind it.",
    industries: ["public-sector", "legal"],
    categories: ["stakeholder", "values-culture", "competency"],
  },

  /* ---------------------------------------------------------------- */
  /* Retail, hospitality and customer service                          */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-retail-01",
    role: "situation",
    text: "Stock availability and the promises we were making at the till had drifted apart.",
    industries: ["retail"],
    categories: ["problem-solving", "challenge"],
  },
  {
    id: "sit-retail-02",
    role: "situation",
    text: "Peak trading exposed a rota that worked on paper and failed on the shop floor.",
    industries: ["retail", "hospitality"],
    categories: ["pressure", "prioritisation", "leadership"],
  },
  {
    id: "sit-hosp-01",
    role: "situation",
    text: "Overbooking left the floor overstretched while guests were already being seated.",
    industries: ["hospitality"],
    categories: ["pressure", "challenge"],
    tones: ["conversational"],
  },
  {
    id: "sit-hosp-02",
    role: "situation",
    text: "Complaints clustered around the same part of the guest experience, and nobody had joined the dots.",
    industries: ["hospitality", "retail"],
    categories: ["problem-solving", "initiative"],
  },
  {
    id: "sit-cs-01",
    role: "situation",
    text: "Contact volumes rose and the same questions kept arriving, which told us the real problem sat upstream.",
    industries: ["customer-service", "retail"],
    categories: ["problem-solving", "initiative", "communication"],
  },

  /* ---------------------------------------------------------------- */
  /* Education                                                         */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-edu-01",
    role: "situation",
    text: "Some learners were falling behind, and the standard scheme of work was not reaching them.",
    industries: ["education"],
    categories: ["adaptability", "communication", "challenge"],
  },
  {
    id: "sit-edu-02",
    role: "situation",
    text: "Marking and moderation deadlines collided with a change to the assessment criteria.",
    industries: ["education"],
    categories: ["deadlines", "adaptability", "pressure"],
  },

  /* ---------------------------------------------------------------- */
  /* Logistics, manufacturing and construction                         */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-log-01",
    role: "situation",
    text: "Route planning assumptions stopped matching reality once a depot changed its cut-off times.",
    industries: ["logistics"],
    categories: ["problem-solving", "adaptability"],
  },
  {
    id: "sit-log-02",
    role: "situation",
    text: "SLA performance slipped, and the reasons were spread across dispatch, drivers and the customer's own site.",
    industries: ["logistics"],
    categories: ["problem-solving", "stakeholder", "pressure"],
  },
  {
    id: "sit-mfg-01",
    role: "situation",
    text: "Quality rejects concentrated on one line, and the shift teams disagreed about the cause.",
    industries: ["manufacturing"],
    categories: ["problem-solving", "conflict", "technical-challenge"],
  },
  {
    id: "sit-mfg-02",
    role: "situation",
    text: "Planned maintenance kept being deferred because the line could never be spared.",
    industries: ["manufacturing", "engineering"],
    categories: ["prioritisation", "challenge", "stakeholder"],
  },
  {
    id: "sit-constr-01",
    role: "situation",
    text: "Design changes arrived after the sequence on site had already been set.",
    industries: ["construction"],
    categories: ["adaptability", "stakeholder", "challenge"],
  },
  {
    id: "sit-constr-02",
    role: "situation",
    text: "Subcontractor availability shifted, and the programme had no slack left to absorb it.",
    industries: ["construction"],
    categories: ["pressure", "deadlines", "prioritisation"],
  },

  /* ---------------------------------------------------------------- */
  /* Creative and commercial                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "sit-creative-01",
    role: "situation",
    text: "Feedback from the client contradicted the brief we had been given at the start.",
    industries: ["creative"],
    categories: ["conflict", "stakeholder", "communication"],
  },
  {
    id: "sit-sales-01",
    role: "situation",
    text: "Pipeline coverage looked healthy until the largest opportunities were examined properly.",
    industries: ["sales"],
    categories: ["problem-solving", "challenge", "stakeholder"],
    tones: ["confident"],
  },
]);
