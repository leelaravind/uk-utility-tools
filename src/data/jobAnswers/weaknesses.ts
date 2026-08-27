import { blocks, type ContentBlock } from "./types";

/**
 * Weakness blocks — the honest frame, and the correction that follows it.
 *
 * This is the hardest category to write without lying. Every frame here is a
 * REAL weakness: recoverable, non-disqualifying, and costly enough that naming
 * it is a genuine admission. The fake-humble dodges are banned on purpose, so
 * you will find no "I am a perfectionist", no "I work too hard", no "I care too
 * much" and no strength wearing a weakness costume.
 *
 * Each frame has a matching correction pattern in `WEAKNESS_CORRECTIONS` that
 * says what the person actually changed and how they know it worked. Frames and
 * corrections are indexed loosely rather than paired one-to-one, so the
 * composer can mix them; keep new corrections general enough to follow any
 * frame in the same seniority or industry band.
 *
 * Adding more: append to either export, take the next free `weak-` / `weakfix-`
 * id, list every `{var}` in `requires`, one `[[prompt]]` per block at most, and
 * vary the opening word — no more than two blocks in this file should begin
 * with the same word.
 */

/** The admission. Real faults only, stated plainly. */
export const WEAKNESS_FRAMES: ContentBlock[] = blocks([
  {
    id: "weak-01",
    role: "weakness-frame",
    text: "The weakness I would name is that I have historically taken on too much myself rather than asking a colleague to share it, which slows the work down for everyone.",
    categories: ["weakness", "feedback"],
    weight: 1.3,
  },
  {
    id: "weak-02",
    role: "weakness-frame",
    text: "Delegating properly has been genuinely difficult for me, not because I doubt other people but because handing work over well takes preparation I used to skip.",
    categories: ["weakness", "leadership", "management-role"],
    seniority: ["mid", "senior", "lead", "manager"],
  },
  {
    id: "weak-03",
    role: "weakness-frame",
    text: "I have a tendency to keep refining a piece of work past the point where anyone else can tell the difference, which is a time-management fault rather than a virtue.",
    categories: ["weakness", "prioritisation"],
  },
  {
    id: "weak-04",
    role: "weakness-frame",
    text: "Public speaking to a large room has never come naturally to me, and early on I avoided opportunities because of it.",
    categories: ["weakness", "communication"],
  },
  {
    id: "weak-05",
    role: "weakness-frame",
    text: "Saying no to a reasonable request has been my biggest problem, because agreeing to everything meant some commitments were met late.",
    categories: ["weakness", "prioritisation", "deadlines"],
  },
  {
    id: "weak-06",
    role: "weakness-frame",
    text: "Detail work at the end of a long project is where my concentration drops, and I have made avoidable errors there.",
    categories: ["weakness", "feedback"],
    tones: ["professional"],
  },
  {
    id: "weak-07",
    role: "weakness-frame",
    text: "My instinct is to solve a problem myself before escalating it, and there have been occasions when escalating sooner would have saved everyone trouble.",
    categories: ["weakness", "problem-solving", "teamwork"],
  },
  {
    id: "weak-08",
    role: "weakness-frame",
    text: "Writing has always been slower for me than talking, and in work where the written record matters that has been a real limitation.",
    categories: ["weakness", "communication"],
    industries: ["legal", "public-sector", "science"],
  },
  {
    id: "weak-09",
    role: "weakness-frame",
    text: "Numbers-heavy analysis is not my natural strength, and I have had to work at it rather than rely on instinct.",
    categories: ["weakness", "learning-quickly"],
    industries: ["finance", "retail", "science"],
  },
  {
    id: "weak-10",
    role: "weakness-frame",
    text: "Impatience with slow processes is a fault of mine, and it has shown up as visible frustration in meetings where that was unhelpful.",
    categories: ["weakness", "feedback", "teamwork"],
    tones: ["conversational"],
  },
  {
    id: "weak-11",
    role: "weakness-frame",
    text: "Giving critical feedback used to be something I softened until the message disappeared, which was unfair on the person receiving it.",
    categories: ["weakness", "feedback", "leadership"],
    seniority: ["mid", "senior", "lead", "manager"],
  },
  {
    id: "weak-12",
    role: "weakness-frame",
    text: "Planning far ahead is not where my mind naturally goes, and I am considerably better at the near term than the long horizon.",
    categories: ["weakness", "prioritisation"],
  },
  {
    id: "weak-13",
    role: "weakness-frame",
    text: "Asking for help has taken me a long time to get comfortable with, and staying quiet has occasionally left a problem unsolved for longer than it needed to be.",
    categories: ["weakness", "teamwork", "graduate"],
    seniority: ["student", "graduate", "junior"],
  },
  {
    id: "weak-14",
    role: "weakness-frame",
    text: "Estimating how long a piece of work will take is something I have been consistently optimistic about, which is not a harmless habit.",
    categories: ["weakness", "deadlines", "technical-challenge"],
    industries: ["technology", "engineering", "construction"],
  },
  {
    id: "weak-15",
    role: "weakness-frame",
    text: "Confrontation is uncomfortable for me, and I have let a disagreement sit rather than raise it, which made it worse.",
    categories: ["weakness", "conflict"],
  },
  {
    id: "weak-16",
    role: "weakness-frame",
    text: "Switching between very different tasks costs me more than it seems to cost other people, and a fragmented day produces my weakest work.",
    categories: ["weakness", "prioritisation"],
    tones: ["conversational"],
  },
  {
    id: "weak-17",
    role: "weakness-frame",
    text: "Technical depth outside my own specialism is a gap, and I have occasionally accepted an explanation I was not in a position to challenge.",
    categories: ["weakness", "technical-challenge", "learning-quickly"],
    industries: ["technology", "engineering", "science"],
  },
  {
    id: "weak-18",
    role: "weakness-frame",
    text: "Networking deliberately, rather than getting to know people incidentally, is something I have neglected, and it has limited what I knew about my own organisation.",
    categories: ["weakness", "stakeholder"],
    seniority: ["mid", "senior", "lead"],
  },
  {
    id: "weak-19",
    role: "weakness-frame",
    text: "Reading a room is not an automatic skill for me, and I have pressed a point after the moment for it had passed.",
    categories: ["weakness", "communication", "feedback"],
  },
  {
    id: "weak-20",
    role: "weakness-frame",
    text: "Commercial awareness was the obvious gap when I started, because I understood the work without understanding what it cost.",
    categories: ["weakness", "graduate", "learning-quickly"],
    seniority: ["student", "graduate", "junior"],
  },
  {
    id: "weak-21",
    role: "weakness-frame",
    text: "Letting go of a decision once someone else has made it is harder for me than it should be, and I have relitigated things that were settled.",
    categories: ["weakness", "leadership", "conflict"],
    seniority: ["senior", "lead", "manager", "executive"],
  },
  {
    id: "weak-22",
    role: "weakness-frame",
    text: "Routine administration slides down my list, and while the important work gets done, the surrounding paperwork has been late.",
    categories: ["weakness", "prioritisation"],
    industries: ["healthcare", "education", "public-sector"],
    tones: ["conversational", "concise"],
    lengths: ["short", "standard"],
  },
]);

