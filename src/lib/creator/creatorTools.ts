/**
 * Creator tools — pure, deterministic template helpers.
 *
 * These are honestly-labelled template fillers, NOT AI. Every function is
 * deterministic: the same inputs always produce the same outputs. Variation
 * comes from combining the user's inputs with fixed template arrays — no
 * Math.random(), no network calls, no dates.
 */

export type TitleTone = "how-to" | "listicle" | "story" | "bold";

export interface TitleOptions {
  /** The topic of the video/post, e.g. "sourdough baking". */
  subject: string;
  tone: TitleTone;
  /** Optional audience, e.g. "beginners" — woven into some patterns. */
  audience?: string;
}

/** Uppercase the first character only, leaving the rest untouched. */
function cap(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Collapse internal whitespace and trim. */
function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

type TitleTemplate = (subject: string, audience?: string) => string;

const TITLE_TEMPLATES: Record<TitleTone, TitleTemplate[]> = {
  "how-to": [
    (s, a) => `How to ${s}${a ? ` (a guide for ${a})` : " (step by step)"}`,
    (s) => `${cap(s)}: the complete beginner's guide`,
    (s, a) => `How I approach ${s} — and how ${a ?? "you"} can too`,
    (s) => `The simplest way to get started with ${s}`,
    (s) => `${cap(s)} explained in plain English`,
    (s, a) => `A practical guide to ${s}${a ? ` for ${a}` : ""}`,
    (s) => `How to ${s} without the usual mistakes`,
    (s) => `Everything I wish I'd known about ${s}`,
    (s, a) => `${cap(s)} made simple${a ? ` — even if you're one of the ${a}` : ""}`,
    (s) => `From zero to confident: ${s}`,
  ],
  listicle: [
    (s) => `7 things nobody tells you about ${s}`,
    (s, a) => `5 ${s} tips${a ? ` every one of the ${a} should know` : " that actually work"}`,
    (s) => `10 common ${s} mistakes (and how to fix them)`,
    (s) => `3 ways to get better at ${s} this week`,
    (s, a) => `The 5 best ${s} ideas${a ? ` for ${a}` : " right now"}`,
    (s) => `8 lessons from a year of ${s}`,
    (s) => `6 myths about ${s}, debunked`,
    (s) => `4 signs you're overcomplicating ${s}`,
    (s) => `9 quick wins for anyone into ${s}`,
    (s) => `The only 3 things that matter in ${s}`,
  ],
  story: [
    (s) => `I tried ${s} for 30 days — here's what happened`,
    (s) => `What ${s} taught me (the hard way)`,
    (s) => `The day ${s} finally clicked for me`,
    (s, a) => `My honest experience with ${s}${a ? ` as one of the ${a}` : ""}`,
    (s) => `Why I almost gave up on ${s}`,
    (s) => `A year of ${s}: the good, the bad and the surprising`,
    (s) => `How ${s} changed the way I work`,
    (s) => `The ${s} experiment I'd do again in a heartbeat`,
    (s) => `Behind the scenes: what ${s} really looks like`,
    (s) => `The mistake that made me rethink ${s}`,
  ],
  bold: [
    (s) => `The truth about ${s}`,
    (s) => `Stop doing ${s} like this`,
    (s) => `${cap(s)} is not what you think`,
    (s, a) => `Why most ${a ?? "people"} get ${s} wrong`,
    (s) => `You don't need more time — you need better ${s}`,
    (s) => `${cap(s)}: read this before you start`,
    (s) => `Nobody is talking about this side of ${s}`,
    (s) => `Forget everything you know about ${s}`,
    (s) => `${cap(s)} is easier than they make it look`,
    (s) => `This changes how you'll see ${s}`,
  ],
};

/**
 * Generate 8–12 title variations for a subject in a given tone.
 * Deterministic: fixed template arrays filled with the inputs.
 * Returns an empty array when the subject is blank.
 */
export function generateTitles(options: TitleOptions): string[] {
  const subject = clean(options.subject);
  if (subject === "") return [];
  const audience = options.audience ? clean(options.audience) : undefined;
  const templates = TITLE_TEMPLATES[options.tone];
  return templates.map((template) =>
    template(subject, audience === "" ? undefined : audience)
  );
}

export type HookCategory = "educational" | "story" | "contrarian" | "question";

const HOOK_TEMPLATES: Record<HookCategory, string[]> = {
  educational: [
    "Here's the one thing about [subject] that took me years to learn.",
    "If you only remember one thing about [subject], make it this.",
    "Most guides to [subject] skip the part that actually matters.",
    "In the next few minutes you'll understand [subject] better than most people ever do.",
    "There are three levels to [subject] — and most people never get past the first.",
    "Before you spend another hour on [subject], watch this.",
    "The fastest way to improve at [subject] isn't what you think.",
    "Let me save you a month of trial and error with [subject].",
  ],
  story: [
    "A year ago I knew nothing about [subject]. Then everything changed.",
    "I almost quit [subject] — this is the moment that stopped me.",
    "Nobody warned me about this part of [subject].",
    "The first time I tried [subject], it went horribly wrong.",
    "This is the [subject] story I've never told anyone.",
    "I spent 30 days on [subject] so you don't have to.",
    "One small decision about [subject] changed my whole approach.",
    "Everyone said [subject] would be easy. They were wrong.",
  ],
  contrarian: [
    "Everything you've heard about [subject] is only half true.",
    "Unpopular opinion: [subject] is overrated — and underrated at the same time.",
    "Stop following the standard advice on [subject].",
    "The experts are wrong about [subject] — here's why.",
    "You've been doing [subject] backwards.",
    "The most popular approach to [subject] is the slowest one.",
    "[subject] doesn't work the way most people think it does.",
    "Hot take: you probably don't need [subject] at all — you need this instead.",
  ],
  question: [
    "What if [subject] were actually simple?",
    "Why does nobody talk about this side of [subject]?",
    "Have you ever wondered why [subject] feels so hard?",
    "What would happen if you ignored [subject] for a month?",
    "Is [subject] really worth your time? Let's find out.",
    "How much do you actually know about [subject]?",
    "What's the real difference between good and great [subject]?",
    "Ready to see [subject] in a completely new way?",
  ],
};

/**
 * Fill the fixed hook templates for a category with the given subject.
 * Deterministic; returns an empty array when the subject is blank.
 */
export function generateHooks(
  subject: string,
  category: HookCategory
): string[] {
  const cleaned = clean(subject);
  if (cleaned === "") return [];
  return HOOK_TEMPLATES[category].map((template) =>
    template.split("[subject]").join(cleaned)
  );
}

export interface DescriptionOptions {
  subject: string;
  /** Include a links block. Default true. */
  links?: boolean;
  /** Include a chapters/timestamps placeholder. Default true. */
  chapters?: boolean;
}

/** Turn a subject into deterministic hashtags: whole phrase + each word (3+ chars). */
export function subjectHashtags(subject: string): string[] {
  const cleaned = clean(subject);
  if (cleaned === "") return [];
  const words = cleaned.split(" ").map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""));
  const tags: string[] = [];
  const whole = words.map((w) => cap(w)).join("");
  if (whole !== "") tags.push(`#${whole}`);
  for (const word of words) {
    if (word.length >= 3) {
      const tag = `#${cap(word)}`;
      if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        tags.push(tag);
      }
    }
  }
  return tags;
}

