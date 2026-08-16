/**
 * CV ↔ Job Description match analysis.
 *
 * Everything here is pure, deterministic and runs entirely in the browser —
 * no text ever leaves the device. This is a keyword-coverage heuristic, NOT
 * a real Applicant Tracking System, and results are illustrative only.
 *
 * Scoring formula (documented so the UI can explain it honestly):
 *   1. JD terms are extracted (single words + 2–3 word dictionary phrases).
 *   2. Each term is weighted:  weight = count + 2·(in skills dictionary)
 *                                       + 2·(appears on a requirement-style line)
 *   3. The top 25 terms by weight form the "target list".
 *   4. score = round(100 × Σ weight of target terms found in the CV
 *                        ÷ Σ weight of all target terms), capped at 0–100.
 */

export type SkillCategory =
  | "language"
  | "framework"
  | "cloud-devops"
  | "data"
  | "trade"
  | "healthcare"
  | "retail-hospitality"
  | "admin-office"
  | "soft-skill"
  | "qualification";

export interface MatchTerm {
  /** Canonical term (post alias-mapping), e.g. "javascript". */
  term: string;
  /** Occurrences in the job description. */
  count: number;
  /** Composite weight used for scoring (see module docs). */
  weight: number;
  /** Whether the term is in the curated skills dictionary. */
  inDictionary: boolean;
  category?: SkillCategory;
}

export type HardRequirementKind =
  | "experience"
  | "qualification"
  | "licence"
  | "right-to-work"
  | "certification";

export interface HardRequirement {
  kind: HardRequirementKind;
  /** Human-readable requirement, e.g. "5+ years' experience". */
  text: string;
  /** Heuristic: does the CV appear to mention something matching? */
  metInCv: boolean;
}

export interface SuggestionGroup {
  group: "skills" | "qualifications" | "other";
  label: string;
  terms: string[];
}

export interface CvMatchResult {
  /** 0–100 weighted keyword coverage. Not an ATS score. */
  score: number;
  matchedTerms: MatchTerm[];
  /** Prioritised: highest-weight missing terms first. */
  missingTerms: MatchTerm[];
  hardRequirements: HardRequirement[];
  suggestions: SuggestionGroup[];
  warnings: string[];
}

/**
 * Pluggable analyser interface so an AI-backed mode can be added later
 * without rewriting the UI. The local keyword analyser is the default.
 */
export interface MatchAnalyser {
  analyse(cvText: string, jdText: string): CvMatchResult;
}

/** How many top-weighted JD terms are used for scoring. */
export const TOP_TERM_LIMIT = 25;
/** A term repeated more than this many times in the CV triggers a stuffing warning. */
export const STUFFING_THRESHOLD = 8;

/* ------------------------------------------------------------------ */
/* Stopwords                                                           */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "so", "as",
  "of", "in", "on", "at", "to", "for", "from", "by", "with", "without",
  "into", "onto", "over", "under", "about", "across", "after", "before",
  "between", "during", "through", "up", "down", "out", "off", "per",
  "is", "am", "are", "was", "were", "be", "been", "being", "will", "would",
  "can", "could", "should", "shall", "may", "might", "must", "do", "does",
  "did", "done", "have", "has", "had", "having", "get", "got", "make",
  "makes", "made", "take", "takes", "use", "used", "using", "uses",
  "i", "we", "you", "he", "she", "it", "they", "them", "us", "our", "your",
  "their", "his", "her", "its", "my", "me", "this", "that", "these",
  "those", "there", "here", "who", "whom", "whose", "which", "what",
  "when", "where", "why", "how", "not", "no", "nor", "all", "any", "both",
  "each", "few", "more", "most", "other", "some", "such", "only", "own",
  "same", "too", "very", "just", "also", "well", "etc", "eg", "ie",
  "role", "job", "candidate", "candidates", "applicant", "applicants",
  "position", "company", "team", "teams", "work", "working", "works",
  "worked", "experience", "experienced", "ability", "able", "strong",
  "good", "great", "excellent", "ideal", "successful", "including",
  "include", "includes", "plus", "new", "within", "across", "based",
  "day", "days", "week", "weeks", "month", "months", "year", "years",
  "salary", "benefits", "apply", "application", "opportunity", "looking",
  "join", "us", "uk", "ltd", "limited", "plc",
]);

/* ------------------------------------------------------------------ */
/* Curated skills dictionary (~200 entries) + aliases                  */
/* ------------------------------------------------------------------ */

