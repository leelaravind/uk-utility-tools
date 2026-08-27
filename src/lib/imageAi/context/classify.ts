/**
 * Probabilistic image-kind classification.
 *
 * This is a transparent scoring function over injected signals, not a model.
 * That is a deliberate choice: it costs nothing, it runs on every device, and
 * every decision it makes can be explained to the visitor from the signals it
 * was given.
 *
 * It never returns a bare category. Callers get a confidence, the signals the
 * decision was based on, and the runner-up scores, so the UI and the copied
 * context can say "probably a screenshot" rather than asserting a fact the
 * evidence does not support.
 */

import { roundConfidence, roundTo } from "./geometry";
import type { Classification, ClassificationSignals, ImageKind } from "./types";

/** Below this score for every kind we admit we do not know. */
const UNKNOWN_SCORE_THRESHOLD = 0.25;

/** Two kinds within this distance are reported as "mixed", not guessed at. */
const MIXED_MARGIN = 0.08;

/** Confidence is clamped into this range — never 0, never 1. */
const MIN_CONFIDENCE = 0.05;
const MAX_CONFIDENCE = 0.95;

/** Linear ramp from 0 at `lo` to 1 at `hi`, clamped at both ends. */
function ramp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return 0;
  if (hi === lo) return value >= hi ? 1 : 0;
  const t = (value - lo) / (hi - lo);
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

/** Signal indicators, derived once and shared by all four scorers. */
interface Indicators {
  textHeavy: number;
  textPresent: number;
  textAbsent: number;
  /** Peaks for label-sized amounts of text: present, but not prose. */
  textSparse: number;
  rectMany: number;
  rectFew: number;
  flatHigh: number;
  flatLow: number;
  entropyHigh: number;
  entropyLow: number;
  edgeHigh: number;
}

function indicatorsFrom(s: ClassificationSignals): Indicators {
  const textPresent = ramp(s.textDensity, 0.005, 0.12);
  return {
    textHeavy: ramp(s.textDensity, 0.05, 0.45),
    textPresent,
    textAbsent: 1 - ramp(s.textDensity, 0.01, 0.1),
    textSparse:
      ramp(s.textDensity, 0.003, 0.05) * (1 - ramp(s.textDensity, 0.12, 0.3)),
    rectMany: ramp(s.rectangleCount, 3, 25),
    rectFew: 1 - ramp(s.rectangleCount, 1, 10),
    flatHigh: ramp(s.flatRegionRatio, 0.25, 0.75),
    flatLow: 1 - ramp(s.flatRegionRatio, 0.15, 0.5),
    entropyHigh: ramp(s.entropy, 0.45, 0.85),
    entropyLow: 1 - ramp(s.entropy, 0.2, 0.6),
    edgeHigh: ramp(s.edgeDensity, 0.2, 0.5),
  };
}

/**
 * Each score is a weighted average in [0,1] multiplied by a "gate": a factor
 * that collapses the score when the kind's defining evidence is missing. The
 * gate is what stops a blank white rectangle scoring highly as a document
 * simply because it is flat and low-entropy.
 */
function scoreKinds(i: Indicators): Record<
  "photo" | "screenshot" | "document" | "diagram",
  number
> {
  const photo =
    (0.3 * i.textAbsent +
      0.3 * i.entropyHigh +
      0.25 * i.flatLow +
      0.15 * i.rectFew) *
    // A photo needs either visual detail or something other than flat colour.
    (0.25 + 0.75 * Math.max(i.entropyHigh, 1 - i.flatHigh));

  const screenshot =
    (0.28 * i.textPresent +
      0.27 * i.rectMany +
      0.25 * i.flatHigh +
      0.2 * i.entropyLow) *
    // A screenshot needs text or interface rectangles.
    (0.2 + 0.8 * Math.max(i.textPresent, i.rectMany));

  const document =
    (0.35 * i.textHeavy +
      0.25 * i.flatHigh +
      0.2 * i.entropyLow +
      0.2 * i.rectFew) *
    // A document without text is not a document.
    (0.25 + 0.75 * i.textPresent);

  const diagram =
    (0.35 * i.edgeHigh +
      0.25 * i.textSparse +
      0.2 * i.flatHigh +
      0.2 * i.entropyLow) *
    // A diagram needs BOTH drawn strokes and only label-sized amounts of text.
    // Requiring both (rather than either) is what stops a text-heavy page or a
    // bordered interface being read as a flow chart.
    (0.15 + 0.85 * Math.min(i.edgeHigh, i.textSparse));

  return { photo, screenshot, document, diagram };
}

