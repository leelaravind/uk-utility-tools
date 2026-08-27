# ITISYOU Tools

A premium, privacy-first collection of free web tools — pay and hours
calculators, money estimators, career helpers, PDF/image utilities, QR codes,
invoices and creator helpers. No accounts, no uploads, no analytics: every
tool runs entirely in the visitor's browser.

Live site: https://tools.itisyou.app

## Branding and scope

**ITISYOU Tools** is the platform identity and the platform is global —
anyone, anywhere can use it. Individual calculators may still be UK-specific
because they implement UK law (income tax, National Insurance, student loan
plans, Scottish bands, the 5.6-week statutory holiday rules). Those tools keep
their UK terminology and are labelled as UK tools in their registry title or
description; the site-wide strings (`SITE_NAME`, `SITE_TAGLINE`,
`SITE_DESCRIPTION` in `src/lib/registry.ts`) carry no UK-only positioning.

A shared currency module (`src/lib/currency.ts`) provides GBP, USD and EUR for
tools whose maths is currency-neutral — changing currency changes presentation
only. Tools that implement UK tax rules stay GBP-only, because their bands and
thresholds are defined in pounds.

Public contact address: `support@itisyou.app` (shown on `/contact`).

## Architecture

- **Static Next.js 16 export.** The App Router with `output: 'export'` in
  `next.config.ts`: every route is prerendered to plain HTML at build time
  and served as static assets. There are no dynamic routes, no server
  components at request time and no API routes.
- **Registry-driven tools.** `src/lib/registry.ts` is the single source of
  truth for every tool: slug, title, description, category, keywords,
  related tools and icon. The landing page, search, sitemap, related-tools
  sections and breadcrumb/JSON-LD schema are all generated from it.
- **Pure calculation libraries + tests.** All calculation, parsing and
  generation logic lives in pure, deterministic, exported functions under
  `src/lib/` — never inside components. No `Date.now()` / `new Date()`
  inside lib functions (dates are parameters). Every lib module has a
  `*.test.ts` beside it with hand-computed expected values and edge cases.
- **Client-only file processing.** Images, PDFs, CV text and invoice data
  are processed on-device in the browser. Heavy libraries (`pdf-lib`,
  `qrcode`) are loaded with dynamic `import()` inside event handlers or lazy
  effects so they never bloat the initial page bundle.
- **Shared UI kit.** `src/components/ui` is a frozen contract of accessible
  inputs (44&nbsp;px controls, real labels, aria wiring), result cards and
  the shared `ToolLayout` server component which renders breadcrumbs,
  explanation, FAQs, related tools and all JSON-LD automatically.

### Directory layout

```
src/
  app/                 One directory per route (server components only)
    <slug>/page.tsx    Tool page: metadata + ToolLayout + island
    sitemap.ts         Build-time sitemap from the registry
    robots.ts          robots.txt
  components/
    ui/                Shared UI kit (frozen contract)
    tools/<slug>/      Interactive client "island(s)" per tool
    search/, site/, seo/
  config/              Versioned UK tax configuration (see below)
  lib/                 Pure logic + tests (registry, search, per-tool libs)
public/
  _headers             Cloudflare static-asset header rules
```