function buildDictionary(): Map<string, SkillCategory> {
  const d = new Map<string, SkillCategory>();
  const add = (category: SkillCategory, terms: string[]) => {
    for (const t of terms) d.set(t, category);
  };

  add("language", [
    "javascript", "typescript", "python", "java", "c#", "c++", "php",
    "ruby", "golang", "rust", "kotlin", "swift", "sql", "html", "css",
    "matlab", "scala", "perl", "bash", "powershell", "dart",
  ]);

  add("framework", [
    "react", "angular", "vue", "nextjs", "nodejs", "express", "django",
    "flask", "spring", "dotnet", "aspnet", "laravel", "rails", "jquery",
    "tailwind", "bootstrap", "graphql", "rest api", "redux", "svelte",
    "flutter", "react native", "wordpress", "shopify",
  ]);

  add("cloud-devops", [
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes",
    "terraform", "jenkins", "git", "github", "gitlab", "cicd", "linux",
    "ansible", "serverless", "devops", "microservices", "networking",
    "cybersecurity", "penetration testing",
  ]);

  add("data", [
    "excel", "power bi", "tableau", "pandas", "numpy", "machine learning",
    "deep learning", "data analysis", "data visualisation", "etl", "spark",
    "hadoop", "snowflake", "dbt", "statistics", "sas", "spss", "big data",
    "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "oracle",
    "looker", "google analytics",
  ]);

  add("trade", [
    "plumbing", "carpentry", "joinery", "welding", "bricklaying",
    "plastering", "scaffolding", "cscs", "forklift", "hgv", "cnc",
    "city and guilds", "gas safe", "health and safety", "manual handling",
    "risk assessment", "site management", "groundworks", "electrician",
    "decorating",
  ]);

  add("healthcare", [
    "nmc", "patient care", "phlebotomy", "medication administration",
    "care planning", "safeguarding", "dbs", "first aid", "cqc",
    "dementia care", "mental health", "nursing", "midwifery",
    "infection control", "moving and handling", "end of life care",
    "clinical audit", "care assistant",
  ]);

  add("retail-hospitality", [
    "customer service", "epos", "stock control", "merchandising",
    "cash handling", "food hygiene", "food safety", "barista",
    "till operation", "upselling", "front of house", "kitchen management",
    "housekeeping",
  ]);

  add("admin-office", [
    "microsoft office", "outlook", "data entry", "typing", "minute taking",
    "diary management", "crm", "salesforce", "sage", "xero", "quickbooks",
    "sap", "bookkeeping", "payroll", "invoicing", "reception",
    "switchboard", "audio typing", "copywriting", "proofreading",
    "telephone manner",
  ]);

  add("soft-skill", [
    "communication", "teamwork", "leadership", "problem solving",
    "time management", "attention to detail", "organisation",
    "adaptability", "creativity", "negotiation", "presentation skills",
    "stakeholder management", "project management", "agile", "scrum",
    "kanban", "critical thinking", "decision making",
    "conflict resolution", "mentoring", "coaching", "multitasking",
    "empathy", "resilience", "initiative", "collaboration",
    "customer focus", "self motivated",
  ]);

  add("qualification", [
    "degree", "bachelors", "masters", "phd", "gcse", "a level", "btec",
    "nvq", "apprenticeship", "chartered", "cipd", "acca", "cima", "aat",
    "cfa", "pmp", "itil", "cissp", "comptia", "ccna", "prince2",
    "driving licence", "right to work",
  ]);

  return d;
}

export const SKILLS_DICTIONARY: ReadonlyMap<string, SkillCategory> =
  buildDictionary();

