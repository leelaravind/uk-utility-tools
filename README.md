# UK Utility Tools

A premium, privacy-first collection of free UK web tools — pay and hours
calculators, money estimators, career helpers, PDF/image utilities, QR codes,
invoices and creator helpers. No accounts, no uploads, no analytics: every
tool runs entirely in the visitor's browser.

Live site: https://tools.itisyou.app

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
exported 404 page. The custom domain `tools.itisyou.app` is attached to the
Worker via the Cloudflare dashboard (Workers → Custom Domains).
`public/_headers` adds security headers (nosniff, referrer policy,
permissions policy, frame denial) to every response.

## Privacy architecture

Privacy is structural, not a policy promise:

- Static hosting only — there is no application server to receive data.
- All calculators run in the browser; CV/job text, images, PDFs and invoice
  data are processed on-device and never uploaded.
- No accounts, no analytics scripts, no advertising cookies, no
  fingerprinting in v1; the application sets no cookies.
- Cloudflare receives standard web requests (IP, user agent) as any host
  does — server logs only, nothing added by us.

See `/privacy` on the site for the user-facing version.

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
