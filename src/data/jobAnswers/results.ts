import { blocks, type ContentBlock } from "./types";

/**
 * Result blocks — what changed because of the actions.
 *
 * This is the file where the temptation to invent a statistic is strongest, and
 * where inventing one would do the most damage. No block here contains a
 * number, percentage, currency amount, headcount, duration or named metric.
 *
 * Roughly half of these blocks end in a `[[bracketed prompt]]` that asks the
 * visitor for their own real figure, so the draft reads as a finished sentence
 * with one obvious blank to fill. The other half are qualitative framings that
 * stand up honestly with no figure at all, for the many real results that were
 * never measured.
 *
 * ## Adding a result
 * - Unique id prefixed `res-`, and `role: "result"`.
 * - At most ONE `[[...]]` prompt per block, and make the prompt specific about
 *   what kind of measure is wanted.
 * - Declare every `{var}` you use in `requires`.
 * - Keep the qualitative half genuinely honest. "Colleagues started using the
 *   approach without being asked" is verifiable to the candidate; "the business
 *   was transformed" is not.
 */
export const RESULTS: ContentBlock[] = blocks([
  /* ---------------------------------------------------------------- */
  /* General, with a prompt for the visitor's own figure               */
  /* ---------------------------------------------------------------- */
  {
    id: "res-gen-01",
    role: "result",
    text: "The immediate problem was resolved, and the change was measurable: [[the result in your own numbers — time saved, error rate, revenue or customer impact]].",
    categories: ["success", "problem-solving", "challenge"],
    frameworks: ["star", "car"],
    tones: ["professional"],
    weight: 2,
  },
  {
    id: "res-gen-04",
    role: "result",
    text: "Outcome-wise, the improvement was clear enough to put a figure on: [[the specific improvement you can evidence, in your own numbers]].",
    categories: ["success", "competency"],
    frameworks: ["star", "car"],
  },
  {
    id: "res-gen-06",
    role: "result",
    text: "The backlog cleared, and the improvement showed up plainly in the figures: [[your own before and after number]].",
    categories: ["pressure", "deadlines", "success"],
  },
  {
    id: "res-gen-09",
    role: "result",
    text: "Errors of that type stopped appearing in the reviews that followed, and the drop was measurable: [[your own error rate before and after]].",
    categories: ["problem-solving", "failure", "competency"],
  },
  {
    id: "res-gen-10",
    role: "result",
    text: "Once the change had bedded in, the difference was clear enough to quantify: [[your own measure of the improvement]].",
    categories: ["success", "innovation"],
  },
  {
    id: "res-gen-13",
    role: "result",
    text: "We finished inside the agreed timeframe without cutting anything that mattered, and the scope stands up to scrutiny: [[what you actually delivered]].",
    categories: ["deadlines", "pressure", "success"],
  },
  {
    id: "res-gen-14",
    role: "result",
    text: "Time that had been going into chasing and rework went back into the work itself: [[the time saved, in your own measurement]].",
    categories: ["prioritisation", "innovation", "success"],
  },
  {
    id: "res-gen-18",
    role: "result",
    text: "Quality improved in a way we could actually show: [[the quality measure you tracked, and what it moved to]].",
    categories: ["competency", "success", "problem-solving"],
  },
  {
    id: "res-gen-19",
    role: "result",
    text: "What had been a recurring complaint became a rare one, and the change is easy to evidence: [[the complaint volume you can cite]].",
    categories: ["problem-solving", "communication", "success"],
  },
  {
    id: "res-gen-21",
    role: "result",
    text: "Cost came out below what the original plan had assumed, and I can be specific about it: [[the saving in your own figures]].",
    categories: ["innovation", "success", "prioritisation"],
  },
  {
    id: "res-gen-24",
    role: "result",
    text: "Throughput improved and stayed improved, and the number I would point to is this: [[your own throughput or volume figure]].",
    categories: ["success", "competency"],
  },
  {
    id: "res-gen-26",
    role: "result",
    text: "Reporting that used to consume a disproportionate amount of effort became routine, and the difference is measurable: [[how long it takes now compared with before]].",
    categories: ["innovation", "initiative", "success"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "res-gen-29",
    role: "result",
    text: "Uptake was higher than any of us expected, and I can give you the actual figure: [[the adoption number you recorded]].",
    categories: ["innovation", "leadership", "success"],
    tones: ["confident"],
  },
  {
    id: "res-gen-33",
    role: "result",
    text: "Volume that used to overwhelm us became manageable, and the evidence is straightforward: [[the volume figure before and after]].",
    categories: ["pressure", "prioritisation", "success"],
  },
  {
    id: "res-gen-34",
    role: "result",
    text: "Risk that had been carried quietly for a long time was closed out properly, and the exposure it removed was real: [[the exposure or cost avoided, in your own figures]].",
    categories: ["initiative", "competency", "success"],
  },

  /* ---------------------------------------------------------------- */
  /* General, qualitative and honest without a figure                  */
  /* ---------------------------------------------------------------- */
  {
    id: "res-gen-02",
    role: "result",
    text: "Work that had been stalling started moving again, and people stopped chasing each other for updates.",
    categories: ["teamwork", "communication", "success"],
    frameworks: ["star", "car"],
  },
  {
    id: "res-gen-03",
    role: "result",
    text: "By the end the process was simpler than when I found it, and the team preferred working with it.",
    categories: ["innovation", "teamwork", "success"],
  },
  {
    id: "res-gen-05",
    role: "result",
    text: "Customers noticed the difference before we got round to telling them about it.",
    categories: ["success", "communication"],
    tones: ["conversational", "confident"],
    lengths: ["short", "standard"],
  },
  {
    id: "res-gen-07",
    role: "result",
    text: "Nothing dramatic happened, which was rather the point, because the failure we had braced for never recurred.",
    categories: ["problem-solving", "technical-challenge", "success"],
    tones: ["conversational"],
  },
  {
    id: "res-gen-08",
    role: "result",
    text: "Feedback from the people affected was positive, and the change was still in use after I moved on.",
    categories: ["stakeholder", "leadership", "success"],
  },
  {
    id: "res-gen-11",
    role: "result",
    text: "My manager asked me to write it up so other teams could use the same approach.",
    categories: ["initiative", "innovation", "success"],
    tones: ["professional"],
  },
  {
    id: "res-gen-12",
    role: "result",
    text: "Relationships that had been strained were workable again, and the next piece of work went far more smoothly.",
    categories: ["conflict", "stakeholder", "teamwork"],
  },
  {
    id: "res-gen-15",
    role: "result",
    text: "Confidence returned, which at that point mattered rather more than any single metric.",
    categories: ["leadership", "teamwork", "failure"],
  },
  {
    id: "res-gen-16",
    role: "result",
    text: "Escalations on that issue stopped, and the pattern held afterwards.",
    categories: ["problem-solving", "stakeholder"],
    tones: ["concise", "professional"],
    lengths: ["short", "standard"],
  },
  {
    id: "res-gen-17",
    role: "result",
    text: "A decision that had been drifting was finally taken, and the work behind it restarted immediately.",
    categories: ["ambiguity", "stakeholder", "leadership"],
  },
  {
    id: "res-gen-20",
    role: "result",
    text: "Colleagues started using the approach without being asked to, which is the outcome I was most pleased with.",
    categories: ["innovation", "leadership", "success"],
    tones: ["confident"],
  },
  {
    id: "res-gen-22",
    role: "result",
    text: "Client feedback afterwards focused on how the problem had been handled rather than on the fact it had happened.",
    categories: ["stakeholder", "communication", "failure"],
  },
  {
    id: "res-gen-23",
    role: "result",
    text: "Handover became straightforward, because the knowledge was written down rather than held by one person.",
    categories: ["teamwork", "communication", "competency"],
  },
  {
    id: "res-gen-25",
    role: "result",
    text: "Nobody had to work late to make the deadline, which had not been true of the previous attempt.",
    categories: ["deadlines", "pressure", "teamwork"],
    tones: ["conversational"],
  },
  {
    id: "res-gen-27",
    role: "result",
    text: "Because the fix addressed the cause rather than the symptom, the problem has not come back.",
    categories: ["problem-solving", "technical-challenge", "success"],
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "res-gen-28",
    role: "result",
    text: "Senior stakeholders signed it off without the usual round of challenge, which told me the reasoning had landed.",
    seniority: ["senior", "lead", "manager", "executive"],
    categories: ["stakeholder", "communication", "leadership"],
  },
  {
    id: "res-gen-30",
    role: "result",
    text: "Both the immediate issue and the underlying weakness were dealt with, and only one of them had been asked for.",
    categories: ["initiative", "problem-solving"],
    tones: ["confident"],
  },
  {
    id: "res-gen-31",
    role: "result",
    text: "My own contribution is easiest to describe as {achievement}.",
    requires: ["achievement"],
    categories: ["success", "why-hire-you", "strengths"],
    tones: ["concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "res-gen-32",
    role: "result",
    text: "In the end the outcome was {achievement}, and it held up under scrutiny afterwards.",
    requires: ["achievement"],
    categories: ["success", "competency"],
  },
  {
    id: "res-gen-35",
    role: "result",
    text: "Later reviews of the same area found nothing of the kind we had been fixing.",
    categories: ["problem-solving", "competency", "success"],
  },

  /* ---------------------------------------------------------------- */
  /* Technology and engineering                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "res-tech-01",
    role: "result",
    text: "Deployments became routine rather than an event, and the failure rate is something I can quote: [[your own deployment failure or rollback figure]].",
    industries: ["technology"],
    categories: ["technical-challenge", "technical-role", "innovation"],
    frameworks: ["technical", "star"],
  },
  {
    id: "res-tech-02",
    role: "result",
    text: "Intermittent failures stopped, and the monitoring we added meant we would see the next one coming.",
    industries: ["technology"],
    categories: ["technical-challenge", "problem-solving"],
    frameworks: ["technical"],
  },
  {
    id: "res-tech-03",
    role: "result",
    text: "Build and release time dropped noticeably, and the figure is straightforward enough: [[the before and after build time]].",
    industries: ["technology", "engineering"],
    categories: ["technical-challenge", "technical-role"],
    frameworks: ["technical"],
  },

  /* ---------------------------------------------------------------- */
  /* Finance, legal and public sector                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "res-fin-01",
    role: "result",
    text: "Period end closed without the usual chase for explanations, and the difference showed in the numbers: [[your own reduction in reconciling items]].",
    industries: ["finance"],
    categories: ["deadlines", "problem-solving", "success"],
  },
  {
    id: "res-fin-02",
    role: "result",
    text: "That control now catches the error at entry, so the review stage stopped finding surprises.",
    industries: ["finance"],
    categories: ["problem-solving", "innovation", "competency"],
  },
  {
    id: "res-public-01",
    role: "result",
    text: "Scrutiny came, and the decision held, because the reasoning had been recorded at the time rather than reconstructed afterwards.",
    industries: ["public-sector", "legal"],
    categories: ["stakeholder", "competency", "values-culture"],
  },

  /* ---------------------------------------------------------------- */
  /* Healthcare                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "res-health-01",
    role: "result",
    text: "Waiting was reduced in a way the service could evidence: [[the waiting time figure you recorded]].",
    industries: ["healthcare"],
    categories: ["success", "problem-solving"],
  },
  {
    id: "res-health-02",
    role: "result",
    text: "Clinical colleagues said the pathway finally made sense to them, and recording became consistent across the team.",
    industries: ["healthcare"],
    categories: ["stakeholder", "communication", "success"],
  },

  /* ---------------------------------------------------------------- */
  /* Retail, hospitality, customer service, education                  */
  /* ---------------------------------------------------------------- */
  {
    id: "res-retail-01",
    role: "result",
    text: "Availability on the shelf matched what we were promising at the till, and the improvement showed up where it counts: [[your own availability or shrink figure]].",
    industries: ["retail"],
    categories: ["problem-solving", "success"],
  },
  {
    id: "res-retail-02",
    role: "result",
    text: "Peak trading ran without the usual firefighting, and the trading figure tells its own story: [[your own sales or transaction figure for the period]].",
    industries: ["retail", "hospitality"],
    categories: ["pressure", "leadership", "success"],
  },
  {
    id: "res-hosp-01",
    role: "result",
    text: "Service ran to time, and the complaints that had clustered around that stage stopped arriving.",
    industries: ["hospitality"],
    categories: ["problem-solving", "pressure", "success"],
  },
  {
    id: "res-cs-01",
    role: "result",
    text: "Repeat contacts about that issue fell away once the upstream step was fixed, and I can quantify it: [[your own contact volume change]].",
    industries: ["customer-service"],
    categories: ["problem-solving", "initiative", "success"],
  },
  {
    id: "res-edu-01",
    role: "result",
    text: "Learners who had disengaged started submitting work again, and attainment moved with it: [[your own attainment or progress measure]].",
    industries: ["education"],
    categories: ["adaptability", "communication", "success"],
  },

  /* ---------------------------------------------------------------- */
  /* Logistics, manufacturing, construction                            */
  /* ---------------------------------------------------------------- */
  {
    id: "res-log-01",
    role: "result",
    text: "Service levels recovered and then stayed recovered, and I can give you the figure: [[your own on-time performance number]].",
    industries: ["logistics"],
    categories: ["problem-solving", "success", "stakeholder"],
  },
  {
    id: "res-mfg-01",
    role: "result",
    text: "Rejects on that line came back within specification, and the figure is one I tracked myself: [[your own reject or scrap rate]].",
    industries: ["manufacturing"],
    categories: ["problem-solving", "technical-challenge", "success"],
  },
  {
    id: "res-constr-01",
    role: "result",
    text: "Programme recovery was achieved without extending the completion date.",
    industries: ["construction"],
    categories: ["deadlines", "adaptability", "success"],
    tones: ["concise", "confident"],
    lengths: ["short", "standard"],
  },

  /* ---------------------------------------------------------------- */
  /* Creative, sales, science, nonprofit                               */
  /* ---------------------------------------------------------------- */
  {
    id: "res-creative-01",
    role: "result",
    text: "Approval came at the next review, and the work went into production without further rounds of revision.",
    industries: ["creative"],
    categories: ["stakeholder", "communication", "success"],
  },
  {
    id: "res-sales-01",
    role: "result",
    text: "Forecast accuracy improved because the pipeline finally reflected reality, and the number bears that out: [[your own forecast accuracy or conversion figure]].",
    industries: ["sales"],
    categories: ["competency", "values-culture", "success"],
  },
  {
    id: "res-science-01",
    role: "result",
    text: "Repetition confirmed the result, and the method note we wrote stopped the same question being asked again.",
    industries: ["science"],
    categories: ["technical-challenge", "problem-solving", "success"],
  },
  {
    id: "res-nonprofit-01",
    role: "result",
    text: "More of the funding reached delivery rather than administration, and the shift is measurable: [[your own figure for the change]].",
    industries: ["nonprofit"],
    categories: ["innovation", "prioritisation", "success"],
  },
]);
