# Implementation Status

Last updated: 2026-08-27

## Branding and scope

The platform identity is **ITISYOU Tools** and the platform is global. Some
calculators remain UK-specific because they implement UK law — UK income tax,
National Insurance, student loan plans, Scottish bands and the 5.6-week
statutory holiday rules — and those keep their UK terminology and are labelled
as UK tools in the registry. Site-wide strings carry no UK-only positioning.

A shared currency module (`src/lib/currency.ts`) supports GBP, USD and EUR for
tools whose maths is currency-neutral; UK-tax-specific tools stay GBP-only
because their bands and thresholds are defined in pounds.

## Search and monetisation status

- **Google Search Console**: verified — the property is collecting clicks.
- **Google AdSense**: under review; no decision either way. The verification
  setup is preserved (publisher client ID, `public/ads.txt`, the `<head>`
  script wiring in `src/app/layout.tsx`). `ADSENSE_ENABLED` is currently
  `false` — a deliberate pause during a Google Safe Browsing review of the
  wider itisyou.app domain network, documented in the comment above the
  constant in `src/config/ads.ts`.

## Image Tools for AI

Two modes of one experience, shipped on two routes that share
`src/components/tools/image-ai/ImageAiIsland.tsx`:

| Route | Mode | Status |
|---|---|---|
| `/image-ai-optimizer` | Optimize Image | Complete. Featured in the hero slot on the landing page. |
| `/image-context` | Image to AI Context | Complete, with semantic vision deliberately at Tier C (see below). |

**Image token estimation** lives only in `src/config/imageProviders/`, a
versioned provider configuration carrying a `source` URL and a `lastVerified`
date per profile, with staleness surfaced in the UI after 180 days. Claude is
the only provider with a documented, reproducible rule (28x28 visual patches;
2576px/4784 tokens on the high-resolution tier, 1568px/1568 on standard) and is
therefore the only provider given a number. OpenAI, Gemini and Grok report
"varies by model" rather than a fabricated estimate.

Savings are always computed by simulating the provider's own automatic resize
on both the original and the optimised copy, so the tool never claims a
reduction the provider's downscaling had already taken. Verified: a 4K to 1080p
optimisation on the standard tier correctly reports 0%.

**Semantic vision is deliberately not shipped.** The specification requires a
measured technical spike before bundling a browser vision model; that
measurement has not been done, so the model registry is empty and output is
OCR plus layout heuristics. This is stated in the UI and in every result's
limitations. There is no cloud fallback.

**Known limitation:** `tesseract.js` fetches its WASM core and language data
from its default CDN on first analysis. Those requests carry no image data and
nothing derived from an image, so the privacy boundary holds, but self-hosting
is preferred by the specification. `src/lib/imageAi/context/ocr/assets.ts` is
the single switch; it is not flipped because vendoring adds roughly 15-35 MB of
binaries to the repository and every deployment. See `DEPENDENCY_NOTES.md`.

Full contributor guide: `IMAGE_AI_ARCHITECTURE.md`.

## Deployment

| | |
|---|---|
| **Production URL** | https://tools.itisyou.app (Cloudflare Workers custom domain, DNS + certificate auto-provisioned) |
| **Platform URL** | https://uk-utility-tools.kpleelaaravind.workers.dev |
| **Hosting** | Cloudflare Workers static assets (`wrangler deploy`, config in `wrangler.jsonc`) with a thin `worker.js` wrapper that adds `charset=utf-8` to HTML responses |
| **Repository** | Local git repository at the project root, branch `main` (no remote configured) |

## Tools completed (17/17)

| Tool | Route | Engine | Tests |
|---|---|---|---|
| Shift Pay Calculator | `/shift-pay` | `src/lib/calc/shiftPay.ts` | ✅ |
| UK Salary / Take-Home Calculator | `/salary` | `src/lib/calc/salary.ts` + `src/config/ukTax/` | ✅ |
| Overtime Calculator | `/overtime` | `src/lib/calc/overtime.ts` | ✅ |
| Working Hours Calculator | `/hours` | `src/lib/calc/workingHours.ts` | ✅ |
| Holiday Pay Estimator | `/holiday-pay` | `src/lib/calc/holidayPay.ts` | ✅ |
| Credit Card Payoff Calculator | `/credit-card` | `src/lib/calc/creditCard.ts` | ✅ |
| Visa Date / Countdown Calculator | `/visa-dates` | `src/lib/career/visaDates.ts` (+ .ics export) | ✅ |
| CV ↔ Job Description Match Checker | `/cv-match` | `src/lib/career/cvMatch.ts` (fully local) | ✅ |
| Job Application Answer Builder | `/job-answer` | `src/lib/career/jobAnswer.ts` (templates, not AI) | ✅ |
| Image Compressor / Resizer | `/image-tools` | `src/lib/files/imageProcessing.ts` (canvas, on-device) | ✅ |
| PDF Merge / Split / Reorder | `/pdf-tools` | `src/lib/files/pdfUtils.ts` (pdf-lib, on-device, lazy-loaded) | ✅ |
| QR Code Generator | `/qr` | `src/lib/files/qrPayload.ts` (qrcode, lazy-loaded) | ✅ |
| Invoice Generator | `/invoice` | `src/lib/files/invoice.ts` (print CSS → PDF) | ✅ |
| Self-Employed Profit Estimator | `/self-employed` | `src/lib/calc/selfEmployed.ts` | ✅ |
| Creator Tools | `/creator-tools` | `src/lib/creator/creatorTools.ts` (templates, not AI) | ✅ |

