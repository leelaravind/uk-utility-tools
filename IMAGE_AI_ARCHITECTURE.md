# Image Tools for AI — architecture

Covers the two modes served by `/image-ai-optimizer` and `/image-context`.
This document is for contributors changing the token maths, the provider
configuration, or the local analysis pipeline.

## Two modes, two problems

| | Optimize Image | AI Context |
|---|---|---|
| The visitor's goal | "I still want to send the image itself to an AI, but I want an appropriately sized copy." | "I want to extract useful meaning locally and send compact text instead of the original image." |
| Output | A resized/cropped/re-encoded image file | Structured text/JSON describing the image |
| Needs a model download | **No** — canvas only | Yes, OCR assets on first analysis |
| Default on | `/image-ai-optimizer` | `/image-context` |

The distinction is deliberate and must stay visible in the UI. AI Context is a
compact *interpretation* of an image — it is never presented as equivalent to a
multimodal model looking at the pixels.

### Why two routes

The two modes answer genuinely different searches ("claude image token
calculator" versus "screenshot to AI context"), and the site is indexed and
collecting clicks, so a single URL would force one intent to lose. Both routes
render the same `ImageAiIsland` with a different `defaultMode`, and each page
supplies its own explanation and FAQ copy, so there is no duplicated body
content and each has a clean canonical.

`src/components/tools/image-ai/ImageAiIsland.tsx` is the mode switcher. It
imports the optimizer panel statically and the AI Context panel through
`next/dynamic`, which is what keeps OCR out of Optimize mode — see Performance.

## Image token estimation

`src/config/imageProviders/` is the single source of truth. Nothing in the UI
hard-codes a pixel limit, a token cap, or a formula.

```
src/config/imageProviders/
  types.ts     VisionProviderProfile, ResolutionLimits, EffectiveImage,
               staleness helpers
  claude.ts    the Claude token model + both tier profiles
  index.ts     registry; OpenAI / Gemini / Grok profiles
  claude.test.ts
```

### The Claude model (verified 2026-08-27)

Claude views an image as **28×28-pixel patches**; each patch is one visual
token, so an image costs `ceil(width / 28) × ceil(height / 28)` tokens.

| Tier | Models | Max long edge | Max visual tokens |
|---|---|---|---|
| High resolution | Claude 4.7 and later | 2576 px | 4784 |
| Standard | All other Claude models | 1568 px | 1568 |

Images over **either** limit are downscaled — aspect preserved — to the largest
size satisfying both. `claudeResizedSize()` is a direct port of Anthropic's
published reference implementation, including its **round-half-to-even** short
edge; plain `Math.round` computes a different size on exact `.5` ties, and the
docs state the live API rounds ties to even.

Sources:
`platform.claude.com/docs/en/build-with-claude/vision` and
`.../vision-coordinates`.

> **Known documentation conflict.** For a 2000×1500 image on the standard tier
> the summary table in the Vision docs says `1269×952`, while the reference
> implementation on the coordinates page yields `1270×952`. The candidate short
> edge is exactly 952.5px — the tie the reference implementation warns about. We
> follow the reference implementation, which explicitly describes live API
> behaviour. The token cost is 1564 either way, so only the reported width
> differs, by one pixel. `claude.test.ts` documents this.

### The accuracy rule that matters most

Claude downscales oversized images **before** charging for them. So savings are
always computed as:

```
estimateClaudeImage(originalW, originalH, tier)   // what Claude would process
      versus
estimateClaudeImage(optimisedW, optimisedH, tier)
```

Never raw original pixels against optimised pixels. A 3840×2160 screenshot and a
1920×1080 screenshot both become 1456×819 on the standard tier — identical cost,
**zero** saving. Comparing raw pixels would claim ~75%. There is a test named
"reports zero saving when the provider resizes both to the same size" guarding
exactly this.

Two related honesty rules, also tested:

- Changing JPEG/WebP **quality**, or converting PNG → WebP at identical
  dimensions, changes bytes but **not** visual tokens.
- File-size reduction, dimension reduction and visual-token reduction are three
  different metrics and are always presented as three different numbers.

### Other providers

Only Claude publishes a stable, reproducible image-token rule, so Claude is the
only provider that gets a number. OpenAI, Gemini and Grok ship as profiles with
`support: "varies"`, no `limits`, and no `estimate` function; the UI shows their
`unsupportedNote` instead. A test asserts that a `varies` profile can never
carry an estimator — inventing a plausible number would be worse than showing
none.

### Adding or updating a provider

1. Read the provider's current documentation and record the URL in `source`.
2. Add a `VisionProviderProfile` with today's date in `lastVerified`.
3. Only set `limits` and `estimate` if the rule is exact and reproducible.
   Otherwise set `support: "varies"` and write an `unsupportedNote`.
4. Add test vectors **taken from the provider's own documentation**, not from
   running the new code.

Profiles older than `PROFILE_STALE_AFTER_DAYS` (180) surface an "Estimate may be
outdated — provider rules change" warning in the UI rather than silently going
stale.

## AI Context pipeline

```
src/lib/imageAi/context/
  types.ts geometry.ts sanitize.ts        schema, normalised boxes, escaping
  capabilities.ts                         WebGPU/worker/WASM detection → tier A/B/C
  validate.ts signals.ts classify.ts      MIME + magic bytes, pixel stats, image kind
  readingOrder.ts dedupe.ts important.ts  ordering, de-duplication, salience
  ui.ts document.ts diagram.ts            per-kind heuristics
  merge.ts compress.ts serialize.ts       AnalysisDocument → output formats
  providerWrappers.ts tokenEstimate.ts    copy wrappers, size metrics
  pipeline.ts analyzeInBrowser.ts         orchestration (pure / browser)
  ocr/                                    OcrEngine interface + tesseract client
  vision/                                 SemanticVisionEngine + model manifest
  workers/                                typed protocol, job guard, worker client
```

Flow: validate → build a downscaled inference bitmap → pixel signals →
classify → OCR → reading order → de-duplicate → per-kind heuristics → merge
into a versioned `AnalysisDocument` → compress → serialise.

Public schema id: `itisyou.image-context/1`. Coordinates are normalised
`[x, y, width, height]` in `[0,1]` with a top-left origin. Serialisers are
deterministic — same input, byte-identical output.

### Semantic vision ships as Tier C

The specification requires a *measured* technical spike before shipping a
browser vision model, and forbids a multi-gigabyte download. That measurement
has not been done, so **no model is bundled**. `vision/modelManifest.ts` is an
empty registry documenting exactly what a contributor must measure first
(transferred bytes, cold and cached load, peak memory, WebGPU *and* WASM
verification, licence and redistribution rights, revision pin). The
`SemanticVisionEngine` interface is complete and the pipeline treats a null
engine as a first-class outcome.

Consequence: output is OCR plus layout heuristics. The UI says so plainly, and
every result carries it in `limitations`. It is never presented as equivalent
to a model that can see the pixels. There is no cloud fallback — degradation is
always local.

### Prompt-injection safety

Image text is evidence, never instruction. All five provider wrappers place an
explicit untrusted-content notice **before** a fenced context block, and
suspicious text is **preserved rather than removed** — deleting it would
destroy the evidence the visitor wants analysed. If the extracted text contains
a literal closing fence, the wrapper relocates the fence (`<IMAGE_CONTEXT_2>`)
rather than editing the text, so injected markup cannot break out. Pinned by
tests.

### Deliberate deviations from the specification

1. Compact `text` is `string[]`; the field is omitted when empty (§29 rule 1
   forbids empty fields) rather than emitted as `""`.
2. No invented numeric confidence for hand-written heuristics (§30) — a
   limitation states the caveat instead.
3. Two workers, not the four sketched in §21: tesseract's own OCR worker plus
   one analysis worker, avoiding nested-worker bundler risk. In-page fallback if
   the worker will not start.
4. `rectangleCount` is an honest proxy and documented as an estimate.
5. Classification returns `unknown` when no pixel pass ran rather than guessing
   from text density alone.
6. The visitor's filename never enters the output or the download name.

## Privacy boundary

Non-negotiable, and identical for both modes:

- The image, and everything derived from it (OCR text, extracted entities,
  generated context, clipboard output, EXIF, hashes, filename), **never leaves
  the browser**. Not to ITISYOU Tools, not to an AI provider, not to analytics.
- There is **no cloud inference fallback**. If local analysis cannot run, the
  tool degrades locally and says so.
- No API key is required or accepted.
- Nothing is persisted by default — no source image, no OCR, no context. Only
  user preferences and cached static assets.
- Static JavaScript/WASM/OCR language assets may be downloaded, but no request
  may carry image-derived data in a body, URL or query string.

### Third-party scripts on these routes

The site integrates Google AdSense, currently **disabled site-wide**
(`ADSENSE_ENABLED = false` in `src/config/ads.ts`, paused during a Google Safe
Browsing review). No third-party script therefore executes on these routes
today, and the privacy boundary is intact as shipped.

The AdSense integration was deliberately **not modified** — it is under review
and altering it risks the verification. The standing decision to carry forward
when AdSense is re-enabled: exclude `/image-context` and `/image-ai-optimizer`
from Auto ads (page exclusions in the AdSense dashboard) rather than editing the
head script, since these routes handle potentially sensitive images. Revisit
before re-enabling.

## Performance

Opening Optimize Image must never trigger an OCR or model download. That is
enforced structurally:

- The two panels are separate components, not one component with a branch.
- `ImageAiIsland` imports `OptimizeImagePanel` statically and `AiContextPanel`
  via `next/dynamic({ ssr: false })`.
- The optimizer imports nothing from `src/lib/imageAi/context/**`.
- The OCR client and analysis worker are themselves `import()`-ed only when an
  analysis actually starts — not when the AI Context panel mounts.

Verify with the browser network panel: load `/image-ai-optimizer`, optimise and
download an image, and confirm no OCR or model asset is fetched.

## Reuse

Both modes build on the existing Image Compressor engine in
`src/lib/files/imageProcessing.ts` (`loadImage`, `processImage`,
`compressToTarget`, `computeTargetDimensions`, `buildOutputFilename`,
`formatBytes`, `percentSaved`, `ImageToolError`). There is deliberately **one**
resize/encode engine on the site; `/image-tools` continues to use it unchanged.
