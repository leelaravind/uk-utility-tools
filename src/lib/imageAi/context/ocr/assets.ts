/**
 * ============================================================================
 * TESSERACT ASSET HOSTING — READ THIS BEFORE CHANGING ANYTHING HERE
 * ============================================================================
 *
 * tesseract.js needs three kinds of static asset at runtime:
 *
 *   1. the worker script          (ships inside the npm package)
 *   2. the WASM core              (npm package `tesseract.js-core`)
 *   3. the language training data (`eng.traineddata.gz`, ~11 MB)
 *
 * By default the library resolves 2 and 3 from a public CDN (jsDelivr /
 * unpkg / tessdata mirrors). That is a plain GET for a static file and it
 * never carries image data — but it does tell a third party that this
 * visitor's browser is loading OCR assets, which is a privacy detail the
 * "local processing" promise has to be honest about.
 *
 * CURRENT STATE IN THIS REPOSITORY: NOT self-hosted.
 * `SELF_HOSTED` below is `false`, so the library's defaults apply and the UI
 * states this as a known limitation. Nothing about the image, the recognised
 * text, or anything derived from either is included in those requests.
 *
 * ---------------------------------------------------------------------------
 * HOW TO SELF-HOST (removes the third-party request entirely)
 * ---------------------------------------------------------------------------
 * 1. Copy the worker into the public directory:
 *      node_modules/tesseract.js/dist/worker.min.js  ->  public/tesseract/worker.min.js
 * 2. Copy the core WASM builds:
 *      node_modules/tesseract.js-core/*.wasm         ->  public/tesseract/core/
 *      node_modules/tesseract.js-core/*.js           ->  public/tesseract/core/
 * 3. Download the pinned language data and place it at:
 *      public/tesseract/lang/eng.traineddata.gz
 *    Record its sha256 and its source in the project's dependency notes; the
 *    tessdata files are Apache-2.0 licensed and redistributable.
 * 4. Flip `SELF_HOSTED` to true. No other code changes are required.
 * 5. Re-run the network privacy audit: the only requests during an analysis
 *    must then be same-origin static assets.
 *
 * Do NOT point these paths at a different third-party host. The only two
 * acceptable configurations are "library defaults" (documented as a
 * limitation) and "served from this site's own origin".
 * ============================================================================
 */

/**
 * Flip to true once the assets in `public/tesseract/` are in place.
 * Typed as `boolean` rather than the literal `false` so that flipping it does
 * not make every guarded branch look unreachable to the type checker.
 */
export const SELF_HOSTED: boolean = false;

/** First-party paths used when `SELF_HOSTED` is true. */
export const SELF_HOSTED_PATHS = {
  workerPath: "/tesseract/worker.min.js",
  corePath: "/tesseract/core",
  langPath: "/tesseract/lang",
} as const;

/**
 * Name of the IndexedDB store tesseract.js uses to cache language data.
 * Named after this site so "Clear local models" can find and delete exactly
 * this store rather than guessing at the library's default.
 */
export const OCR_CACHE_NAME = "itisyou-image-ocr";

/** The language shipped in V1. Pinned so results are reproducible. */
export const DEFAULT_OCR_LANGUAGE = "eng";

/** Options passed to `createWorker`. Empty object when using library defaults. */
export function tesseractAssetOptions(): Record<string, string> {
  const options: Record<string, string> = { cachePath: OCR_CACHE_NAME };
  if (SELF_HOSTED) {
    options.workerPath = SELF_HOSTED_PATHS.workerPath;
    options.corePath = SELF_HOSTED_PATHS.corePath;
    options.langPath = SELF_HOSTED_PATHS.langPath;
  }
  return options;
}

/**
 * The limitation shown to visitors while assets are not self-hosted. Written
 * to be accurate rather than reassuring: it names what is fetched and what is
 * not.
 */
export const OCR_ASSET_LIMITATION =
  "The text-recognition engine downloads its WebAssembly and language files from a public CDN the first time you use it, then reuses the cached copy. Those requests contain no image data and no recognised text.";

/** Shown when assets are self-hosted; kept so the UI copy cannot drift. */
export const OCR_ASSET_SELF_HOSTED_NOTE =
  "The text-recognition engine and its language data are served from this site only.";

/** The correct note for the current configuration. */
export function ocrAssetNote(): string {
  return SELF_HOSTED ? OCR_ASSET_SELF_HOSTED_NOTE : OCR_ASSET_LIMITATION;
}
