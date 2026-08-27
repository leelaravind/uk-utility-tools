# Dependency notes

Deliberately minimal dependency surface: six runtime packages, a small set
of dev tools, and nothing else. Licences read from each package's
`package.json` in `node_modules` (versions as installed at the time of
writing).

## Runtime dependencies

| Package     | Version  | Licence | Why chosen                                                                                                  | Load strategy                                                                                       | Maintenance status                                          |
| ----------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `next`      | 16.3.1   | MIT     | App Router + `output: 'export'` gives fully static HTML with modern DX, metadata routes and code splitting. | Framework — per-route bundles generated at build time.                                              | Actively maintained by Vercel; frequent releases.           |
| `react`     | 19.2.8   | MIT     | Required by Next; the interactive islands are plain React client components.                                 | Core bundle.                                                                                          | Actively maintained by Meta/React team.                     |
| `react-dom` | 19.2.8   | MIT     | React renderer for the browser.                                                                              | Core bundle.                                                                                          | Actively maintained alongside `react`.                      |
| `pdf-lib`   | 1.17.1   | MIT     | Pure-JS PDF create/merge/split that runs entirely in the browser — no server, no WASM setup, fits the privacy model. | **Lazy**: dynamic `import()` inside the PDF tool's event handlers only — never a top-level import, so it is excluded from every other route's bundle. | Stable/mature; low release cadence but widely used and API-stable. |
| `qrcode`    | 1.5.4    | MIT     | Small, dependable QR generation to canvas/PNG/SVG with no network calls.                                     | **Lazy**: dynamic `import()` inside the QR tool's generate action only.                              | Stable/mature; widely used, slow but steady maintenance.    |
| `tesseract.js` | 7.0.0 (exact pin) | Apache-2.0 | Local OCR for the Image → AI Context tool. Runs entirely in the browser via WASM, which is what makes the tool's privacy boundary possible — no server-side OCR and no image upload. | **Lazy**: dynamic `import()` only when a visitor actually starts an analysis. Absent from the initial JavaScript of every route, including `/image-context` itself. | Actively maintained; widely used. |

### Version pinning

`tesseract.js` is pinned to an exact version rather than a caret range. It
executes downloaded WebAssembly against visitor-supplied images, so an
unreviewed minor bump is a supply-chain risk worth taking deliberately.

### OCR asset hosting — known limitation

`tesseract.js` resolves its core WebAssembly and the `eng.traineddata`
language data from its default CDN the first time an analysis runs. Those
requests carry **no image data and nothing derived from an image**, so the
privacy boundary (the image never leaves the browser) is intact — but the
specification prefers self-hosting, and this is the one place the
implementation falls short of it.

`src/lib/imageAi/context/ocr/assets.ts` is the single switch: copy the core
WASM variants and the language data into `public/tesseract/` and flip
`SELF_HOSTED = true`. That is deliberately **not** done yet because it adds
roughly 15–35 MB of binary assets to the repository and to every deployment,
which is a product decision rather than an implementation detail. The CDN
dependency is disclosed to visitors in the tool's privacy disclosure and in
every result's limitations list.

## Dev dependencies

| Package                | Version | Licence    | Why chosen                                                                          | Notes                                                    |
| ---------------------- | ------- | ---------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `typescript`           | 5.9.3   | Apache-2.0 | Strict typing across libs and components; the lib/test contract depends on it.       | `npm run typecheck` = `tsc --noEmit`.                     |
| `vitest`               | 4.1.10  | MIT        | Fast, TS-native unit tests for the pure calculation libs.                             | Tests live beside libs as `*.test.ts`.                    |
| `tailwindcss`          | 4.3.3   | MIT        | Utility CSS with design tokens defined in `globals.css`; zero runtime CSS-in-JS.      | v4 — configured via CSS, not a JS config file.            |
| `@tailwindcss/postcss` | 4.3.3   | MIT        | Official PostCSS integration for Tailwind v4.                                         | Build-time only.                                          |
| `eslint`               | 9.39.5  | MIT        | Linting via `eslint-config-next` (16.3.1, MIT) for Next/React/a11y rules.             | `npm run lint`.                                           |

Type packages (`@types/node`, `@types/react`, `@types/react-dom`,
`@types/qrcode`) are MIT-licensed DefinitelyTyped stubs, build-time only.

## Stance for v1

- **No external AI.** The "creator tools" are deterministic template
  fillers and are labelled as such in the UI. No AI APIs are called from
  the site, ever.
- **No analytics, no ads.** No analytics scripts, no advertising SDKs, no
  cookie banners needed — the application sets no cookies.
- **No network at runtime.** Beyond fetching the static assets themselves,
  the tools make no fetch/XHR calls. Files and text are processed
  on-device.
- **Adding a dependency is a big deal.** Any new runtime package must run
  fully client-side, carry a permissive licence, justify its bundle cost,
  and be lazy-loaded if it is only needed by one tool.
