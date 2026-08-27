import { ToolLayout } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/registry";
import { ImageAiIsland } from "@/components/tools/image-ai/ImageAiIsland";

export const metadata = pageMetadata({
  title: "Image Optimizer for AI — Resize & Estimate Claude Visual Tokens",
  description:
    "Resize, crop and compress an image before sending it to a multimodal AI, and compare the estimated visual-token cost before and after. Accounts for the automatic resizing Claude applies. Everything runs in your browser.",
  path: "/image-ai-optimizer",
});

const FAQS = [
  {
    question: "Does making an image smaller actually reduce AI token usage?",
    answer:
      "It depends on the provider and the model. Image token usage is not universal — each provider processes images differently. For providers with documented image-token rules, reducing pixel dimensions can reduce visual-token usage. Claude publishes such a rule, so this tool can give a real number for Claude. Where a provider does not publish a stable formula, the tool says the calculation varies rather than inventing a figure.",
  },
  {
    question: "How does Claude actually count image tokens?",
    answer:
      "Claude views an image as 28×28-pixel patches, and each patch is one visual token — so an image costs ceil(width ÷ 28) × ceil(height ÷ 28) tokens. Each model tier also caps the longest edge and the total visual tokens: the high-resolution tier (Claude 4.7 and later) allows 2576px and 4784 tokens, and the standard tier allows 1568px and 1568 tokens. This tool implements that rule directly rather than approximating it.",
  },
  {
    question: "Why is my saving smaller than I expected?",
    answer:
      "Because Claude already downscales oversized images before charging for them, so a large original often costs no more than a medium one. A 3840×2160 screenshot and a 1920×1080 screenshot are both reduced to 1456×819 on the standard tier — identical token cost, zero saving. This tool compares what the provider would actually process in each case, not raw pixel counts, so it will tell you when there is nothing to gain instead of overstating the benefit.",
  },
  {
    question: "Does converting PNG to WebP lower the token count?",
    answer:
      "No. If the pixel dimensions stay the same, the visual-token count stays the same. Changing format or quality reduces file size and upload time, which makes requests faster and lighter, but visual-token usage is driven by dimensions and cropping. The tool reports file-size change and token change as two separate figures for exactly this reason.",
  },
  {
    question: "Should I crop instead of shrinking?",
    answer:
      "Often, yes. Cropping removes pixels without shrinking what is left, so text stays legible while the token cost falls. That makes it a better first move than a global downscale for screenshots and scanned documents with wide blank margins. Shrinking an image with small text can push it below the point where it can be read reliably.",
  },
  {
    question: "Is my image uploaded anywhere?",
    answer:
      "No. Decoding, cropping, resizing and re-encoding all happen in your browser using standard canvas APIs. The image is never sent to our servers, to an AI provider, or to any analytics service, and no API key is needed. The optimised copy is created locally and saved straight from your browser.",
  },
  {
    question: "Which should I use — the optimizer or Image → AI Context?",
    answer:
      "Use the optimizer when you still want the AI to look at the picture itself and you just want a sensibly sized copy. Use Image → AI Context when you would rather extract the meaning locally and paste compact text instead of the image. They solve different problems, and you can switch between them at the top of this page.",
  },
];

export default function ImageAiOptimizerPage() {
  return (
    <ToolLayout
      tool={getTool("image-ai-optimizer")!}
      explanation={
        <>
          <h3>Resize an image for multimodal AI</h3>
          <p>
            Multimodal models read images at a limited resolution. Send
            something far larger and the provider quietly shrinks it before
            processing — you pay for the upload, wait for it, and gain nothing.
            Send something too small and fine text stops being readable. This
            tool helps you land in between, and shows the estimated cost of the
            choice before you commit to it.
          </p>
          <p>
            It does <strong>not</strong> call an AI, need an API key, or upload
            your image. Everything happens on your device.
          </p>
          <h3>How image optimization affects AI usage</h3>
          <ul>
            <li>
              Pixel dimensions and cropping can affect visual-token usage.
              Compression settings mostly do not.
            </li>
            <li>
              Providers process images differently, so there is no single
              universal token rule. Only providers with a documented,
              reproducible calculation get a number here.
            </li>
            <li>
              Claude currently uses 28×28 visual patches, with a maximum long
              edge and a maximum visual-token count that depend on the model
              tier.
            </li>
            <li>
              Claude automatically resizes oversized images, and this tool
              accounts for that on both sides of the comparison — so it will not
              claim a saving that the provider&rsquo;s own resizing already took.
            </li>
            <li>
              JPEG and WebP quality primarily reduce upload bytes and latency,
              not visual tokens.
            </li>
            <li>
              Smaller images lose fine detail. Check small text in the
              side-by-side view before downloading.
            </li>
          </ul>
          <h3>Presets</h3>
          <ul>
            <li>
              <strong>Recommended</strong> — matches the selected model&rsquo;s
              own effective resolution, so nothing is wasted and nothing is
              thrown away unnecessarily.
            </li>
            <li>
              <strong>Low token</strong> — a more aggressive downscale when cost
              matters more than fine detail.
            </li>
            <li>
              <strong>Balanced</strong> — a middle ground for general use.
            </li>
            <li>
              <strong>High detail</strong> — keeps as much resolution as the
              model will actually use.
            </li>
            <li>
              <strong>Custom</strong> — your own dimensions, with aspect ratio
              locked by default.
            </li>
          </ul>
          <h3>Privacy</h3>
          <p>
            No account, no server, no uploads. The image, the optimised copy and
            the filename all stay on your device.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          Token figures are estimates produced from each provider&rsquo;s
          published rules, and provider rules change. Claude is currently the
          only provider here with a documented, reproducible image-token
          calculation; where a provider does not publish one, no number is
          shown. Estimates exclude the text part of your prompt. Always check
          the provider&rsquo;s own documentation and your actual usage before
          relying on these figures for budgeting.
        </>
      }
    >
      <ImageAiIsland defaultMode="optimize" />
    </ToolLayout>
  );
}
