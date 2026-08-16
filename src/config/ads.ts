/**
 * Advertising configuration — single source of truth for monetisation.
 *
 * HOW IT WORKS
 * - `ADSENSE_ENABLED` loads the Google AdSense bootstrap script site-wide.
 *   This is required for AdSense site verification and for Auto ads.
 * - `AD_UNITS_ENABLED` controls whether the AdSlot placeholders on tool
 *   pages render manual ad units. Keep this false until the site is
 *   approved by AdSense AND a slot ID is filled in below for each position
 *   you want to use (create the units in the AdSense dashboard).
 *
 * IMPORTANT (UK/EEA): before serving personalised ads you must add a
 * Google-certified consent management platform (CMP). See MONETISATION.md.
 */

export const ADSENSE_CLIENT_ID = "ca-pub-4472252904102516";

/** Loads the AdSense script in <head> on every page (verification + Auto ads). */
export const ADSENSE_ENABLED = true;

/** Renders manual ad units inside AdSlot placeholders (needs slot IDs below). */
export const AD_UNITS_ENABLED = false;

export type AdSlotPosition = "after-input" | "after-explanation" | "before-related";

/**
 * AdSense ad-unit slot IDs per placeholder position. Create each unit in
 * the AdSense dashboard (Ads → By ad unit → Display ads) and paste its
 * data-ad-slot value here. Positions with an empty string render nothing.
 */
export const AD_SLOT_IDS: Record<AdSlotPosition, string> = {
  "after-input": "",
  "after-explanation": "",
  "before-related": "",
};
