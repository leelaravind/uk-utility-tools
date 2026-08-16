import { AD_SLOT_IDS, AD_UNITS_ENABLED, type AdSlotPosition } from "@/config/ads";
import { AdUnit } from "./AdUnit";

export interface AdSlotProps {
  position: AdSlotPosition;
}

/**
 * Monetisation placeholder baked into ToolLayout at three positions.
 *
 * Renders nothing (no fake ads, no reserved space) until BOTH:
 *   1. AD_UNITS_ENABLED is true in src/config/ads.ts, and
 *   2. a slot ID is configured for this position.
 * Flipping those on renders a labelled responsive AdSense unit — no page
 * code changes needed. See MONETISATION.md for the full enable checklist.
 */
export function AdSlot({ position }: AdSlotProps) {
  const slotId = AD_SLOT_IDS[position];
  if (!AD_UNITS_ENABLED || !slotId) return null;
  return <AdUnit slotId={slotId} />;
}
