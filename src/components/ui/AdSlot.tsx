export interface AdSlotProps {
  position: "after-input" | "after-explanation" | "before-related";
}

/**
 * Future monetisation hook. Intentionally renders nothing in v1 — no fake
 * ads, no reserved space. Tool pages should still place these so ad units
 * can be enabled later without touching page code.
 */
export function AdSlot({ position }: AdSlotProps) {
  void position;
  return null;
}