/** Alias (normalised) → canonical dictionary term. */
const ALIASES = new Map<string, string>([
  ["js", "javascript"],
  ["ts", "typescript"],
  ["ecmascript", "javascript"],
  ["reactjs", "react"],
  ["react js", "react"],
  ["angularjs", "angular"],
  ["angular js", "angular"],
  ["vuejs", "vue"],
  ["vue js", "vue"],
  ["next js", "nextjs"],
  ["node", "nodejs"],
  ["node js", "nodejs"],
  ["expressjs", "express"],
  ["express js", "express"],
  ["go lang", "golang"],
  ["c sharp", "c#"],
  ["csharp", "c#"],
  ["cplusplus", "c++"],
  ["c plus plus", "c++"],
  ["dot net", "dotnet"],
  ["net core", "dotnet"],
  ["asp net", "aspnet"],
  ["k8s", "kubernetes"],
  ["ci cd", "cicd"],
  ["continuous integration", "cicd"],
  ["amazon web services", "aws"],
  ["postgres", "postgresql"],
  ["mongo", "mongodb"],
  ["elastic search", "elasticsearch"],
  ["powerbi", "power bi"],
  ["ms office", "microsoft office"],
  ["office 365", "microsoft office"],
  ["ms excel", "excel"],
  ["spreadsheets", "excel"],
  ["data viz", "data visualisation"],
  ["data visualization", "data visualisation"],
  ["organization", "organisation"],
  ["organisational", "organisation"],
  ["organizational", "organisation"],
  ["organisational skills", "organisation"],
  ["team player", "teamwork"],
  ["team work", "teamwork"],
  ["communicator", "communication"],
  ["communication skills", "communication"],
  ["problem solver", "problem solving"],
  ["self motivation", "self motivated"],
  ["customer services", "customer service"],
  ["customer care", "customer service"],
  ["first aider", "first aid"],
  ["driving license", "driving licence"],
  ["drivers licence", "driving licence"],
  ["drivers license", "driving licence"],
  ["full uk licence", "driving licence"],
  ["bsc", "bachelors"],
  ["beng", "bachelors"],
  ["ba hons", "bachelors"],
  ["bachelor", "bachelors"],
  ["msc", "masters"],
  ["meng", "masters"],
  ["master", "masters"],
  ["doctorate", "phd"],
  ["a levels", "a level"],
  ["gcses", "gcse"],
  ["health safety", "health and safety"],
  ["stock take", "stock control"],
  ["stocktaking", "stock control"],
  ["care plans", "care planning"],
  ["care plan", "care planning"],
  ["med administration", "medication administration"],
  ["machine learning engineer", "machine learning"],
  ["ml engineer", "machine learning"],
  ["restful", "rest api"],
  ["rest apis", "rest api"],
  ["restful api", "rest api"],
  ["restful apis", "rest api"],
]);

/* ------------------------------------------------------------------ */
/* Normalisation + tokenisation                                        */
/* ------------------------------------------------------------------ */

/** Lowercase, strip punctuation (keeping + and #), collapse whitespace. */
export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’‘]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .replace(/\s{2,}/g, " ");
}

function tokenise(normalised: string): string[] {
  return normalised.length === 0 ? [] : normalised.split(" ");
}

function canonicalise(term: string): string {
  return ALIASES.get(term) ?? term;
}

const REQUIREMENT_LINE_RE =
  /^\s*(?:[-•*‣▪·]|\d+[.)]\s)|\b(?:must|required|require|requirements?|essential|need to|needed|you will have|you'll have|you should have)\b/i;

interface TermStats {
  count: number;
  inRequirementLine: boolean;
}

/**
 * Extract canonical terms with counts from raw text.
 * Includes single words plus 2–3 word phrases that map to dictionary
 * entries (directly or via alias).
 */
function collectTerms(rawText: string): Map<string, TermStats> {
  const stats = new Map<string, TermStats>();
  const lines = rawText.split(/\r?\n/);

  const bump = (canonical: string, isReqLine: boolean) => {
    const existing = stats.get(canonical);
    if (existing) {
      existing.count += 1;
      existing.inRequirementLine = existing.inRequirementLine || isReqLine;
    } else {
      stats.set(canonical, { count: 1, inRequirementLine: isReqLine });
    }
  };

  for (const line of lines) {
    const isReqLine = REQUIREMENT_LINE_RE.test(line);
    const tokens = tokenise(normaliseText(line));

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      if (!STOPWORDS.has(word) && !/^\d+$/.test(word)) {
        bump(canonicalise(word), isReqLine);
      }
      // 2- and 3-word phrases: only kept when they resolve to a dictionary term.
      for (const len of [2, 3]) {
        if (i + len <= tokens.length) {
          const phrase = canonicalise(tokens.slice(i, i + len).join(" "));
          if (SKILLS_DICTIONARY.has(phrase)) bump(phrase, isReqLine);
        }
      }
    }
  }
  return stats;
}

/* ------------------------------------------------------------------ */
/* Hard requirements                                                   */
/* ------------------------------------------------------------------ */