/** The correction: what changed, and how the person knows it worked. */
export const WEAKNESS_CORRECTIONS: ContentBlock[] = blocks([
  {
    id: "weakfix-01",
    role: "weakness-correction",
    text: "What changed it was making the handover explicit at the point work is assigned, and I judge the fix by whether anything comes back to me that should not have.",
    categories: ["weakness", "feedback"],
    weight: 1.3,
  },
  {
    id: "weakfix-02",
    role: "weakness-correction",
    text: "Preparing a proper brief before handing something over solved most of it, and the evidence is that the work now comes back closer to finished.",
    categories: ["weakness", "leadership", "management-role"],
    seniority: ["mid", "senior", "lead", "manager"],
  },
  {
    id: "weakfix-03",
    role: "weakness-correction",
    text: "Setting a defined stopping point before I start, and treating it as fixed, is what broke the habit, and [[the piece of work where you first held to it]] is where I proved it to myself.",
    categories: ["weakness", "prioritisation"],
    lengths: ["standard", "detailed"],
  },
  {
    id: "weakfix-04",
    role: "weakness-correction",
    text: "Volunteering for small speaking slots rather than waiting for large ones built the confidence, and I now put myself forward rather than hoping to be passed over.",
    categories: ["weakness", "communication"],
  },
  {
    id: "weakfix-05",
    role: "weakness-correction",
    text: "Answering with a date rather than a yes is the specific change I made, and commitments stopped slipping.",
    categories: ["weakness", "prioritisation", "deadlines"],
    tones: ["concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "weakfix-06",
    role: "weakness-correction",
    text: "Checking the final stage against a written list, rather than against my own memory, is what fixed it, and the errors that used to appear there have not returned.",
    categories: ["weakness", "feedback"],
    tones: ["professional"],
  },
  {
    id: "weakfix-07",
    role: "weakness-correction",
    text: "Agreeing an escalation trigger in advance took the judgement out of the moment, and my manager now hears about problems while they are still small.",
    categories: ["weakness", "problem-solving", "teamwork"],
  },
  {
    id: "weakfix-08",
    role: "weakness-correction",
    text: "Drafting badly and quickly, then editing, turned out to be the answer, and I now produce written work at a pace that no longer holds anyone up.",
    categories: ["weakness", "communication"],
    industries: ["legal", "public-sector", "science"],
  },
  {
    id: "weakfix-09",
    role: "weakness-correction",
    text: "Deliberate study rather than on-the-job osmosis is how I closed the gap, and I now check my own figures in a way I could not before.",
    categories: ["weakness", "learning-quickly"],
    industries: ["finance", "retail", "science"],
  },
  {
    id: "weakfix-10",
    role: "weakness-correction",
    text: "Naming the frustration privately to myself, then asking a question instead of making a statement, has kept it out of the room.",
    categories: ["weakness", "feedback", "teamwork"],
    tones: ["conversational"],
  },
  {
    id: "weakfix-11",
    role: "weakness-correction",
    text: "Separating the observation from the reassurance, and giving the observation first, was the change, and people have since told me they knew exactly where they stood.",
    categories: ["weakness", "feedback", "leadership"],
    seniority: ["mid", "senior", "lead", "manager"],
  },
  {
    id: "weakfix-12",
    role: "weakness-correction",
    text: "Booking time specifically for the longer view, and treating it as unmovable, is what compensates, and colleagues no longer have to remind me about it.",
    categories: ["weakness", "prioritisation"],
  },
  {
    id: "weakfix-13",
    role: "weakness-correction",
    text: "Agreeing with myself that I would ask after a fixed effort rather than a fixed feeling turned it around, and problems now surface while they are still cheap to fix.",
    categories: ["weakness", "teamwork", "graduate"],
    seniority: ["student", "graduate", "junior"],
  },
  {
    id: "weakfix-14",
    role: "weakness-correction",
    text: "Estimating from what similar work actually took, rather than from how long it ought to take, corrected the bias, and my estimates hold up far better than they did.",
    categories: ["weakness", "deadlines", "technical-challenge"],
    industries: ["technology", "engineering", "construction"],
  },
  {
    id: "weakfix-15",
    role: "weakness-correction",
    text: "Raising the issue while it is still small, rather than letting it settle, is the rule I gave myself, and disagreements have stopped hardening into something worse.",
    categories: ["weakness", "conflict"],
  },
  {
    id: "weakfix-16",
    role: "weakness-correction",
    text: "Grouping similar work together and protecting one uninterrupted stretch fixed most of it, and the difference in quality was obvious to me straight away.",
    categories: ["weakness", "prioritisation"],
    tones: ["conversational"],
  },
  {
    id: "weakfix-17",
    role: "weakness-correction",
    text: "Learning enough of the neighbouring discipline to ask a sensible question was the fix, and I now push back where before I would have nodded.",
    categories: ["weakness", "technical-challenge", "learning-quickly"],
    industries: ["technology", "engineering", "science"],
  },
  {
    id: "weakfix-18",
    role: "weakness-correction",
    text: "Making a habit of speaking regularly to people outside my immediate team solved it, and I now hear about things early rather than after they are decided.",
    categories: ["weakness", "stakeholder"],
    seniority: ["mid", "senior", "lead"],
  },
  {
    id: "weakfix-19",
    role: "weakness-correction",
    text: "Pausing to check whether the point still needs making has become automatic, and I have not had the same feedback since.",
    categories: ["weakness", "communication", "feedback"],
  },
  {
    id: "weakfix-20",
    role: "weakness-correction",
    text: "Reading the management accounts and asking about what I did not understand closed that gap, and I can now argue for a piece of work in terms the finance team recognise.",
    categories: ["weakness", "graduate", "learning-quickly"],
    seniority: ["graduate", "junior", "mid"],
  },
  {
    id: "weakfix-21",
    role: "weakness-correction",
    text: "Committing out loud to disagree and then commit is what stopped it, and decisions now stay made.",
    categories: ["weakness", "leadership", "conflict"],
    seniority: ["senior", "lead", "manager", "executive"],
    tones: ["confident", "concise"],
    lengths: ["short", "standard"],
  },
  {
    id: "weakfix-22",
    role: "weakness-correction",
    text: "Blocking a short slot for administration at a fixed point in the day, rather than fitting it around everything else, has kept it current.",
    categories: ["weakness", "prioritisation"],
    industries: ["healthcare", "education", "public-sector"],
  },
]);
