/**
 * Feature flags — single source of truth for what the public site exposes.
 *
 * A flag here is the ONLY place a feature's public availability is decided.
 * Components and routes read the flag; they never hard-code their own
 * `false`. That keeps re-enabling a feature a one-line change rather than an
 * archaeology exercise.
 */

/**
 * Image → AI Context (`/image-context`).
 *
 * STATUS: DEVELOPMENT — DISABLED IN PRODUCTION.
 *
 * The implementation is complete and tested for everything except the part
 * that matters most to the promise on the tin. Local OCR, layout and document
 * heuristics, the versioned AnalysisDocument, the serialisers, the provider
 * copy wrappers and the prompt-injection protections all work. What is NOT
 * operational is local semantic vision: scene captioning and object/entity
 * detection. The specification requires a measured technical spike before a
 * browser vision model is bundled, and that spike has not been done, so the
 * model registry is deliberately empty.
 *
 * The consequence is that the tool cannot reliably answer "what is this
 * image?" — it can only report the text and layout it found. Shipping that as
 * a finished "AI Context" feature would misrepresent it, so the feature is
 * hidden from the public site until semantic vision is operational.
 *
 * WHAT THIS FLAG CONTROLS WHEN FALSE
 * - The tool is absent from `TOOLS`, so it disappears from the homepage
 *   catalogue, instant search, category listings, related-tool links and the
 *   generated sitemap — all of which derive from that one array.
 * - The `/image-context` route renders a short "in development" notice
 *   instead of the tool, and is marked `noindex, nofollow`.
 * - The Optimize / AI Context mode selector is not rendered, so the optimizer
 *   ships as a single-purpose tool.
 *
 * NOTHING IS DELETED. The implementation lives in
 * `src/lib/imageAi/context/`, its UI in
 * `src/components/tools/image-ai/context/` and `AiContextPanel.tsx`, its
 * tests alongside the source, and the authoritative specification in `docs/`.
 * Flip this to `true` to restore the feature everywhere at once.
 *
 * See `IMAGE_AI_ARCHITECTURE.md` for the remaining semantic-vision work.
 */
export const AI_CONTEXT_ENABLED: boolean = false;

/**
 * Image Optimizer for AI (`/image-ai-optimizer`).
 *
 * STATUS: PRODUCTION. It does not depend on semantic vision — it is canvas
 * resizing, cropping and re-encoding plus provider-token estimates computed
 * from published, verified provider rules.
 */
export const IMAGE_OPTIMIZER_ENABLED: boolean = true;