const YEARS_RE = /(\d{1,2})\s*\+?\s*(?:or more\s+)?years?['’]?/gi;
const DEGREE_FIELD_RE =
  /\bdegree(?:\s+(?:qualification\s+)?in\s+([a-z][a-z ]{2,60}))?/i;
const DEGREE_MENTION_RE =
  /\b(?:degree|bsc|msc|mba|beng|meng|phd|bachelor'?s?|master'?s?|doctorate)\b/i;
const LICENCE_RE =
  /\b(?:full\s+(?:clean\s+)?(?:uk\s+)?)?driving\s+licen[cs]e\b|\bdriver'?s?\s+licen[cs]e\b/i;
const RIGHT_TO_WORK_RE = /right\s+to\s+work/i;

const CERT_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bcscs\b/i, label: "CSCS card" },
  { pattern: /\bdbs\b/i, label: "DBS check" },
  { pattern: /\bnvq\b/i, label: "NVQ" },
  { pattern: /\bgas safe\b/i, label: "Gas Safe registration" },
  { pattern: /\bnmc\b/i, label: "NMC registration" },
  { pattern: /\bprince2\b/i, label: "PRINCE2" },
  { pattern: /\bitil\b/i, label: "ITIL" },
  { pattern: /\bpmp\b/i, label: "PMP" },
  { pattern: /\bacca\b/i, label: "ACCA" },
  { pattern: /\bcima\b/i, label: "CIMA" },
  { pattern: /\bcipd\b/i, label: "CIPD" },
  { pattern: /\bsia\s+licen[cs]e|\bsia\b/i, label: "SIA licence" },
  { pattern: /\bfirst aid\b/i, label: "First aid certificate" },
  { pattern: /\bfood hygiene\b/i, label: "Food hygiene certificate" },
];

function maxYearsMentioned(text: string): number | null {
  let max: number | null = null;
  YEARS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = YEARS_RE.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && (max === null || n > max)) max = n;
  }
  return max;
}

function trimDegreeField(field: string): string {
  const cut = field.split(
    /\s+(?:or|and|with|is|are|would|essential|required|desirable|preferred|ideal(?:ly)?|related|similar|equivalent|advantageous|beneficial)\b/i
  )[0];
  return cut.trim().split(/\s+/).slice(0, 4).join(" ");
}

