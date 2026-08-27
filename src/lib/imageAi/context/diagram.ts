/**
 * Diagram handling — mostly a list of things this tool cannot tell you.
 *
 * Diagrams carry their meaning in arrows, containment and adjacency. Without a
 * semantic vision model none of that is recoverable from OCR, and inventing a
 * graph from label positions would produce confident nonsense. So for diagrams
 * the tool reports the labels it read, their spatial order, and an explicit
 * statement of what is missing.
 */

import { describePosition } from "./geometry";
import type { ClassificationSignals, OCRBlock } from "./types";

export interface DiagramNotes {
  /** Labels in reading order, exactly as recognised. */
  labels: string[];
  /** Coarse spatial description per label, e.g. 'Start' at top-left. */
  placements: string[];
  limitations: string[];
}

/** Limitations that always apply to a diagram in this build. */
export const DIAGRAM_BASE_LIMITATIONS: readonly string[] = [
  "Arrows and connections between diagram elements were not detected, so the direction and order of flow is unknown.",
  "Containment and grouping between diagram elements were not detected.",
];

/** Small labels are exactly where OCR is least reliable. */
const SMALL_LABEL_HEIGHT = 0.02;

const MAX_LABELS = 80;

export function inferDiagramNotes(
  blocks: OCRBlock[],
  signals?: ClassificationSignals,
): DiagramNotes {
  const labels: string[] = [];
  const placements: string[] = [];
  let smallLabels = 0;

  for (const block of blocks) {
    const text = block.text.trim();
    if (text.length === 0) continue;
    if (labels.length < MAX_LABELS) {
      labels.push(text);
      placements.push(
        block.bbox ? `"${text}" at ${describePosition(block.bbox)}` : `"${text}"`,
      );
    }
    if (block.bbox && block.bbox.height < SMALL_LABEL_HEIGHT) smallLabels += 1;
  }

  const limitations = [...DIAGRAM_BASE_LIMITATIONS];
  if (smallLabels > 0) {
    limitations.push(
      "Some diagram labels are very small, so their text may contain OCR errors.",
    );
  }
  if (signals && signals.edgeDensity > 0.35 && labels.length === 0) {
    limitations.push(
      "The image contains many lines but no readable labels, so only its shape could be described.",
    );
  }
  return { labels, placements, limitations };
}