Plus: landing page with instant client-side search (`/`), `/about`, `/privacy`, `/terms`, `/contact`, `sitemap.xml`, `robots.txt`, 404 page.

## Verification results (all run on 2026-08-16)

- **Type check** (`npm run typecheck`): pass, zero errors.
- **Lint** (`npm run lint`): pass, zero errors/warnings.
- **Unit tests** (`npm run test`): **362 / 362 passing** across 17 files (calculators, search, payload builders, page-range parser, invoice totals, ICS builder, creator generators — including regression tests for the credit-card minimum-payment fix).
- **Production build** (`npm run build`): pass — 25 routes statically prerendered (Next.js 16 static export).
- **Adversarial review** (5 independent agents): salary engine matched 9 hand-worked GOV.UK scenarios to the penny; tax config verified 100% against `TAX_RESEARCH.md`; shift/hours/overtime/holiday passed 27 attack cases; security review found no injection sinks, no external requests, no storage/cookies (privacy page claims verified against code); dependency audit clean (`npm audit`: 0 vulnerabilities). All 10 review findings (2 major, 8 minor) were fixed and redeployed.
- **Live production checks** (Chrome): landing, search ("night shift pay" → Shift Pay), shift-pay reference calculation, salary £30,000 → £25,119.60/yr take-home (hand-verified), no console errors, human-readable validation messages, security headers + `charset=utf-8` present, page-specific Open Graph tags confirmed.

## Tax data status

All figures in `src/config/ukTax/2025-26.ts` and `2026-27.ts` were **verified against GOV.UK pages fetched on 2026-08-16** (sources and research notes in `TAX_RESEARCH.md`; each config carries `verified`, `lastVerified` and `sources`). Nothing was invented; the salary page displays the verification date and sources.

Items to re-verify in future:
- **Autumn Budget changes**: dividend rates +2pp from April 2026 and savings/property +2pp from April 2027 were announced (not modelled — this site only handles employment/self-employment income); threshold freeze reportedly extended to April 2031 (secondary sources only).
- **2027-28 tax year**: add a new config file when rates are published; unverified configs automatically show a warning banner.

## Known limitations

- Salary NI is calculated on an **annual basis**; real payroll is per-period, so payslips can differ by small amounts (disclosed in the UI).
- Pension is modelled as a **net-pay arrangement** only (reduces income tax, not NI/student loans); salary sacrifice and relief-at-source are not modelled (disclosed).
- Credit card interest uses the **APR ÷ 12 monthly model**; issuers typically compound daily (disclosed).
- Holiday pay assumes a steady hourly rate — no 52-week variable-pay averaging (disclosed).
- PDF tool shows no page thumbnails (processing-only; keeps everything on-device).
- CV match is a keyword-coverage approximation, not a real ATS (disclosed).
- Mobile layout is built mobile-first with Tailwind and passed static review; automated real-device testing was not run (browser-extension window could not be resized below desktop width).
- No E2E test suite (Playwright) yet — unit tests + live manual verification cover current scope.
- `/contact` publishes `support@itisyou.app` as the public support address. Whether a mailbox is actually provisioned for it was not verified as part of this project — confirm delivery before relying on it.

## Future upgrades (architecture ready)

- AI-enhanced CV analysis / answer drafting: `MatchAnalyser` and `AnswerEngine` interfaces exist for drop-in engines.
- Monetisation: `AdSlot` component (renders nothing in v1) is placed at three positions in `ToolLayout`.
- New tax years: add one config file to `src/config/ukTax/`.
- New tools: one registry entry + lib module + island + page (see README).
