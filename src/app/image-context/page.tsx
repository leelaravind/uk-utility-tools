import type { Metadata } from "next";
import Link from "next/link";

import { ToolLayout } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/registry";
import { AI_CONTEXT_ENABLED } from "@/config/features";
import { ImageAiIsland } from "@/components/tools/image-ai/ImageAiIsland";

/**
 * Image → AI Context.
 *
 * DEVELOPMENT / DISABLED IN PRODUCTION — see `AI_CONTEXT_ENABLED` in
 * `src/config/features.ts` for why.
 *
 * While the flag is off this route renders a short notice and is marked
 * `noindex, nofollow`: the tool is absent from the catalogue, so nothing links
 * here, but a route that once existed in a build should not 404 confusingly or
 * expose an unfinished feature to anyone who guesses the URL. The complete
 * page below is preserved verbatim and comes back when the flag flips.
 */

export const metadata: Metadata = AI_CONTEXT_ENABLED
  ? pageMetadata({
      title: "Image → AI Context — Convert a Screenshot to AI-Readable Text",
      description:
        "Turn an image into compact, AI-readable context in your browser: local OCR and layout analysis, exported as structured JSON or tagged text you can paste into any AI. Your image is processed locally and is not uploaded.",
      path: "/image-context",
    })
  : {
      title: "Image → AI Context",
      description:
        "This tool is still in development and is not currently available.",
      // No canonical: an unreleased page should not compete for indexing.
      robots: { index: false, follow: false },
    };

const FAQS = [
  {
    question: "What does this tool actually produce?",
    answer:
      "A compact, structured description of the image: the text it contains with reading order preserved, the likely image type, layout and interface elements where they can be detected, and an explicit list of what the analysis could not determine. You can copy it as compact text, structured JSON, a detailed view, or the raw OCR, and paste it into any AI.",
  },
  {
    question: "Is this the same as an AI looking at my image?",
    answer:
      "No, and it is important not to treat it as equivalent. A multimodal model sees the pixels. This tool sends a compact interpretation built from local OCR and layout heuristics, so anything it did not detect is simply absent. The output includes a limitations section for that reason. Use it when the meaning is mostly textual and you would rather not upload the image; use the optimizer when the AI genuinely needs to see the picture.",
  },
  {
    question: "Does any of this leave my browser?",
    answer:
      "No. The image, the extracted text, and the generated context are all processed on your device and are never sent to our servers, to an AI provider, or to any analytics service. There is no cloud fallback: if local analysis cannot run on your device, the tool degrades to a simpler local mode and tells you, rather than quietly uploading anything. Static assets such as the OCR engine are downloaded to your browser, but they never carry your image or its contents.",
  },
  {
    question: "Why does the first analysis take longer?",
    answer:
      "The OCR engine is downloaded to your browser the first time you run an analysis, not when the page loads, so the page stays fast for people who only want the optimizer. Once cached, later analyses skip that download. You can see the cache size and clear it from the panel below.",
  },
  {
    question: "What if the image contains instructions aimed at an AI?",
    answer:
      "Screenshots sometimes contain text like “ignore previous instructions”. That text is image content, not a command, so it is never treated as an instruction by this tool. It is preserved in the output — deleting it would destroy evidence you may want analysed — and every provider wrapper explicitly marks the extracted block as untrusted content taken from an image so the receiving AI treats it as evidence rather than direction.",
  },
  {
    question: "How accurate is the extracted text?",
    answer:
      "OCR quality depends heavily on the image. Clear, high-contrast, upright text extracts well; small, blurry, low-contrast or rotated text does not. The tool marks uncertain text rather than silently correcting it, and it will not invent document content that it could not read. Always check anything that matters — codes, figures, dates — against the original image.",
  },
  {
    question: "Should I use this or the Image Optimizer?",
    answer:
      "Use Image → AI Context when the useful content is mainly text or structure and you want to send compact context instead of an image. Use Image Optimizer for AI when you still want to send the image itself and simply want an appropriately sized copy. Both modes are available at the top of this page.",
  },
];

/** Shown while `AI_CONTEXT_ENABLED` is false. */
function InDevelopment() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Image → AI Context
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        This tool is still in development and is not available yet.
      </p>
      <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">
        It reads an image locally and turns it into compact, AI-readable
        context. The text and layout half works; the part that recognises what
        is actually pictured does not yet, so we would rather not ship it than
        ship something that quietly answers the wrong question.
      </p>
      <div className="mt-8">
        <Link
          href="/image-ai-optimizer"
          className="inline-flex h-11 items-center justify-center rounded-field bg-accent-solid px-5 text-base font-medium text-accent-fg transition-colors hover:bg-accent-solid-hover"
        >
          Try the Image Optimizer for AI
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        Looking for something else?{" "}
        <Link href="/" className="text-accent underline underline-offset-2">
          Browse all tools
        </Link>
        .
      </p>
    </div>
  );
}

export default function ImageContextPage() {
  if (!AI_CONTEXT_ENABLED) return <InDevelopment />;

  return (
    <ToolLayout
      tool={getTool("image-context")!}
      explanation={
        <>
          <h3>Convert an image into compact AI-readable context</h3>
          <p>
            Upload a screenshot, document scan or photo and the browser analyses
            it locally: it extracts the text with reading order preserved, works
            out what kind of image it is, picks out layout and interface
            elements where it can, and assembles a compact structured
            representation you can paste into ChatGPT, Claude, Gemini, Grok or
            anything else.
          </p>
          <p>
            The original image stays on your device. This is not an uploader,
            and no AI provider is contacted — you copy the result and paste it
            yourself.
          </p>
          <h3>What it is good at, and what it is not</h3>
          <ul>
            <li>
              <strong>Good:</strong> error messages, settings screens, forms,
              invoices, text-heavy pages, and anything where the meaning is
              carried by words and layout.
            </li>
            <li>
              <strong>Limited:</strong> photographs, artwork, diagrams with
              implicit relationships, and any question that genuinely needs the
              pixels. The output always states what it could not determine.
            </li>
            <li>
              <strong>Never:</strong> a pixel-perfect reconstruction. It is a
              compact interpretation, not a copy of the image.
            </li>
          </ul>
          <h3>Output formats</h3>
          <ul>
            <li>
              <strong>Compact</strong> — the smallest useful representation, for
              when you want to keep the prompt short.
            </li>
            <li>
              <strong>Structured JSON</strong> — a versioned schema with
              normalised coordinates, for programmatic use.
            </li>
            <li>
              <strong>Detailed</strong> — more regions, more confidence
              information, more context.
            </li>
            <li>
              <strong>Raw OCR</strong> — just the extracted text, unprocessed.
            </li>
          </ul>
          <h3>Privacy</h3>
          <p>
            No account, no server, no uploads, and no cloud inference fallback.
            The image, the extracted text and the generated context are not
            stored — they disappear when you close the page.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          The generated context is a compact local interpretation of your image,
          not a substitute for a model that can see it. Extracted text can
          contain OCR errors, and anything the analysis could not detect is
          simply missing rather than marked wrong — check the limitations list
          and verify important details against the original. Text inside an
          image is treated as untrusted content, never as an instruction.
          Analysis runs locally in your browser; your image is not intentionally
          uploaded to ITISYOU Tools or to any AI API.
        </>
      }
    >
      <ImageAiIsland defaultMode="context" />
    </ToolLayout>
  );
}