## Local development

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest run (all lib tests)
npm run build      # static export → ./out
```

## Adding a new tool

1. **Registry** — append an entry to `TOOLS` in `src/lib/registry.ts`
   (slug, titles, description, category, keywords, related slugs, icon key).
2. **Logic + tests** — put all calculation/parsing/generation logic in pure
   exported functions in `src/lib/<area>/…` with a `*.test.ts` next to it.
   Work in pence for money maths; accept dates as parameters.
3. **Island** — build the interactive client component(s) in
   `src/components/tools/<slug>/`, importing only from `@/components/ui`
   and your lib.
4. **Page** — create `src/app/<slug>/page.tsx` as a server component:
   `export const metadata` (title, description, `alternates.canonical`),
   then render `<ToolLayout tool={getTool("<slug>")!} explanation={…}
   faqs={FAQS} disclaimer={…}><Island /></ToolLayout>`.
5. The landing page, search index and sitemap pick the tool up
   automatically from the registry.

## Testing philosophy

Logic and UI are strictly separated so the maths can be tested without a
browser. Tests use real hand-computed expected values (not snapshots of the
implementation), cover edge cases (zero, negative, overnight ranges, empty
input) and invalid input, and run in milliseconds via Vitest. If a
calculation can't be tested as a pure function, it's in the wrong place.

## Deployment

The site deploys to Cloudflare Workers static assets per `wrangler.jsonc`:

```bash
npm run build        # produces ./out
npx wrangler deploy  # uploads ./out as static assets
```

`wrangler.jsonc` serves `./out` with auto trailing-slash handling and the
exported 404 page, fronted by a thin `worker.js` that adds
`charset=utf-8` to HTML responses. The custom domain `tools.itisyou.app`
is attached to the Worker as a Cloudflare custom domain.
`public/_headers` adds security headers (nosniff, referrer policy,
permissions policy, frame denial) to every response.

### Repository and CI

- Source of truth: **https://github.com/leelaravind/uk-utility-tools**
  (private), branch `main`.
- `.github/workflows/deploy.yml` runs lint → typecheck → tests → build →
  `wrangler deploy` on every push to `main` (and manually via
  *Run workflow*). One-time setup: add a repository secret named
  `CLOUDFLARE_API_TOKEN` (GitHub → Settings → Secrets and variables →
  Actions) containing a Cloudflare API token created from the
  **Edit Cloudflare Workers** template at
  https://dash.cloudflare.com/profile/api-tokens. Until that secret exists,
  the deploy step fails and deploys remain manual (`npx wrangler deploy`).

### Search and indexing

`sitemap.xml` and `robots.txt` are generated at build time from the registry,
so every tool route is listed automatically. Google Search Console is
**verified for the property and collecting clicks**.

### Monetisation

Ad architecture is config-driven from `src/config/ads.ts` (AdSense script
in `<head>`, three dormant `AdSlot` placeholders per tool page,
`public/ads.txt`). See `MONETISATION.md` for the enable checklist,
including the UK/EEA consent requirement.

Google AdSense status: **under review** — no decision either way. The
verification setup is preserved (publisher client ID, `public/ads.txt`, the
`<head>` script wiring), but `ADSENSE_ENABLED` is currently `false`: a
deliberate pause during a Google Safe Browsing review of the wider
itisyou.app domain network. The reasoning is documented in the comment above
the constant in `src/config/ads.ts`.

## Privacy architecture

Privacy is structural, not a policy promise:

- Static hosting only — there is no application server to receive data.
- All calculators run in the browser; CV/job text, images, PDFs and invoice
  data are processed on-device and never uploaded.
- No accounts, no analytics scripts, no fingerprinting in v1; the
  application itself sets no cookies. The only third-party script is the
  Google AdSense loader (see `MONETISATION.md`); ad units are off by
  default and the privacy page discloses the script.
- Cloudflare receives standard web requests (IP, user agent) as any host
  does — server logs only, nothing added by us.

See `/privacy` on the site for the user-facing version.

## Job Answer content maintenance

`/job-answer` composes drafts from a tagged corpus of 746 human-written
sentence blocks under `src/data/jobAnswers/`, selected by a deterministic
engine in `src/lib/career/jobAnswer/`. It is **not** an AI model, calls no
external service, and the UI must never describe it as AI-generated.

Content is added by appending a tagged block to the themed file matching its
role — never by editing one large file. The corpus contains no digits at all,
by rule and by test, so the builder cannot invent a metric, a team size or an
achievement; missing detail becomes a bracketed prompt for the visitor's own
figure instead.

Full contributor guide, including how to add question types, industries,
roles, skills, tones and frameworks: **`JOB_ANSWER_ARCHITECTURE.md`**.

## Image Tools for AI

`/image-ai-optimizer` and `/image-context` are two modes of one experience,
sharing `src/components/tools/image-ai/ImageAiIsland.tsx`:

- **Optimize Image** — resize, crop and re-encode an image before sending it to
  a multimodal AI, with a before/after visual-token estimate. Canvas only; no
  model download.
- **AI Context** — extract meaning locally (OCR plus layout heuristics) and copy
  compact structured context instead of the image.

Image-token maths lives **only** in `src/config/imageProviders/`, a versioned
provider configuration with a `source` URL and a `lastVerified` date per
profile. Claude is currently the only provider with a documented, reproducible
rule (28×28 visual patches, per-tier edge and token caps); the others report
"varies by model" rather than a fabricated number.

The critical correctness rule: savings are computed by simulating the
provider's own automatic resize on **both** the original and the optimised copy,
so the tool never claims a saving the provider's own downscaling already took.

Neither mode uploads anything. Full contributor guide, including how to add a
provider and how the privacy boundary is enforced:
**`IMAGE_AI_ARCHITECTURE.md`**.

## Tax configuration maintenance

UK tax figures live in versioned configuration under `src/config/ukTax…`
(rates, thresholds, NI bands, student loan plans and similar, keyed by tax
year) rather than being hard-coded into calculators, so a new tax year is a
config addition — not a logic change. Sources and reasoning for each figure
are documented in `TAX_RESEARCH.md`. When rates change (usually each
April, announced earlier):

1. Add the new tax-year entry to the config alongside the old one.
2. Update `TAX_RESEARCH.md` with sources (GOV.UK pages) and dates checked.
3. Extend the lib tests with hand-computed expectations for the new year.

Tax outputs are always labelled as estimates in the UI, and the terms page
directs users to GOV.UK or an accountant for anything that matters.

## Dependencies

See `DEPENDENCY_NOTES.md` for the full table of runtime and dev
dependencies, licences, load strategy and the no-external-AI / no-analytics
stance for v1.
