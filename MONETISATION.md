# Monetisation

The site is wired for Google AdSense but ships with ad units **off** so pages
stay clean until the account is approved and you deliberately switch them on.
Everything is controlled from one file: `src/config/ads.ts`.

## Account status

Google AdSense is **under review** — no decision has been recorded either way.

The verification setup is preserved and unchanged: the publisher client ID in
`src/config/ads.ts`, `public/ads.txt` (served at `/ads.txt`) and the `<head>`
script wiring in `src/app/layout.tsx`.

A local, uncommitted change setting `ADSENSE_ENABLED` to `false` was written on
2026-08-17 as a proposed pause during
a Google Safe Browsing review of the wider itisyou.app domain network: a
forensic audit ranked "new domain + login flow + freshly-added AdSense" as the
strongest combined trigger for the possible-phishing flag raised on
`space.itisyou.app`. AdSense is deferred across the network until clean domain
reputation is re-established and the review clears. Flipping the constant back
to `true` and redeploying restores the script — the full reasoning is in the
comment above it.

## Current state (as deployed)

| Setting | Value | Effect |
|---|---|---|
| `ADSENSE_CLIENT_ID` | `ca-pub-4472252904102516` | Your publisher ID |
| `ADSENSE_ENABLED` | `true` (deployed) | When `true`, the AdSense bootstrap script loads in `<head>` on every page — this is what AdSense **site verification** checks, and it is all Auto ads needs. Deployed as `true` so the review can find the code; see *Account status* above |
| `AD_UNITS_ENABLED` | `false` | Manual ad placeholders render nothing |
| `public/ads.txt` | `google.com, pub-4472252904102516, DIRECT, f08c47fec0942fa0` | Served at `/ads.txt`; AdSense's alternative verification method and required for full revenue eligibility |

## Where ads can appear

Every tool page renders three `AdSlot` placeholders via `ToolLayout`, in the
positions recommended for utility pages:

1. `after-input` — below the calculator/result area
2. `after-explanation` — below the "How it works" section
3. `before-related` — above the Related Tools grid

They render **nothing** (no reserved space, no layout shift) until enabled.

## Enable checklist (after AdSense approval)

1. **Consent (required for UK/EEA traffic)**: in AdSense go to *Privacy &
   messaging* and publish a GDPR consent message (Google's certified CMP),
   or integrate another certified CMP. Do not enable personalised ads for
   UK/EEA visitors without this — it is a Google policy requirement.
2. **Option A — Auto ads (zero code)**: turn on Auto ads for
   `tools.itisyou.app` in the AdSense dashboard. The script already in the
   page `<head>` does the rest. Nothing to deploy.
3. **Option B — manual placements (recommended for layout control)**:
   - In AdSense: *Ads → By ad unit → Display ads*, create up to three units
     (e.g. "tool-after-input"), copy each unit's `data-ad-slot` number.
   - In `src/config/ads.ts`: paste the IDs into `AD_SLOT_IDS` and set
     `AD_UNITS_ENABLED = true`.
   - `npm run build && npx wrangler deploy` (or push to `main` once CI is
     connected).
4. **Privacy page**: `/privacy` already discloses the AdSense script and
   consent behaviour — re-read it after enabling to confirm it still matches
   reality.

## Turning everything off

Set `ADSENSE_ENABLED = false` and `AD_UNITS_ENABLED = false` in
`src/config/ads.ts` and redeploy. The site returns to zero third-party
requests.

## Other revenue hooks (future)

The original architecture also anticipates: affiliate links (place inside
tool explanations), premium exports, and paid AI-assisted career tools
(`MatchAnalyser` / `AnswerEngine` interfaces are ready for an AI backend).
None are implemented in v1.
