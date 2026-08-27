/**
 * Importance classification for recognised lines of text.
 *
 * Specification §29 rule 13: never drop an explicit error message to save
 * tokens. That rule needs a definition of "explicit error message", and this
 * module is it. The classifier is also used to decide what the tagged-text
 * IMPORTANT section contains and which lines survive compaction.
 *
 * These patterns detect *significance*, never truth. A line matching the error
 * pattern is text that looks like an error in the image — the tool does not
 * claim the error is real, current, or about anything in particular.
 */

import type { OCRBlock } from "./types";

export type LineImportance =
  | "error"
  | "warning"
  | "code"
  | "url"
  | "money"
  | "date"
  | "action"
  | "normal";

/** HTTP statuses common enough to be worth recognising as identifiers. */
const HTTP_STATUS =
  "(?:400|401|403|404|408|409|410|422|429|500|502|503|504)";

/** Ranked highest-first: the first matching category wins. */
const PATTERNS: Array<{ importance: LineImportance; pattern: RegExp }> = [
  {
    importance: "error",
    pattern:
      /\b(error|failed|failure|cannot|can't|couldn't|could not|unable to|denied|invalid|not found|unauthori[sz]ed|forbidden|timed out|timeout|crash(ed)?|exception|rejected|declined|expired)\b/i,
  },
  {
    importance: "warning",
    pattern:
      /\b(warning|caution|attention|deprecated|unsupported|insecure|unsaved|are you sure|will be (deleted|lost|removed))\b/i,
  },
  {
    importance: "url",
    pattern:
      /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|dev|app|co\.uk|uk)\b/i,
  },
  {
    importance: "money",
    pattern: /(?:[£$€]\s?\d|(?:\d[\d,]*\.\d{2})\s?(?:GBP|USD|EUR))/,
  },
  {
    importance: "date",
    pattern:
      /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:\d{1,2}\s)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{1,4})\b/i,
  },
  {
    importance: "code",
    // Only shapes that are unambiguously identifiers: an HTTP status with its
    // label or standing alone, a prefixed error code, a hex id, or a
    // SCREAMING_SNAKE constant. A three-digit number inside a sentence is not
    // a code — "500 items in stock" is prose.
    pattern: new RegExp(
      [
        `^${HTTP_STATUS}$`,
        `\\b[Hh][Tt][Tt][Pp][\\s/\\d.]*${HTTP_STATUS}\\b`,
        "\\b[A-Z]{2,}[-_]\\d{2,}\\b",
        "\\b0x[0-9a-f]{4,}\\b",
        "\\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\\b",
      ].join("|"),
    ),
  },
];

/**
 * Words that appear on interactive controls. Kept short and specific: a long
 * list produces false positives on prose, which then inflates the output.
 */
export const ACTION_WORDS: readonly string[] = [
  "ok",
  "cancel",
  "retry",
  "try again",
  "submit",
  "save",
  "continue",
  "next",
  "back",
  "close",
  "sign in",
  "log in",
  "login",
  "sign up",
  "log out",
  "delete",
  "confirm",
  "apply",
  "done",
  "send",
  "update",
  "upgrade",
  "allow",
  "deny",
  "accept",
  "decline",
  "got it",
  "learn more",
  "start",
  "stop",
  "edit",
  "add",
  "remove",
  "download",
  "upload",
  "open",
  "search",
  "refresh",
  "reload",
  "install",
  "subscribe",
  "checkout",
  "pay now",
  "reset",
  "yes",
  "no",
  "skip",
  "finish",
  "create",
  "connect",
  "disconnect",
];

const ACTION_SET = new Set(ACTION_WORDS);

/** True when a short line reads like a button label rather than prose. */
export function looksLikeAction(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.!…]+$/, "");
  if (normalized.length === 0 || normalized.length > 24) return false;
  if (ACTION_SET.has(normalized)) return true;
  // "Retry now", "Save changes" — an action word leading a two or three word
  // phrase still reads as a control.
  const words = normalized.split(/\s+/);
  return words.length <= 3 && ACTION_SET.has(words[0]);
}

/** Classify one line. Returns "normal" when nothing notable is present. */
export function classifyLine(text: string): LineImportance {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "normal";
  for (const { importance, pattern } of PATTERNS) {
    if (pattern.test(trimmed)) return importance;
  }
  if (looksLikeAction(trimmed)) return "action";
  return "normal";
}

/** Lines that must survive compaction, in the order they were recognised. */
export const PROTECTED_IMPORTANCE: readonly LineImportance[] = [
  "error",
  "warning",
  "code",
  "url",
  "money",
  "date",
];

/** True when this line may never be dropped to save tokens. */
export function isProtected(importance: LineImportance): boolean {
  return PROTECTED_IMPORTANCE.includes(importance);
}

export interface ImportantLine {
  text: string;
  importance: LineImportance;
  blockId?: string;
}

/**
 * Pull out the lines worth surfacing separately. Deliberately conservative:
 * only error and warning lines reach the tagged-text IMPORTANT section, since
 * a section full of every number in a spreadsheet helps nobody.
 */
export function findImportantLines(blocks: OCRBlock[]): ImportantLine[] {
  const out: ImportantLine[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const importance = classifyLine(block.text);
    if (importance !== "error" && importance !== "warning") continue;
    const key = block.text.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text: block.text.trim(), importance, blockId: block.id });
  }
  return out;
}

/** Every protected line, used when compaction has to choose what to keep. */
export function protectedBlockIds(blocks: OCRBlock[]): Set<string> {
  const ids = new Set<string>();
  for (const block of blocks) {
    if (isProtected(classifyLine(block.text))) ids.add(block.id);
  }
  return ids;
}
