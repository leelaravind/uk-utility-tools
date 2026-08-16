import type { Metadata } from "next";

import { ToolLayout } from "@/components/ui";
import { getTool } from "@/lib/registry";
import { ImageToolsIsland } from "@/components/tools/image-tools/ImageToolsIsland";

export const metadata: Metadata = {
  title: "Image Compressor & Resizer — Free, Private, In Your Browser",
  description:
    "Compress, resize and convert JPG, PNG and WebP images entirely on your device. Hit a target file size in KB — no uploads, no watermark, no account.",
  alternates: { canonical: "/image-tools" },
};

const FAQS = [
  {
    question: "Is my image uploaded to a server?",
    answer:
      "No. Everything happens in your browser using the canvas built into your device — the image never leaves your computer or phone. Once the page has loaded, the tool even works offline.",
  },
  {
    question: "How do I compress an image to 100 KB or 200 KB?",
    answer:
      "Choose JPG or WebP as the output format, type your limit into the 'Target file size' box (for example 200) and press Process. The tool automatically searches for the best quality that fits under your limit. If it can't get small enough, reduce the width and height as well — resizing usually saves far more than compression alone.",
  },
  {
    question: "Which format should I choose — JPG, PNG or WebP?",
    answer:
      "JPG is the safe choice for photos and is accepted everywhere, including most UK government and job application uploads. WebP is usually 25–35% smaller than JPG at the same quality but a few older systems don't accept it. PNG is lossless and keeps transparency, which makes it right for logos, screenshots and graphics with text — but it produces very large files for photos.",
  },
  {
    question: "Why did my file get bigger instead of smaller?",
    answer:
      "This usually happens when a photo is converted to PNG, which is lossless and stores photos inefficiently, or when a heavily compressed image is re-saved at a higher quality setting. Switch to JPG or WebP, lower the quality, or reduce the dimensions.",
  },
  {
    question: "Does compressing an image reduce its quality?",
    answer:
      "JPG and WebP are lossy formats, so some detail is discarded each time you save — although at 70–85% quality the difference is rarely visible. PNG is lossless and never loses detail. Keep your original file if you might need full quality later.",
  },
  {
    question: "Can I open HEIC photos from an iPhone?",
    answer:
      "Only if your browser can decode HEIC — Safari usually can, but Chrome, Edge and Firefox generally can't. If the file is rejected, ask your iPhone to share the photo as JPEG (or set Settings → Camera → Formats → Most Compatible), then try again.",
  },
  {
    question: "What are the size limits?",
    answer:
      "Files up to 80 MB and images up to 12,000 pixels on the longest side. Because processing happens on your own device, very large images may take a few seconds on older phones.",
  },
];

function Explanation() {
  return (
    <>
      <p>
        This tool decodes your image in the browser, redraws it onto a canvas
        at your chosen dimensions, then re-encodes it in the format and
        quality you select. Nothing is uploaded at any point — the only copy
        of your image is the one on your device.
      </p>

      <h3>Resizing — the biggest saving</h3>
      <p>
        File size grows roughly with the number of pixels, so halving the
        width and height cuts the pixel count to a quarter. A 4,000×3,000
        photo straight from a phone is far bigger than any screen needs —
        1,920px wide is plenty for full-screen use, and 800–1,200px suits most
        websites, emails and online forms. With the aspect ratio locked,
        changing one dimension updates the other automatically so the image is
        never stretched.
      </p>

      <h3>Quality — how lossy compression works</h3>
      <p>
        JPG and WebP shrink files by discarding detail your eye is unlikely to
        notice, and the quality slider controls how aggressive that is. As a
        rule of thumb:
      </p>
      <ul>
        <li>
          <strong>85–100%</strong> — near-perfect; only worth it for
          photography you&apos;ll print.
        </li>
        <li>
          <strong>70–85%</strong> — the sweet spot; usually indistinguishable
          from the original at a fraction of the size.
        </li>
        <li>
          <strong>Below 60%</strong> — visible blockiness and smudged edges
          start to appear, especially around text.
        </li>
      </ul>
      <p>
        PNG works differently: it is lossless, so there is no quality setting
        and no detail is ever lost — the trade-off is much larger files for
        photographic images.
      </p>

      <h3>Hitting a target file size</h3>
      <p>
        Many upload forms enforce a limit such as 100 KB, 200 KB or 2 MB. Set
        the target size box and the tool binary-searches the quality setting —
        trying up to eight encodes — to find the best quality that still fits
        under your limit. If even the lowest quality is too big, it tells you
        and returns the smallest file it could make, which is your cue to
        reduce the dimensions too.
      </p>

      <h3>Choosing a format</h3>
      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Best for</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>JPG</td>
            <td>Photos, uploads, email</td>
            <td>Accepted everywhere; no transparency</td>
          </tr>
          <tr>
            <td>WebP</td>
            <td>Websites, modern apps</td>
            <td>Smallest files; rare older systems reject it</td>
          </tr>
          <tr>
            <td>PNG</td>
            <td>Logos, screenshots, graphics</td>
            <td>Lossless; keeps transparency; large for photos</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function ImageToolsPage() {
  const tool = getTool("image-tools")!;
  return (
    <ToolLayout
      tool={tool}
      explanation={<Explanation />}
      faqs={FAQS}
      disclaimer={
        <>
          JPG and WebP compression is lossy — some image detail is permanently
          discarded when you save, so keep your original file. Processing
          happens entirely on your device; exact output sizes vary slightly
          between browsers, so results are approximate until you process the
          image. If you&apos;re resizing for an official upload (passport
          photos, ID documents and similar), check the requester&apos;s exact
          specifications first.
        </>
      }
    >
      <ImageToolsIsland />
    </ToolLayout>
  );
}
