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

/**
 * Loads the AdSense script in <head> on every page (verification + Auto ads).
 *
 * TEMPORARILY DISABLED 2026-08-17 for the Google Safe Browsing review of the
 * itisyou.app domain network. The forensic audit ranked "new domain + login
 * flow + freshly-added AdSense" as the strongest combined trigger for the
 * "possible phishing on user login" flag on space.itisyou.app. AdSense is
 * deferred across the network until clean domain reputation is re-established
 * and the review is cleared; the client ID and all config below are preserved
 * for reuse — flip this back to `true` and redeploy to restore monetisation.
 * See F:\Meditation\docs\records\GOOGLE-PHISHING-REVIEW-READINESS-2026-08-17.md.
 */
export const ADSENSE_ENABLED = true;

/** Renders manual ad units inside AdSlot placeholders (needs slot IDs below). */
export const AD_UNITS_ENABLED = true;

export type AdSlotPosition = "after-input" | "after-explanation" | "before-related";

/**
 * AdSense ad-unit slot IDs per placeholder position. Create each unit in
 * the AdSense dashboard (Ads → By ad unit → Display ads) and paste its
 * data-ad-slot value here. Positions with an empty string render nothing.
 */
export const AD_SLOT_IDS: Record<AdSlotPosition, string> = {
  // The "tools" display unit. One unit is reused across positions deliberately: a single
  // responsive unit placed after the content a visitor came for, rather than three
  // separate units competing with the tool itself. Give a position its own id here when
  // there is a reason to measure it separately.
  "after-input": "5908390611",
  "after-explanation": "5908390611",
  "before-related": "5908390611",
};