/**
 * Build a structured YouTube description skeleton for a subject.
 * Sections: hook line, what-you'll-learn, chapters placeholder (optional),
 * links block (optional), hashtags line. Deterministic.
 * Returns an empty string when the subject is blank.
 */
export function buildDescriptionSkeleton(options: DescriptionOptions): string {
  const subject = clean(options.subject);
  if (subject === "") return "";
  const includeLinks = options.links ?? true;
  const includeChapters = options.chapters ?? true;

  const sections: string[] = [];

  sections.push(
    `${cap(subject)} — in this video I break down what actually matters, ` +
      `step by step. [Rewrite this first line as your hook: why should someone keep watching?]`
  );

  sections.push(
    [
      "WHAT YOU'LL LEARN",
      `• [Key point 1 about ${subject}]`,
      `• [Key point 2 about ${subject}]`,
      `• [Key point 3 about ${subject}]`,
    ].join("\n")
  );

  if (includeChapters) {
    sections.push(
      [
        "CHAPTERS",
        "00:00 Intro",
        `[00:00 Chapter about ${subject} — replace with your real timestamps]`,
        "[00:00 Add one line per chapter]",
      ].join("\n")
    );
  }

  if (includeLinks) {
    sections.push(
      [
        "LINKS & RESOURCES",
        "[Resource name] — [URL]",
        "[Resource name] — [URL]",
        "[Your website / newsletter — URL]",
      ].join("\n")
    );
  }

  const hashtags = subjectHashtags(subject);
  if (hashtags.length > 0) {
    sections.push(hashtags.join(" "));
  }

  return sections.join("\n\n");
}

export interface OrganisedKeywords {
  /** Unique hashtags (single # prefix, no internal spaces), shortest first. */
  hashtags: string[];
  /** Unique plain keywords/phrases, shortest first. */
  keywords: string[];
  hashtagCount: number;
  keywordCount: number;
  /** Unique entries across both groups. */
  total: number;
  /** How many case-insensitive duplicates were removed. */
  duplicatesRemoved: number;
}

/**
 * Parse comma- or newline-separated phrases into organised keyword groups.
 * Entries starting with "#" are normalised into hashtags (single # prefix,
 * internal spaces removed); everything else is a plain keyword. Duplicates
 * are removed case-insensitively (first occurrence's casing wins) and each
 * group is sorted shortest-first (alphabetical tie-break). Deterministic.
 */
export function organiseKeywords(rawText: string): OrganisedKeywords {
  const rawEntries = rawText
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

  const hashtags: string[] = [];
  const keywords: string[] = [];
  const seenHashtags = new Set<string>();
  const seenKeywords = new Set<string>();
  let parsed = 0;

  for (const entry of rawEntries) {
    if (entry.startsWith("#")) {
      const body = entry.replace(/^#+/, "").replace(/\s+/g, "");
      if (body === "") continue;
      parsed += 1;
      const tag = `#${body}`;
      const key = tag.toLowerCase();
      if (!seenHashtags.has(key)) {
        seenHashtags.add(key);
        hashtags.push(tag);
      }
    } else {
      const phrase = clean(entry);
      if (phrase === "") continue;
      parsed += 1;
      const key = phrase.toLowerCase();
      if (!seenKeywords.has(key)) {
        seenKeywords.add(key);
        keywords.push(phrase);
      }
    }
  }

  const byLengthThenAlpha = (a: string, b: string): number =>
    a.length - b.length || a.localeCompare(b, "en");

  hashtags.sort(byLengthThenAlpha);
  keywords.sort(byLengthThenAlpha);

  return {
    hashtags,
    keywords,
    hashtagCount: hashtags.length,
    keywordCount: keywords.length,
    total: hashtags.length + keywords.length,
    duplicatesRemoved: parsed - hashtags.length - keywords.length,
  };
}
