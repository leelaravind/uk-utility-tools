/**
 * Deterministic pseudo-randomness for answer composition.
 *
 * Every draft must be reproducible: the same inputs plus the same variation
 * number always produce the same answer, which is what makes the engine
 * unit-testable and lets the UI offer "regenerate" without surprises. So no
 * `Math.random()` anywhere in the composer — all variation flows from a seed
 * derived from the visitor's own inputs.
 */

/** FNV-1a, 32-bit. Small, fast, and stable across runtimes. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619, kept in 32-bit range without overflowing to float.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, max). Returns 0 when max <= 0. */
  int(max: number): number;
  /** Uniform pick. Returns undefined for an empty list. */
  pick<T>(items: readonly T[]): T | undefined;
}

/**
 * mulberry32 — a compact, well-distributed 32-bit generator. Ample quality
 * for choosing sentences, and it needs no dependency.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(max: number): number {
      if (!Number.isFinite(max) || max <= 0) return 0;
      return Math.floor(next() * max);
    },
    pick<T>(items: readonly T[]): T | undefined {
      if (items.length === 0) return undefined;
      return items[Math.floor(next() * items.length)];
    },
  };
}

/**
 * Weighted pick without replacement bookkeeping — the caller supplies the
 * weight for each candidate. Weights of zero or less are skipped.
 */
export function pickWeighted<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
): T | undefined {
  let total = 0;
  for (const item of items) {
    const w = weightOf(item);
    if (w > 0) total += w;
  }
  if (total <= 0) return rng.pick(items);

  let threshold = rng.next() * total;
  for (const item of items) {
    const w = weightOf(item);
    if (w <= 0) continue;
    threshold -= w;
    if (threshold <= 0) return item;
  }
  return items[items.length - 1];
}