/**
 * Confidence falls as the runner-up approaches the winner. Squaring the ratio
 * keeps a clear winner confident while punishing near-ties hard.
 */
function confidenceFor(top: number, second: number): number {
  if (top <= 0) return MIN_CONFIDENCE;
  const ratio = Math.min(1, Math.max(0, second / top));
  const raw = top * (1 - 0.6 * ratio * ratio);
  return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, raw));
}

/** Default signals: everything absent. Used when no pixel pass was possible. */
export const EMPTY_SIGNALS: ClassificationSignals = {
  textDensity: 0,
  edgeDensity: 0,
  rectangleCount: 0,
  flatRegionRatio: 0,
  entropy: 0,
};

/**
 * Classify an image from its measured signals.
 *
 * Returns "mixed" when two kinds score within `MIXED_MARGIN` of each other and
 * "unknown" when nothing scores meaningfully — both are real answers, not
 * failures, and both are far more useful downstream than a confident guess.
 */
export function classifyImage(signals: ClassificationSignals): Classification {
  // No pixel pass ran, so every visual signal is absent rather than measured
  // as zero. Guessing from text density alone cannot separate a document from
  // a screenshot, so the honest answer is that the kind is unknown.
  const hasPixelEvidence =
    signals.edgeDensity > 0 ||
    signals.flatRegionRatio > 0 ||
    signals.entropy > 0 ||
    signals.rectangleCount > 0;
  if (!hasPixelEvidence) {
    return {
      kind: "unknown",
      confidence: MIN_CONFIDENCE,
      signals,
      scores: {},
    };
  }

  const scores = scoreKinds(indicatorsFrom(signals));

  const ranked = (
    Object.entries(scores) as Array<[ImageKind, number]>
  ).sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]));

  const rounded: Partial<Record<ImageKind, number>> = {};
  for (const [kind, score] of ranked) rounded[kind] = roundTo(score, 3);

  const [topKind, topScore] = ranked[0];
  const [secondKind, secondScore] = ranked[1];

  if (topScore < UNKNOWN_SCORE_THRESHOLD) {
    return {
      kind: "unknown",
      confidence: roundConfidence(Math.max(MIN_CONFIDENCE, topScore)),
      signals,
      scores: rounded,
    };
  }

  if (topScore - secondScore < MIXED_MARGIN) {
    return {
      kind: "mixed",
      confidence: roundConfidence(
        Math.min(MAX_CONFIDENCE, (topScore + secondScore) / 2),
      ),
      signals,
      scores: rounded,
      mixedOf: [topKind, secondKind],
    };
  }

  return {
    kind: topKind,
    confidence: roundConfidence(confidenceFor(topScore, secondScore)),
    signals,
    scores: rounded,
  };
}

const KIND_NOUNS: Record<ImageKind, string> = {
  photo: "a photo",
  screenshot: "a screenshot",
  document: "a document",
  diagram: "a diagram",
  mixed: "a mix of kinds",
  unknown: "an unrecognised kind of image",
};

/** Plain-English label for the UI, e.g. "Probably a screenshot (59%)". */
export function describeClassification(c: Classification): string {
  const percent = Math.round(c.confidence * 100);
  if (c.kind === "unknown") {
    return `Kind not determined (${percent}% confidence)`;
  }
  if (c.kind === "mixed" && c.mixedOf) {
    return `Mixed — parts look like ${KIND_NOUNS[c.mixedOf[0]]} and parts like ${KIND_NOUNS[c.mixedOf[1]]} (${percent}% confidence)`;
  }
  return `Probably ${KIND_NOUNS[c.kind]} (${percent}% confidence)`;
}

/** True for kinds where OCR and layout heuristics carry most of the meaning. */
export function isTextCentric(kind: ImageKind): boolean {
  return kind === "screenshot" || kind === "document" || kind === "mixed";
}
