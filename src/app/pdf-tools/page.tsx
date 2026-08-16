import type { Metadata } from "next";

import { getTool } from "@/lib/registry";
import { ToolLayout } from "@/components/ui";
import { PdfToolsIsland } from "@/components/tools/pdf-tools/PdfToolsIsland";

export const metadata: Metadata = {
  title: "PDF Merge, Split, Reorder & Extract — Free & Private, In Your Browser",
  description:
    "Merge, split, reorder, extract and remove PDF pages for free. Everything runs locally in your browser — your files are never uploaded to a server.",
  alternates: { canonical: "/pdf-tools" },
};

const FAQS = [
  {
    question: "Are my PDF files uploaded to a server?",
    answer:
      "No. All processing happens inside your browser using a JavaScript PDF library. Your files never leave your device, nothing is stored, and the tool keeps working even if you go offline after the page has loaded.",
  },
  {
    question: "Is there a file size or page limit?",
    answer:
      "Yes — a practical one. The tool accepts up to 200 MB of input files in total and up to 2,000 pages per document. These limits exist because everything is processed in your browser's memory; very large files can make a browser tab slow or unstable.",
  },
  {
    question: "How do I write a page range?",
    answer:
      "Type page numbers and ranges separated by commas, for example \"1-3, 5, 9-12\". Pages are numbered from 1. Spaces don't matter, duplicates are ignored, and the tool tells you straight away if a page doesn't exist in your PDF.",
  },
  {
    question: "Can I merge more than two PDFs at once?",
    answer:
      "Yes. Add as many PDFs as you like (within the 200 MB total limit), then use the up and down buttons to set the order before merging. Pages keep their original size, orientation and quality.",
  },
  {
    question: "Does it work with password-protected PDFs?",
    answer:
      "Usually not. If a PDF is encrypted, the tool attempts a best-effort open and warns you, but results can be incomplete or fail. For reliable results, remove the password first using the software that created the PDF.",
  },
  {
    question: "Will merging or splitting reduce the quality of my PDF?",
    answer:
      "No. Pages are copied across exactly as they are — text, images and vector content are not re-compressed or rasterised. The output can even be slightly smaller because unused data is dropped when the new file is written.",
  },
  {
    question: "Why don't I see page thumbnails or previews?",
    answer:
      "This is deliberately a processing-only tool: it reads the page structure of your PDF without rendering the content, which keeps it fast, lightweight and private. Use your normal PDF viewer to check page numbers, then come back and type the ranges.",
  },
];

export default function PdfToolsPage() {
  return (
    <ToolLayout
      tool={getTool("pdf-tools")!}
      explanation={
        <>
          <h3>Everything happens on your device</h3>
          <p>
            Most online PDF tools upload your file to a server, process it
            there, and send the result back. This one doesn&apos;t. It uses a
            PDF library that runs entirely in your browser, so your documents —
            contracts, payslips, ID scans, medical letters — are never
            transmitted anywhere. The downside of that approach is a practical
            size limit (about 200&nbsp;MB of input and 2,000 pages), because
            your browser&apos;s memory does all the work.
          </p>

          <h3>Merging PDFs</h3>
          <p>
            Add two or more files, arrange them with the up and down buttons,
            and merge. The tool copies every page of every file, in the order
            shown, into one new PDF. Pages keep their exact original content —
            nothing is re-compressed, so there is no quality loss.
          </p>

          <h3>Splitting, extracting and removing pages</h3>
          <p>
            Both operations start from a page range you type, such as{" "}
            <strong>1-3, 5, 9-12</strong>:
          </p>
          <ul>
            <li>
              <strong>Split / Extract</strong> builds a new PDF containing only
              the pages you list — useful for pulling one section out of a long
              document.
            </li>
            <li>
              <strong>Remove pages</strong> keeps everything except the pages
              you list — useful for dropping blank scans or pages you
              don&apos;t want to share.
            </li>
          </ul>
          <p>
            The range is checked live against the real page count, so typos
            like a reversed range (&quot;9-3&quot;) or a page that doesn&apos;t
            exist are caught before anything is processed.
          </p>

          <h3>Reordering pages</h3>
          <p>
            Load a PDF and every page appears as a row you can move up, down,
            to the top or to the bottom using buttons — fully keyboard
            accessible, no dragging required. When the list shows the order you
            want, download the rebuilt file.
          </p>

          <h3>A processing-only tool, by design</h3>
          <p>
            You won&apos;t see page thumbnails here. Rendering PDF pages in the
            browser needs a much heavier engine; skipping it keeps this page
            quick to load and means the tool only ever reads your PDF&apos;s
            structure, not its visual content. Check page numbers in your usual
            PDF viewer first, then do the cutting here.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          This tool edits copies of your files locally in your browser and
          never uploads them. Always keep your original file until you have
          checked the downloaded result. Outputs are provided as-is with no
          guarantee they meet the requirements of any particular organisation
          or submission process.
        </>
      }
    >
      <PdfToolsIsland />
    </ToolLayout>
  );
}