export function extractHardRequirements(
  jdText: string,
  cvText: string
): HardRequirement[] {
  const requirements: HardRequirement[] = [];
  const cvNormalised = normaliseText(cvText);

  // Years of experience — take the highest figure the JD asks for.
  const jdYears = maxYearsMentioned(jdText);
  if (jdYears !== null) {
    const cvYears = maxYearsMentioned(cvText);
    requirements.push({
      kind: "experience",
      text: `${jdYears}+ years' experience`,
      metInCv: cvYears !== null && cvYears >= jdYears,
    });
  }

  // Degree (optionally "degree in X").
  const degreeMatch = DEGREE_FIELD_RE.exec(jdText);
  if (degreeMatch || DEGREE_MENTION_RE.test(jdText)) {
    const rawField = degreeMatch?.[1] ? trimDegreeField(degreeMatch[1]) : "";
    const cvHasDegree = DEGREE_MENTION_RE.test(cvText);
    const fieldInCv =
      rawField.length === 0 ||
      cvNormalised.includes(normaliseText(rawField));
    requirements.push({
      kind: "qualification",
      text: rawField ? `Degree in ${rawField}` : "Degree-level qualification",
      metInCv: cvHasDegree && fieldInCv,
    });
  }

  if (LICENCE_RE.test(jdText)) {
    requirements.push({
      kind: "licence",
      text: "Driving licence",
      metInCv: LICENCE_RE.test(cvText),
    });
  }

  if (RIGHT_TO_WORK_RE.test(jdText)) {
    requirements.push({
      kind: "right-to-work",
      text: "Right to work in the UK",
      metInCv: RIGHT_TO_WORK_RE.test(cvText),
    });
  }

  for (const cert of CERT_KEYWORDS) {
    if (cert.pattern.test(jdText)) {
      requirements.push({
        kind: "certification",
        text: cert.label,
        metInCv: cert.pattern.test(cvText),
      });
    }
  }

  return requirements;
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

function wordCount(text: string): number {
  return tokenise(normaliseText(text)).filter((t) => t.length > 0).length;
}

function compareTerms(a: MatchTerm, b: MatchTerm): number {
  if (b.weight !== a.weight) return b.weight - a.weight;
  if (b.count !== a.count) return b.count - a.count;
  return a.term.localeCompare(b.term);
}

export function analyseCvMatch(cvText: string, jdText: string): CvMatchResult {
  const warnings: string[] = [];
  const cvWords = wordCount(cvText);
  const jdWords = wordCount(jdText);

  if (cvWords > 0 && cvWords < 120) {
    warnings.push(
      "Your CV text looks very short — paste the full CV (including your skills and work history) for a meaningful comparison."
    );
  }
  if (jdWords > 0 && jdWords < 40) {
    warnings.push(
      "The job description looks very short — paste the full advert, especially the requirements section, for a meaningful comparison."
    );
  }

  const jdStats = collectTerms(jdText);
  const cvStats = collectTerms(cvText);

  // Keyword-stuffing check on the CV.
  const stuffed = Array.from(cvStats.entries())
    .filter(([term, s]) => s.count > STUFFING_THRESHOLD && !STOPWORDS.has(term))
    .map(([term]) => term)
    .sort();
  if (stuffed.length > 0) {
    warnings.push(
      `Possible keyword stuffing: "${stuffed.join('", "')}" ${
        stuffed.length === 1 ? "appears" : "each appear"
      } more than ${STUFFING_THRESHOLD} times in your CV. Recruiters and ATS filters can penalise repetition — vary your wording.`
    );
  }

  // Build weighted JD candidate terms.
  const candidates: MatchTerm[] = [];
  for (const [term, s] of jdStats.entries()) {
    const inDictionary = SKILLS_DICTIONARY.has(term);
    // Non-dictionary single words must earn their place: mentioned at least
    // twice, or mentioned on a requirement-style line and reasonably long.
    if (!inDictionary) {
      if (term.includes(" ")) continue;
      if (term.length < 3) continue;
      if (s.count < 2 && !(s.inRequirementLine && term.length >= 4)) continue;
    }
    candidates.push({
      term,
      count: s.count,
      weight: s.count + (inDictionary ? 2 : 0) + (s.inRequirementLine ? 2 : 0),
      inDictionary,
      category: SKILLS_DICTIONARY.get(term),
    });
  }
  candidates.sort(compareTerms);

  const topTerms = candidates.slice(0, TOP_TERM_LIMIT);
  const matchedTerms: MatchTerm[] = [];
  const missingTerms: MatchTerm[] = [];
  for (const t of topTerms) {
    if (cvStats.has(t.term)) matchedTerms.push(t);
    else missingTerms.push(t);
  }

  const totalWeight = topTerms.reduce((sum, t) => sum + t.weight, 0);
  const matchedWeight = matchedTerms.reduce((sum, t) => sum + t.weight, 0);
  const score =
    totalWeight === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((matchedWeight / totalWeight) * 100)));

  if (totalWeight === 0) {
    warnings.push(
      "No meaningful keywords could be extracted from the job description, so a score could not be calculated."
    );
  }

  // Suggestions: group the highest-weight missing terms.
  const skillTerms: string[] = [];
  const qualificationTerms: string[] = [];
  const otherTerms: string[] = [];
  for (const t of missingTerms) {
    if (t.category === "qualification") qualificationTerms.push(t.term);
    else if (t.inDictionary) skillTerms.push(t.term);
    else otherTerms.push(t.term);
  }
  const suggestions: SuggestionGroup[] = [];
  if (skillTerms.length > 0) {
    suggestions.push({
      group: "skills",
      label: "Skills to mention (if you genuinely have them)",
      terms: skillTerms.slice(0, 8),
    });
  }
  if (qualificationTerms.length > 0) {
    suggestions.push({
      group: "qualifications",
      label: "Qualifications the advert mentions",
      terms: qualificationTerms.slice(0, 8),
    });
  }
  if (otherTerms.length > 0) {
    suggestions.push({
      group: "other",
      label: "Other wording from the advert worth reflecting",
      terms: otherTerms.slice(0, 8),
    });
  }

  return {
    score,
    matchedTerms,
    missingTerms,
    hardRequirements: extractHardRequirements(jdText, cvText),
    suggestions,
    warnings,
  };
}

/** Local, in-browser keyword analyser — the default implementation. */
export const localMatchAnalyser: MatchAnalyser = {
  analyse: analyseCvMatch,
};

export default localMatchAnalyser;
